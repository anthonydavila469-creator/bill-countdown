import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { User } from '@supabase/supabase-js';

interface AuthResult {
  user: User | null;
  method: 'cookie' | 'bearer' | null;
}

/**
 * Get authenticated user from either cookies or Authorization header.
 * Capacitor webviews don't always send cookies properly, so we fall back
 * to the Bearer token from the client-side Supabase session.
 */
export async function getAuthenticatedUser(request?: Request): Promise<AuthResult> {
  // 1. Try cookie-based auth first (works for web browsers)
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return { user, method: 'cookie' };
    }
  } catch {
    // Cookie auth failed, try bearer
  }

  // 2. Fall back to Authorization Bearer header (Capacitor / in-app browser)
  if (request) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const admin = createAdminClient();
        const { data: { user } } = await admin.auth.getUser(token);
        if (user) {
          return { user, method: 'bearer' };
        }
      } catch {
        // Bearer auth also failed
      }
    }
  }

  return { user: null, method: null };
}
