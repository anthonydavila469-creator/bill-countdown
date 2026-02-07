// Gmail OAuth and API client utilities

import { convert } from 'html-to-text';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
}

interface GmailPart {
  mimeType: string;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailPart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    mimeType?: string;
    headers: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
      size?: number;
    };
    parts?: GmailPart[];
  };
  internalDate: string;
}

/**
 * Decode Gmail's base64url encoding (differs from standard base64)
 */
function decodeBase64Url(data: string): string {
  // Gmail uses URL-safe base64: replace - with + and _ with /
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Recursively find all parts of a specific MIME type
 */
function findParts(payload: GmailPart | undefined, mimeType: string, acc: GmailPart[] = []): GmailPart[] {
  if (!payload) return acc;

  if (payload.mimeType === mimeType && payload.body?.data) {
    acc.push(payload);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      findParts(part, mimeType, acc);
    }
  }

  return acc;
}

/**
 * Extract both plain and HTML bodies from a Gmail message
 */
export function extractBodiesFromMessage(message: GmailMessage): { body_plain: string; body_html: string } {
  const payload = message.payload;

  // Find all text/plain and text/html parts recursively
  const plainParts = findParts(payload as GmailPart, 'text/plain');
  const htmlParts = findParts(payload as GmailPart, 'text/html');

  // Sort by size (largest first) and pick the best
  const bestPlain = plainParts.sort((a, b) => (b.body?.size ?? b.body?.data?.length ?? 0) - (a.body?.size ?? a.body?.data?.length ?? 0))[0];
  const bestHtml = htmlParts.sort((a, b) => (b.body?.size ?? b.body?.data?.length ?? 0) - (a.body?.size ?? a.body?.data?.length ?? 0))[0];

  let body_plain = '';
  let body_html = '';

  if (bestPlain?.body?.data) {
    try {
      body_plain = decodeBase64Url(bestPlain.body.data);
    } catch (e) {
      console.error('Failed to decode plain body:', e);
    }
  }

  if (bestHtml?.body?.data) {
    try {
      body_html = decodeBase64Url(bestHtml.body.data);
    } catch (e) {
      console.error('Failed to decode HTML body:', e);
    }
  }

  // If no parts found, check direct body
  if (!body_plain && !body_html && payload.body?.data) {
    try {
      const content = decodeBase64Url(payload.body.data);
      // Check if it's HTML or plain
      if (content.includes('<html') || content.includes('<body') || content.includes('<table') || content.includes('<div')) {
        body_html = content;
      } else {
        body_plain = content;
      }
    } catch (e) {
      console.error('Failed to decode direct body:', e);
    }
  }

  return { body_plain, body_html };
}

/**
 * Generate the OAuth authorization URL
 */
export function getGmailAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID!,
    redirect_uri: process.env.GMAIL_REDIRECT_URI!,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GmailTokens> {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      redirect_uri: process.env.GMAIL_REDIRECT_URI!,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const tokens = await tokenResponse.json();

  // Get user email
  const userInfoResponse = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    }
  );

  if (!userInfoResponse.ok) {
    throw new Error('Failed to get user info');
  }

  const userInfo = await userInfoResponse.json();

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    email: userInfo.email,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const tokens = await response.json();

  return {
    access_token: tokens.access_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
}

/**
 * Search queries for finding bill-related emails
 */
export const BILL_SEARCH_QUERIES = [
  // Subject-based queries
  'subject:(bill OR invoice OR statement OR "payment due" OR "amount due")',
  'subject:("your bill" OR "payment reminder" OR "due date" OR "balance due")',
  'subject:(autopay OR "auto pay" OR "automatic payment" OR "scheduled payment")',
  'subject:("account balance" OR "monthly statement" OR "your statement")',
  'subject:("new statement" OR "statement ready" OR "bill ready" OR "payment confirmation")',
  'subject:(receipt OR charged OR renewal OR subscription)',
  // Sender-based queries
  'from:(billing OR invoices OR payments OR statements OR accounts)',
  'from:(noreply OR no-reply OR alerts OR notifications OR service)',
  'from:(customerservice OR "customer service" OR support)',
  // Credit cards
  'from:(chase OR capitalone OR "capital one" OR amex OR citi OR discover)',
  'from:(barclays OR synchrony OR wellsfargo OR "bank of america")',
  'from:(bestbuy OR "best buy" OR bestbuycard)',
  'from:(citi.com OR citibank.com OR citicards.com OR alertsp.citi.com)',
  // Phone/Internet
  'from:(verizon OR att OR tmobile OR xfinity OR spectrum OR comcast)',
  'from:(cox OR frontier OR cricket OR boost OR visible)',
  // Streaming/Subscriptions
  'from:(netflix OR spotify OR hulu OR disney OR hbo OR apple OR amazon)',
  'from:(youtube OR paramount OR peacock OR audible OR adobe OR microsoft)',
  // Insurance
  'from:(geico OR progressive OR allstate OR "state farm" OR usaa OR liberty)',
  // Utilities
  'from:(electric OR power OR energy OR water OR gas OR utility OR municipal)',
  'from:(txu OR oncor OR pge OR sce OR duke OR entergy)',
  // Loans
  'from:(loan OR mortgage OR navient OR nelnet OR sofi OR sallie)',
];

/**
 * Fetch emails matching bill-related queries
 * @param accessToken - Gmail access token
 * @param maxResults - Maximum number of emails to fetch (default 100)
 * @param daysBack - Only fetch emails from the last N days (default 30)
 */
export async function fetchBillEmails(
  accessToken: string,
  maxResults: number = 100,
  daysBack: number = 30
): Promise<GmailMessage[]> {
  // Calculate the date filter (Gmail uses YYYY/MM/DD format)
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - daysBack);
  const afterDateStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, '0')}/${String(afterDate.getDate()).padStart(2, '0')}`;

  const baseQuery = BILL_SEARCH_QUERIES.join(' OR ');
  const query = `(${baseQuery}) after:${afterDateStr}`;
  console.log(`[Gmail] Query (truncated): ${query.substring(0, 200)}...`);
  const encodedQuery = encodeURIComponent(query);

  // First, get the list of message IDs
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=${maxResults}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!listResponse.ok) {
    throw new Error('Failed to fetch email list');
  }

  const listData = await listResponse.json();
  console.log(`[Gmail] Found ${listData.messages?.length ?? 0} message IDs`);

  if (!listData.messages || listData.messages.length === 0) {
    console.log(`[Gmail] No messages returned from Gmail API`);
    return [];
  }

  // Fetch full message details for each
  const messages: GmailMessage[] = await Promise.all(
    listData.messages.slice(0, maxResults).map(async (msg: { id: string }) => {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!msgResponse.ok) {
        return null;
      }

      return msgResponse.json();
    })
  );

  const validMessages = messages.filter(Boolean) as GmailMessage[];

  // Log all fetched emails for debugging
  console.log(`[GMAIL FETCH] Found ${validMessages.length} candidate emails`);
  validMessages.forEach(msg => {
    const from = getHeader(msg, 'From');
    const subject = getHeader(msg, 'Subject');
    console.log(`  - ${from}: ${subject}`);
  });

  return validMessages;
}

/**
 * Check if text looks like CSS/HTML garbage rather than readable content
 */
function isGarbageText(text: string): boolean {
  if (!text) return true;
  const sample = text.substring(0, 1000).toLowerCase();
  // Check for CSS patterns
  if (sample.includes('@font-face') || sample.includes('@media screen') ||
      sample.includes('font-family:') || sample.includes('font-style:')) {
    return true;
  }
  // Check for HTML patterns that shouldn't be in plain text
  if (sample.includes('<style') || sample.includes('<script') ||
      sample.includes('<!doctype')) {
    return true;
  }
  return false;
}

/**
 * Extract email body text from a Gmail message
 * Uses new extractBodiesFromMessage for proper MIME handling
 */
export function extractEmailBody(message: GmailMessage): string {
  const { body_plain, body_html } = extractBodiesFromMessage(message);

  // Convert HTML to text if available
  let htmlAsText = '';
  if (body_html && body_html.length > 0) {
    htmlAsText = convert(body_html, {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' },
        { selector: 'table', format: 'dataTable' },
      ],
    });
  }

  // Check if plain text is garbage (CSS, HTML, etc.)
  const plainIsGarbage = isGarbageText(body_plain || '');
  const plainLength = body_plain?.length || 0;
  const htmlLength = htmlAsText.length;

  // SIMPLE RULE: Use HTML-converted text if:
  // 1. Plain text is garbage (CSS, HTML code)
  // 2. HTML is significantly longer (more than 1.3x plain text length)
  // 3. Plain text is too short (less than 500 chars)
  if (htmlLength > 0) {
    if (plainIsGarbage) {
      return htmlAsText;
    }
    if (htmlLength > plainLength * 1.3) {
      return htmlAsText;
    }
    if (plainLength < 500) {
      return htmlAsText;
    }
  }

  // Use plain text if it's valid and substantial
  if (body_plain && plainLength > 0 && !plainIsGarbage) {
    return body_plain;
  }

  // Fallback to HTML text if available
  if (htmlLength > 0) {
    return htmlAsText;
  }

  // Final fallback to snippet
  return message.snippet || '';
}

/**
 * Extract raw HTML body from a Gmail message
 * Uses new extractBodiesFromMessage for proper MIME handling
 */
export function extractEmailHtml(message: GmailMessage): string | undefined {
  const { body_html } = extractBodiesFromMessage(message);
  return body_html || undefined;
}

/**
 * Extract header value from a Gmail message
 */
export function getHeader(message: GmailMessage, headerName: string): string {
  const header = message.payload.headers.find(
    (h) => h.name.toLowerCase() === headerName.toLowerCase()
  );
  return header?.value || '';
}
