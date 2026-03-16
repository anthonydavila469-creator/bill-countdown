import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { User } from '@supabase/supabase-js';

interface AuthResult {
  user: User | null;
  method: 'cookie' | 'bearer' | null;
}

export async function getAuthenticatedUser(request?: Request): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return { user, method: 'cookie' };
    }
  } catch {
    // Fall through to bearer auth.
  }

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
        // Ignore and return null below.
      }
    }
  }

  return { user: null, method: null };
}
