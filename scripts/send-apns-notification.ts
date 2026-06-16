import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { apnsSender } from '../lib/apns/apns-sender';

config({ path: '.env.local' });

type ActiveTokenRow = {
  id: string;
  token: string;
  device_name: string | null;
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function main() {
  const [, , userId, ...messageParts] = process.argv;
  const message = messageParts.join(' ').trim();

  if (!userId || !message) {
    throw new Error('Usage: node --experimental-strip-types scripts/send-apns-notification.ts <user_id> <message>');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('apns_tokens')
    .select('id, token, device_name')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const tokenRow = data?.[0] as ActiveTokenRow | undefined;
  if (!tokenRow) {
    throw new Error(`No active APNs tokens found for user ${userId}`);
  }

  const result = await apnsSender.sendNotification({
    userId,
    token: tokenRow.token,
    tokenId: tokenRow.id,
    payload: {
      aps: {
        alert: {
          title: 'Duezo Test Notification',
          body: message,
        },
        sound: 'default',
      },
      deeplink: 'duezo://dashboard',
      url: '/dashboard',
      messageType: 'manual_test',
    },
  });

  console.log(JSON.stringify({
    userId,
    tokenId: tokenRow.id,
    deviceName: tokenRow.device_name,
    result,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
