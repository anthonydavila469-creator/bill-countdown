import { connect as connectTls, TLSSocket } from 'node:tls';
import { convert } from 'html-to-text';
import {
  BILL_SEARCH_QUERIES,
  extractBodiesFromMessage,
  extractEmailBody,
  extractEmailHtml,
  fetchBillEmails,
  getHeader,
  GmailMessage,
  getGmailAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
} from '@/lib/gmail/client';

export type EmailProviderName = 'gmail' | 'yahoo' | 'outlook';

export interface ProviderTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
}

export interface ProviderEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
  body_html?: string;
}

export interface EmailProvider {
  readonly name: EmailProviderName;
  getAuthUrl(): string;
  exchangeCode(code: string): Promise<ProviderTokens>;
  refreshToken(refreshToken: string): Promise<Pick<ProviderTokens, 'access_token' | 'expires_at'>>;
  fetchEmails(accessToken: string, options?: { maxResults?: number; daysBack?: number; emailAddress?: string }): Promise<ProviderEmail[]>;
}

const BILL_KEYWORDS = [
  'bill',
  'billing',
  'invoice',
  'statement',
  'payment due',
  'amount due',
  'balance due',
  'autopay',
  'auto pay',
  'automatic payment',
  'scheduled payment',
  'receipt',
  'charged',
  'renewal',
  'subscription',
];

const OUTLOOK_SELECT =
  'id,subject,receivedDateTime,from,bodyPreview,body';

function encodeScopes(scopes: string[]): string {
  return scopes.join(' ');
}

function decodeJwtEmail(idToken?: string): string | null {
  if (!idToken) return null;

  try {
    const [, payload] = idToken.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf-8')) as {
      email?: string;
      preferred_username?: string;
      upn?: string;
    };

    return decoded.email || decoded.preferred_username || decoded.upn || null;
  } catch {
    return null;
  }
}

function buildOAuthUrl(baseUrl: string, params: Record<string, string>): string {
  return `${baseUrl}?${new URLSearchParams(params).toString()}`;
}

function buildAfterDate(daysBack: number): Date {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - daysBack);
  return afterDate;
}

function buildAfterIso(daysBack: number): string {
  return buildAfterDate(daysBack).toISOString();
}

function looksLikeBillEmail(parts: Array<string | null | undefined>): boolean {
  const haystack = parts.filter(Boolean).join(' ').toLowerCase();
  return BILL_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function extractOutlookBody(contentType?: string, content?: string): { body: string; body_html?: string } {
  if (!content) {
    return { body: '' };
  }

  if ((contentType || '').toLowerCase() === 'html') {
    return {
      body: convert(content, {
        wordwrap: false,
        preserveNewlines: true,
      }),
      body_html: content,
    };
  }

  return { body: content };
}

function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\r?\n/g, '')
    .replace(/=([A-F0-9]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseRawEmail(rawEmail: string): ProviderEmail {
  const [rawHeaders, ...bodyParts] = rawEmail.split(/\r?\n\r?\n/);
  const bodySection = bodyParts.join('\n\n');
  const lines = rawHeaders.split(/\r?\n/);
  const headers = new Map<string, string>();

  let currentHeader = '';
  for (const line of lines) {
    if (/^\s/.test(line) && currentHeader) {
      headers.set(currentHeader, `${headers.get(currentHeader) || ''} ${line.trim()}`.trim());
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    currentHeader = line.slice(0, separatorIndex).toLowerCase();
    headers.set(currentHeader, line.slice(separatorIndex + 1).trim());
  }

  const contentType = headers.get('content-type') || 'text/plain';
  const transferEncoding = (headers.get('content-transfer-encoding') || '').toLowerCase();

  let bodyPlain = '';
  let bodyHtml = '';

  if (contentType.includes('multipart/')) {
    const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i);
    const boundary = boundaryMatch?.[1];

    if (boundary) {
      const parts = bodySection.split(`--${boundary}`);

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed || trimmed === '--') continue;

        const [partHeadersRaw, ...partBodyRaw] = trimmed.split(/\r?\n\r?\n/);
        const partBodySection = partBodyRaw.join('\n\n');
        const partHeaders = partHeadersRaw.toLowerCase();
        const partEncodingMatch = partHeaders.match(/content-transfer-encoding:\s*([^\r\n]+)/i);
        const partEncoding = (partEncodingMatch?.[1] || '').trim().toLowerCase();

        let decodedPart = partBodySection;
        if (partEncoding === 'base64') {
          decodedPart = Buffer.from(partBodySection.replace(/\s+/g, ''), 'base64').toString('utf-8');
        } else if (partEncoding === 'quoted-printable') {
          decodedPart = decodeQuotedPrintable(partBodySection);
        }

        if (partHeaders.includes('content-type: text/plain') && decodedPart.length > bodyPlain.length) {
          bodyPlain = decodedPart;
        }

        if (partHeaders.includes('content-type: text/html') && decodedPart.length > bodyHtml.length) {
          bodyHtml = decodedPart;
        }
      }
    }
  } else {
    let decodedBody = bodySection;
    if (transferEncoding === 'base64') {
      decodedBody = Buffer.from(bodySection.replace(/\s+/g, ''), 'base64').toString('utf-8');
    } else if (transferEncoding === 'quoted-printable') {
      decodedBody = decodeQuotedPrintable(bodySection);
    }

    if (contentType.includes('text/html')) {
      bodyHtml = decodedBody;
    } else {
      bodyPlain = decodedBody;
    }
  }

  const body = bodyPlain || (bodyHtml
    ? convert(bodyHtml, {
        wordwrap: false,
        preserveNewlines: true,
      })
    : '');

  return {
    id: headers.get('message-id') || '',
    subject: headers.get('subject') || '',
    from: headers.get('from') || '',
    date: headers.get('date') || new Date().toISOString(),
    snippet: body.slice(0, 160).trim(),
    body,
    body_html: bodyHtml || undefined,
  };
}

class GmailProvider implements EmailProvider {
  readonly name = 'gmail' as const;

  getAuthUrl(): string {
    return getGmailAuthUrl();
  }

  exchangeCode(code: string): Promise<ProviderTokens> {
    return exchangeCodeForTokens(code);
  }

  refreshToken(refreshTokenValue: string): Promise<Pick<ProviderTokens, 'access_token' | 'expires_at'>> {
    return refreshAccessToken(refreshTokenValue);
  }

  async fetchEmails(accessToken: string, options: { maxResults?: number; daysBack?: number } = {}): Promise<ProviderEmail[]> {
    const messages = await fetchBillEmails(accessToken, options.maxResults ?? 100, options.daysBack ?? 30);

    return messages.map((message: GmailMessage) => ({
      id: message.id,
      subject: getHeader(message, 'Subject'),
      from: getHeader(message, 'From'),
      date: new Date(parseInt(message.internalDate, 10)).toISOString(),
      snippet: message.snippet,
      body: extractEmailBody(message),
      body_html: extractEmailHtml(message),
    }));
  }
}

class YahooImapClient {
  private socket: TLSSocket | null = null;
  private buffer = '';
  private tagCounter = 0;

  async connect(): Promise<void> {
    this.socket = await new Promise<TLSSocket>((resolve, reject) => {
      const socket = connectTls(993, 'imap.mail.yahoo.com', { servername: 'imap.mail.yahoo.com' }, () => resolve(socket));
      socket.setEncoding('utf8');
      socket.on('data', (chunk: string) => {
        this.buffer += chunk;
      });
      socket.once('error', reject);
    });

    await this.waitForPattern(/\* OK/i);
  }

  async authenticate(email: string, accessToken: string): Promise<void> {
    const xoauth = Buffer.from(`user=${email}\u0001auth=Bearer ${accessToken}\u0001\u0001`).toString('base64');
    await this.runCommand(`AUTHENTICATE XOAUTH2 ${xoauth}`);
  }

  async selectInbox(): Promise<void> {
    await this.runCommand('SELECT INBOX');
  }

  async searchSince(sinceDate: Date): Promise<string[]> {
    const imapDate = `${String(sinceDate.getUTCDate()).padStart(2, '0')}-${sinceDate.toLocaleString('en-US', {
      month: 'short',
      timeZone: 'UTC',
    })}-${sinceDate.getUTCFullYear()}`;
    const response = await this.runCommand(`UID SEARCH SINCE ${imapDate}`);
    const match = response.match(/\* SEARCH ?([0-9 ]*)/i);
    if (!match?.[1]) return [];
    return match[1].trim().split(/\s+/).filter(Boolean);
  }

  async fetchRawEmail(uid: string): Promise<string> {
    const response = await this.runCommand(`UID FETCH ${uid} (BODY.PEEK[]<0.65536>)`);
    const literalMatch = response.match(/\{(\d+)\}\r?\n([\s\S]*)\r?\n[A-Z0-9]+ (OK|NO|BAD)/i);
    if (!literalMatch?.[2]) {
      throw new Error(`Failed to parse Yahoo IMAP response for UID ${uid}`);
    }
    return literalMatch[2].replace(/\r?\n\)\s*$/m, '');
  }

  close(): void {
    try {
      if (this.socket) {
        this.socket.write('ZZZZ LOGOUT\r\n');
        this.socket.end();
      }
    } catch {
      // Ignore logout errors.
    }
  }

  private async runCommand(command: string): Promise<string> {
    if (!this.socket) {
      throw new Error('Yahoo IMAP socket is not connected');
    }

    this.tagCounter += 1;
    const tag = `A${String(this.tagCounter).padStart(4, '0')}`;
    const startIndex = this.buffer.length;
    this.socket.write(`${tag} ${command}\r\n`);
    await this.waitForPattern(new RegExp(`(?:^|\\r?\\n)${tag} (OK|NO|BAD)`, 'i'));
    const response = this.buffer.slice(startIndex);

    if (new RegExp(`(?:^|\\r?\\n)${tag} (NO|BAD)`, 'i').test(response)) {
      throw new Error(`Yahoo IMAP command failed: ${command}`);
    }

    return response;
  }

  private async waitForPattern(pattern: RegExp): Promise<void> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (pattern.test(this.buffer)) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error('Yahoo IMAP timed out waiting for server response');
  }
}

class YahooProvider implements EmailProvider {
  readonly name = 'yahoo' as const;
  private readonly scopes = ['openid', 'email', 'mail-r'];

  getAuthUrl(): string {
    return buildOAuthUrl('https://api.login.yahoo.com/oauth2/request_auth', {
      client_id: process.env.YAHOO_CLIENT_ID!,
      redirect_uri: process.env.YAHOO_REDIRECT_URI!,
      response_type: 'code',
      scope: encodeScopes(this.scopes),
      language: 'en-us',
    });
  }

  async exchangeCode(code: string): Promise<ProviderTokens> {
    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.YAHOO_CLIENT_ID!,
        client_secret: process.env.YAHOO_CLIENT_SECRET!,
        redirect_uri: process.env.YAHOO_REDIRECT_URI!,
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange Yahoo authorization code: ${await response.text()}`);
    }

    const tokens = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      id_token?: string;
    };

    const fallbackEmail = decodeJwtEmail(tokens.id_token);
    const userInfoResponse = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok && !fallbackEmail) {
      throw new Error('Failed to resolve Yahoo account email');
    }

    const userInfo = userInfoResponse.ok
      ? await userInfoResponse.json() as { email?: string }
      : null;

    const email = userInfo?.email || fallbackEmail;
    if (!email) {
      throw new Error('Yahoo account email was not returned by OAuth');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      email,
    };
  }

  async refreshToken(refreshTokenValue: string): Promise<Pick<ProviderTokens, 'access_token' | 'expires_at'>> {
    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.YAHOO_CLIENT_ID!,
        client_secret: process.env.YAHOO_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh Yahoo access token: ${await response.text()}`);
    }

    const tokens = await response.json() as {
      access_token: string;
      expires_in: number;
    };

    return {
      access_token: tokens.access_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    };
  }

  async fetchEmails(
    accessToken: string,
    options: { maxResults?: number; daysBack?: number; emailAddress?: string } = {}
  ): Promise<ProviderEmail[]> {
    if (!options.emailAddress) {
      throw new Error('Yahoo email fetch requires the connected email address');
    }

    const imapClient = new YahooImapClient();

    try {
      await imapClient.connect();
      await imapClient.authenticate(options.emailAddress, accessToken);
      await imapClient.selectInbox();

      const uids = await imapClient.searchSince(buildAfterDate(options.daysBack ?? 30));
      const selectedUids = uids.slice(-(options.maxResults ?? 100)).reverse();
      const emails: ProviderEmail[] = [];

      for (const uid of selectedUids) {
        const rawEmail = await imapClient.fetchRawEmail(uid);
        const parsed = parseRawEmail(rawEmail);

        if (looksLikeBillEmail([parsed.subject, parsed.from, parsed.snippet, parsed.body])) {
          emails.push({
            ...parsed,
            id: uid,
            date: new Date(parsed.date).toISOString(),
          });
        }
      }

      return emails;
    } finally {
      imapClient.close();
    }
  }
}

class OutlookProvider implements EmailProvider {
  readonly name = 'outlook' as const;
  private readonly scopes = ['openid', 'email', 'offline_access', 'User.Read', 'Mail.Read'];

  getAuthUrl(): string {
    return buildOAuthUrl('https://login.microsoftonline.com/common/oauth2/v2.0/authorize', {
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      response_type: 'code',
      response_mode: 'query',
      scope: encodeScopes(this.scopes),
      prompt: 'select_account',
    });
  }

  async exchangeCode(code: string): Promise<ProviderTokens> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange Microsoft authorization code: ${await response.text()}`);
    }

    const tokens = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      id_token?: string;
    };

    const meResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!meResponse.ok) {
      throw new Error('Failed to fetch Microsoft account email');
    }

    const me = await meResponse.json() as {
      mail?: string | null;
      userPrincipalName?: string | null;
    };

    const email = me.mail || me.userPrincipalName || decodeJwtEmail(tokens.id_token);
    if (!email) {
      throw new Error('Microsoft account email was not returned by OAuth');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      email,
    };
  }

  async refreshToken(refreshTokenValue: string): Promise<Pick<ProviderTokens, 'access_token' | 'expires_at'>> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh Microsoft access token: ${await response.text()}`);
    }

    const tokens = await response.json() as {
      access_token: string;
      expires_in: number;
    };

    return {
      access_token: tokens.access_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    };
  }

  async fetchEmails(accessToken: string, options: { maxResults?: number; daysBack?: number } = {}): Promise<ProviderEmail[]> {
    const maxResults = options.maxResults ?? 100;
    const receivedAfter = buildAfterIso(options.daysBack ?? 30);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$select=${OUTLOOK_SELECT}&$top=${maxResults}&$filter=receivedDateTime ge ${receivedAfter}&$orderby=receivedDateTime desc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'outlook.body-content-type="html"',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Outlook messages: ${await response.text()}`);
    }

    const data = await response.json() as {
      value?: Array<{
        id: string;
        subject?: string;
        receivedDateTime?: string;
        bodyPreview?: string;
        from?: { emailAddress?: { address?: string; name?: string } };
        body?: { contentType?: string; content?: string };
      }>;
    };

    return (data.value || [])
      .filter((message) =>
        looksLikeBillEmail([
          message.subject,
          message.from?.emailAddress?.address,
          message.bodyPreview,
          message.body?.content,
        ])
      )
      .map((message) => {
        const { body, body_html } = extractOutlookBody(message.body?.contentType, message.body?.content);
        return {
          id: message.id,
          subject: message.subject || '',
          from: message.from?.emailAddress?.address || '',
          date: message.receivedDateTime || new Date().toISOString(),
          snippet: message.bodyPreview || body.slice(0, 160),
          body,
          body_html,
        };
      });
  }
}

const providers: Record<EmailProviderName, EmailProvider> = {
  gmail: new GmailProvider(),
  yahoo: new YahooProvider(),
  outlook: new OutlookProvider(),
};

export function getProvider(providerName: EmailProviderName): EmailProvider {
  return providers[providerName];
}

export function getProviderLabel(providerName: EmailProviderName): string {
  switch (providerName) {
    case 'gmail':
      return 'Gmail';
    case 'yahoo':
      return 'Yahoo Mail';
    case 'outlook':
      return 'Microsoft Outlook';
  }
}

export function getProviderBrandColor(providerName: EmailProviderName): string {
  switch (providerName) {
    case 'gmail':
      return '#EA4335';
    case 'yahoo':
      return '#6001D2';
    case 'outlook':
      return '#0078D4';
  }
}

export function gmailMessageToProviderEmail(message: GmailMessage): ProviderEmail {
  const { body_html } = extractBodiesFromMessage(message);

  return {
    id: message.id,
    subject: getHeader(message, 'Subject'),
    from: getHeader(message, 'From'),
    date: new Date(parseInt(message.internalDate, 10)).toISOString(),
    snippet: message.snippet,
    body: extractEmailBody(message),
    body_html: body_html || undefined,
  };
}

export { BILL_SEARCH_QUERIES };
