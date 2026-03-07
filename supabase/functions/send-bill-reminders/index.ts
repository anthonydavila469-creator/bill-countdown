import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APNS_KEY_ID = 'KUR4MJD43B';
const TEAM_ID = 'M7VFSVX62F';
const BUNDLE_ID = 'app.duezo';
const APNS_HOST = 'api.push.apple.com'; // use api.sandbox.push.apple.com for testing

async function generateAPNsToken(privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'ES256', kid: APNS_KEY_ID };
  const payload = { iss: TEAM_ID, iat: now };

  const toBase64Url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')   // FIX: was ///g (invalid regex)
      .replace(/=/g, '');

  const headerB64 = toBase64Url(header);
  const payloadB64 = toBase64Url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Strip PEM headers — FIX: was /s+/g (missing backslash)
  const pemContent = privateKeyPem
    .replace(/-----BEGIN (?:EC )?PRIVATE KEY-----/g, '')
    .replace(/-----END (?:EC )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  const keyData = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const signatureB64 = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer)),
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signingInput}.${signatureB64}`;
}

async function sendAPNsNotification(
  deviceToken: string,
  title: string,
  body: string,
  jwtToken: string,
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  const url = `https://${APNS_HOST}/3/device/${deviceToken}`;

  const apnsPayload = {
    aps: {
      alert: { title, body },
      sound: 'default',
      badge: 1,
      'thread-id': 'bill-reminders',
      'interruption-level': 'time-sensitive',
    },
    notificationId,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwtToken}`,
        'apns-topic': BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 86400),
        'content-type': 'application/json',
      },
      body: JSON.stringify(apnsPayload),
    });

    if (response.status === 200) return { success: true };

    const errorBody = await response.json().catch(() => ({ reason: 'unknown' }));
    return { success: false, error: `${response.status}: ${errorBody.reason}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY');

  if (!apnsPrivateKey) {
    return new Response(
      JSON.stringify({ error: 'APNS_PRIVATE_KEY secret not set' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: notifications, error: fetchError } = await supabase
    .from('bill_notifications_queue')
    .select('*, bills:bill_id (name, amount, due_date)')
    .eq('status', 'pending')
    .eq('channel', 'push')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(100);

  if (fetchError) {
    console.error('Failed to fetch notifications:', fetchError);
    return new Response(
      JSON.stringify({ sent: 0, failed: 0, error: fetchError.message }),
      { status: 500, headers: { 'content-type': 'application/json' } }, // FIX: was missing status 500
    );
  }

  if (!notifications?.length) {
    return new Response(
      JSON.stringify({ sent: 0, failed: 0, message: 'No notifications due' }),
      { headers: { 'content-type': 'application/json' } },
    );
  }

  let jwtToken: string;
  try {
    jwtToken = await generateAPNsToken(apnsPrivateKey);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to generate APNs token', detail: String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  // FIX: Batch-fetch all device tokens upfront (eliminates N+1 query)
  const userIds = [...new Set(notifications.map((n) => n.user_id))];
  const { data: allTokens } = await supabase
    .from('apns_tokens')
    .select('user_id, token')
    .in('user_id', userIds)
    .eq('is_active', true);

  const tokensByUser = new Map<string, string[]>();
  for (const { user_id, token } of allTokens ?? []) {
    if (!tokensByUser.has(user_id)) tokensByUser.set(user_id, []);
    tokensByUser.get(user_id)!.push(token);
  }

  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const notification of notifications) {
    const tokens = tokensByUser.get(notification.user_id) ?? [];

    if (!tokens.length) {
      await supabase
        .from('bill_notifications_queue')
        .update({
          status: 'skipped', // FIX: was 'failed' — inconsistent with skipped counter
          error_message: 'No active device tokens',
          sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);
      results.skipped++;
      continue;
    }

    const bill = notification.bills;
    // FIX: Force UTC so server timezone doesn't skew days-until calculation
    const dueDate = new Date(bill.due_date + 'T00:00:00.000Z');
    const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
    const amount = parseFloat(bill.amount).toFixed(2);
    const dateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    const title =
      daysUntil <= 0
        ? `${bill.name} is due today!`
        : daysUntil === 1
        ? `${bill.name} is due tomorrow`
        : `${bill.name} due in ${daysUntil} days`;
    const body = `$${amount} due ${dateStr} — tap to review`;

    // FIX: Send to all devices in parallel instead of sequentially
    const sendResults = await Promise.all(
      tokens.map((token) =>
        sendAPNsNotification(token, title, body, jwtToken, notification.id),
      ),
    );

    let anySuccess = false;
    for (let i = 0; i < sendResults.length; i++) {
      const result = sendResults[i];
      if (result.success) {
        anySuccess = true;
      } else {
        if (
          result.error?.includes('BadDeviceToken') ||
          result.error?.includes('Unregistered') ||
          result.error?.includes('DeviceTokenNotForTopic')
        ) {
          await supabase
            .from('apns_tokens')
            .update({ is_active: false })
            .eq('token', tokens[i]);
        }
        console.error(`APNs failed for token ${tokens[i].slice(0, 8)}...: ${result.error}`);
      }
    }

    await supabase
      .from('bill_notifications_queue')
      .update({
        status: anySuccess ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        error_message: anySuccess ? null : 'All device tokens failed',
      })
      .eq('id', notification.id);

    if (anySuccess) results.sent++;
    else results.failed++;
  }

  console.log('Notification run complete:', results);
  return new Response(JSON.stringify(results), {
    headers: { 'content-type': 'application/json' },
  });
});
