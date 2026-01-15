// Gmail OAuth and API client utilities

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

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body?: {
        data?: string;
      };
    }>;
  };
  internalDate: string;
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
  'subject:(bill OR invoice OR statement OR payment due OR amount due)',
  'from:(billing OR invoices OR payments OR noreply)',
  'subject:(your bill is ready OR payment reminder OR due date)',
];

/**
 * Fetch emails matching bill-related queries
 */
export async function fetchBillEmails(
  accessToken: string,
  maxResults: number = 20
): Promise<GmailMessage[]> {
  const query = BILL_SEARCH_QUERIES.join(' OR ');
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

  if (!listData.messages || listData.messages.length === 0) {
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

  return messages.filter(Boolean) as GmailMessage[];
}

/**
 * Extract email body text from a Gmail message
 */
export function extractEmailBody(message: GmailMessage): string {
  // Try to get body from parts first (multipart email)
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    // Try HTML if no plain text
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        // Basic HTML to text conversion
        return html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
  }

  // Direct body (simple email)
  if (message.payload.body?.data) {
    return Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  // Fallback to snippet
  return message.snippet || '';
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
