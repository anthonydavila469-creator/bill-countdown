import { readFile } from 'node:fs/promises';
import http2 from 'node:http2';
import { SignJWT, importPKCS8 } from 'jose';

export type ApnsPayload = {
  aps: {
    alert: {
      title: string;
      body: string;
    };
    sound?: string;
    badge?: number;
  };
  billId: string;
  url?: string;
  deeplink?: string;
};

type ApnsTokenCache = {
  token: string;
  expiresAt: number;
};

type ApnsSendResult = {
  success: boolean;
  status?: number;
  reason?: string;
};

const APNS_ORIGIN = 'https://api.push.apple.com:443';
const JWT_REFRESH_BUFFER_SECONDS = 60;
const JWT_TTL_SECONDS = 50 * 60;

class ApnsSender {
  private signingKey: Awaited<ReturnType<typeof importPKCS8>> | null = null;
  private tokenCache: ApnsTokenCache | null = null;

  async refreshToken(force = false): Promise<string | null> {
    try {
      const now = Math.floor(Date.now() / 1000);

      if (!force && this.tokenCache && this.tokenCache.expiresAt > now + JWT_REFRESH_BUFFER_SECONDS) {
        return this.tokenCache.token;
      }

      const teamId = process.env.APNS_TEAM_ID;
      const keyId = process.env.APNS_KEY_ID;
      const keyPath = process.env.APNS_KEY_PATH;
      const keyBase64 = process.env.APNS_KEY_BASE64;

      if (!teamId || !keyId || (!keyPath && !keyBase64)) {
        console.error('[apns] Missing APNS_TEAM_ID, APNS_KEY_ID, or APNS_KEY_PATH/APNS_KEY_BASE64');
        return null;
      }

      if (!this.signingKey) {
        let privateKey: string;
        if (keyBase64) {
          privateKey = Buffer.from(keyBase64, 'base64').toString('utf8');
        } else {
          privateKey = await readFile(keyPath!, 'utf8');
        }
        this.signingKey = await importPKCS8(privateKey, 'ES256');
      }

      const token = await new SignJWT({})
        .setProtectedHeader({ alg: 'ES256', kid: keyId })
        .setIssuer(teamId)
        .setIssuedAt(now)
        .sign(this.signingKey);

      this.tokenCache = {
        token,
        expiresAt: now + JWT_TTL_SECONDS,
      };

      return token;
    } catch (error) {
      console.error('[apns] Failed to refresh JWT:', error);
      return null;
    }
  }

  async sendPush(deviceToken: string, payload: ApnsPayload): Promise<ApnsSendResult> {
    const attempt = async (forceRefresh: boolean): Promise<ApnsSendResult> => {
      const jwt = await this.refreshToken(forceRefresh);
      const bundleId = process.env.APNS_BUNDLE_ID;

      if (!jwt || !bundleId) {
        if (!bundleId) {
          console.error('[apns] Missing APNS_BUNDLE_ID');
        }

        return { success: false, reason: 'missing_configuration' };
      }

      return new Promise<ApnsSendResult>((resolve) => {
        const client = http2.connect(APNS_ORIGIN);

        client.on('error', (error) => {
          console.error('[apns] HTTP/2 client error:', error);
        });

        const request = client.request({
          ':method': 'POST',
          ':path': `/3/device/${deviceToken}`,
          authorization: `bearer ${jwt}`,
          'apns-topic': bundleId,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'content-type': 'application/json',
        });

        let responseBody = '';
        let status: number | undefined;

        request.setEncoding('utf8');

        request.on('response', (headers) => {
          const headerStatus = headers[':status'];
          status = typeof headerStatus === 'number' ? headerStatus : Number(headerStatus);
        });

        request.on('data', (chunk: string) => {
          responseBody += chunk;
        });

        request.on('error', (error) => {
          console.error(`[apns] Request error for token ${deviceToken.slice(0, 8)}...:`, error);
          client.close();
          resolve({ success: false, reason: 'request_error' });
        });

        request.on('end', () => {
          client.close();

          if (status === 200) {
            resolve({ success: true, status });
            return;
          }

          let reason = 'unknown_error';
          if (responseBody) {
            try {
              const parsed = JSON.parse(responseBody) as { reason?: string };
              reason = parsed.reason ?? reason;
            } catch (error) {
              console.error('[apns] Failed to parse APNs response:', error);
            }
          }

          console.error(
            `[apns] Push failed for token ${deviceToken.slice(0, 8)}...:`,
            { status, reason }
          );

          resolve({ success: false, status, reason });
        });

        request.end(JSON.stringify(payload));
      });
    };

    const firstAttempt = await attempt(false);

    if (
      !firstAttempt.success &&
      (firstAttempt.status === 403 ||
        firstAttempt.reason === 'ExpiredProviderToken' ||
        firstAttempt.reason === 'InvalidProviderToken')
    ) {
      console.error('[apns] Auth rejected, refreshing token and retrying once');
      return attempt(true);
    }

    return firstAttempt;
  }
}

export const apnsSender = new ApnsSender();
