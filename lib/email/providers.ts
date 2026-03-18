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
  fetchEmails(
    accessToken: string,
    options?: {
      maxResults?: number;
      daysBack?: number;
      emailAddress?: string;
      authMethod?: 'oauth' | 'app_password';
    }
  ): Promise<ProviderEmail[]>;
}

export const YAHOO_IMAP_PENDING_MESSAGE =
  "Yahoo email scanning is being activated. Add bills manually for now — we'll notify you when auto-import is ready.";

export class YahooImapPendingError extends Error {
  readonly provider = 'yahoo' as const;

  constructor(message = YAHOO_IMAP_PENDING_MESSAGE) {
    super(message);
    this.name = 'YahooImapPendingError';
  }
}

const BILL_KEYWORDS = [
  'bill',
  'billing',
  'invoice',
  'statement',
  'payment due',
  'amount due',
  'balance due',
  'past due',
  'overdue',
  'autopay',
  'auto pay',
  'automatic payment',
  'scheduled payment',
  'payment processed',
  'monthly charge',
  'your plan',
  'upcoming payment',
  'account statement',
  'billing statement',
  'bill payment',
  'remind',
  'due soon',
  'action required',
  'receipt',
  'charged',
  'renewal',
  'subscription',
  'due date',
  'minimum payment',
  'your bill',
  'pay now',
  'at&t',
  'xfinity',
  'charter',
  'verizon',
  't-mobile',
  't mobile',
];

function extractSearchTerms(field: 'subject' | 'from'): string[] {
  const terms = new Set<string>();
  const pattern = new RegExp(`${field}:\(([^)]+)\)`, 'gi');

  for (const query of BILL_SEARCH_QUERIES) {
    for (const match of query.matchAll(pattern)) {
      const clause = match[1];
      const rawTerms = clause.match(/"[^"]+"|[A-Za-z0-9@._'-]+/g) || [];

      for (const rawTerm of rawTerms) {
        const term = rawTerm.replace(/^"|"$/g, '').trim();
        if (!term || term.toUpperCase() === 'OR') continue;
        terms.add(term);
      }
    }
  }

  return [...terms];
}

const BILL_SUBJECT_SEARCH_TERMS = extractSearchTerms('subject');
const BILL_FROM_SEARCH_TERMS = extractSearchTerms('from');

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

export class YahooImapClient {
  private socket: TLSSocket | null = null;
  private buffer = Buffer.alloc(0);
  private tagCounter = 0;

  async connect(): Promise<void> {
    this.socket = await new Promise<TLSSocket>((resolve, reject) => {
      const socket = connectTls(993, 'imap.mail.yahoo.com', { servername: 'imap.mail.yahoo.com' }, () => resolve(socket));
      socket.on('data', (chunk: Buffer) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
      });
      socket.once('error', reject);
    });

    await this.waitForPattern(/\* OK/i);
  }

  async authenticateWithOAuth(email: string, accessToken: string): Promise<void> {
    const xoauth = Buffer.from(`user=${email}\u0001auth=Bearer ${accessToken}\u0001\u0001`).toString('base64');
    await this.runCommand(`AUTHENTICATE XOAUTH2 ${xoauth}`, {
      allowContinuation: true,
    });
  }

  async authenticateWithPassword(email: string, appPassword: string): Promise<void> {
    await this.runCommand(`LOGIN ${this.quote(email)} ${this.quote(appPassword)}`);
  }

  async authenticate(email: string, accessToken: string): Promise<void> {
    await this.authenticateWithOAuth(email, accessToken);
  }

  async selectInbox(): Promise<void> {
    await this.runCommand('SELECT INBOX');
  }

  async searchSince(sinceDate: Date): Promise<string[]> {
    const imapDate = `${String(sinceDate.getUTCDate()).padStart(2, '0')}-${sinceDate.toLocaleString('en-US', {
      month: 'short',
      timeZone: 'UTC',
    })}-${sinceDate.getUTCFullYear()}`;
    return this.search(`SINCE ${imapDate}`);
  }

  async searchBillUids(sinceDate: Date): Promise<string[]> {
    const imapDate = `${String(sinceDate.getUTCDate()).padStart(2, '0')}-${sinceDate.toLocaleString('en-US', {
      month: 'short',
      timeZone: 'UTC',
    })}-${sinceDate.getUTCFullYear()}`;
    const uidSet = new Set<string>();

    for (const term of BILL_SUBJECT_SEARCH_TERMS) {
      const uids = await this.search(`SINCE ${imapDate} SUBJECT ${this.quote(term)}`);
      for (const uid of uids) {
        uidSet.add(uid);
      }
    }

    for (const term of BILL_FROM_SEARCH_TERMS) {
      const uids = await this.search(`SINCE ${imapDate} FROM ${this.quote(term)}`);
      for (const uid of uids) {
        uidSet.add(uid);
      }
    }

    return [...uidSet].sort((left, right) => Number(left) - Number(right));
  }

  async fetchRawEmail(uid: string): Promise<string> {
    const response = await this.runCommand(`UID FETCH ${uid} (BODY.PEEK[])`);
    const responseText = response.toString('utf8');
    const literalMatch = responseText.match(/BODY(?:\.PEEK)?\[\]\s+\{(\d+)\}\r?\n/i);

    if (!literalMatch || literalMatch.index === undefined) {
      throw new Error(`Failed to parse Yahoo IMAP response for UID ${uid}`);
    }

    const literalLength = Number.parseInt(literalMatch[1], 10);
    const literalStart = literalMatch.index + literalMatch[0].length;
    const literalPrefix = Buffer.byteLength(responseText.slice(0, literalStart), 'utf8');
    const literalEnd = literalPrefix + literalLength;

    if (response.length < literalEnd) {
      throw new Error(`Yahoo IMAP returned an incomplete message body for UID ${uid}`);
    }

    return response.subarray(literalPrefix, literalEnd).toString('utf8');
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

  private async search(criteria: string): Promise<string[]> {
    const response = await this.runCommand(`UID SEARCH ${criteria}`);
    const responseText = response.toString('utf8');
    const matches = [...responseText.matchAll(/\* SEARCH ?([0-9 ]*)/gi)];
    const values = matches.flatMap((match) => (match[1] || '').trim().split(/\s+/).filter(Boolean));
    return [...new Set(values)];
  }

  private quote(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  private async runCommand(command: string, options: { allowContinuation?: boolean } = {}): Promise<Buffer> {
    if (!this.socket) {
      throw new Error('Yahoo IMAP socket is not connected');
    }

    this.tagCounter += 1;
    const tag = `A${String(this.tagCounter).padStart(4, '0')}`;
    const startIndex = this.buffer.length;
    this.socket.write(`${tag} ${command}\r\n`);
    const response = await this.waitForTaggedResponse(tag, startIndex);
    const responseText = response.toString('utf8');

    if (!options.allowContinuation && /(?:^|\r?\n)\+ /i.test(responseText)) {
      throw new Error(`Yahoo IMAP command requires unsupported continuation: ${command}`);
    }

    if (new RegExp(`(?:^|\\r?\\n)${tag} (NO|BAD)`, 'i').test(responseText)) {
      throw new Error(`Yahoo IMAP command failed: ${command}`);
    }

    return response;
  }

  private async waitForPattern(pattern: RegExp): Promise<void> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (pattern.test(this.buffer.toString('utf8'))) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error('Yahoo IMAP timed out waiting for server response');
  }

  private async waitForTaggedResponse(tag: string, startIndex: number): Promise<Buffer> {
    const completionPattern = new RegExp(`(?:^|\\r?\\n)${tag} (OK|NO|BAD)(?: .*)?(?:\\r?\\n)?$`, 'i');

    for (let attempt = 0; attempt < 200; attempt += 1) {
      const response = this.buffer.subarray(startIndex);

      if (completionPattern.test(response.toString('utf8'))) {
        return response;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(`Yahoo IMAP timed out waiting for command completion: ${tag}`);
  }
}

class YahooProvider implements EmailProvider {
  readonly name = 'yahoo' as const;
  private readonly scopes = ['openid', 'email'];

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
    options: { maxResults?: number; daysBack?: number; emailAddress?: string; authMethod?: 'oauth' | 'app_password' } = {}
  ): Promise<ProviderEmail[]> {
    if (!options.emailAddress) {
      throw new Error('Yahoo email fetch requires the connected email address');
    }

    const imapClient = new YahooImapClient();

    try {
      await imapClient.connect();
      if (options.authMethod === 'app_password') {
        await imapClient.authenticateWithPassword(options.emailAddress, accessToken);
      } else {
        await imapClient.authenticateWithOAuth(options.emailAddress, accessToken);
      }
      await imapClient.selectInbox();

      const uids = await imapClient.searchBillUids(buildAfterDate(options.daysBack ?? 30));
      const selectedUids = uids.slice(-(options.maxResults ?? 100)).reverse();
      const emails: ProviderEmail[] = [];

      for (const uid of selectedUids) {
        const rawEmail = await imapClient.fetchRawEmail(uid);
        const parsed = parseRawEmail(rawEmail);
        const parsedDate = new Date(parsed.date);

        if (looksLikeBillEmail([parsed.subject, parsed.from, parsed.snippet, parsed.body])) {
          emails.push({
            ...parsed,
            id: uid,
            date: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
          });
        }
      }

      return emails;
    } catch (error) {
      if (error instanceof YahooImapPendingError) {
        throw error;
      }

      throw new YahooImapPendingError();
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
