import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

type AuthProject = 'web' | 'mobileDuezo';

interface AuthResult {
  user: User | null;
  method: 'cookie' | 'bearer' | null;
  project: AuthProject | null;
  token: string | null;
}

const mobileDuezoProject = {
  url: 'https://bnxxfolkrpevqzxmgkyx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueHhmb2xrcnBldnF6eG1na3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODEwNDYsImV4cCI6MjA5MzI1NzA0Nn0.AkEne_L84ZJYTMdMmMbXmU3T-hq5tsSEqWF4gxwrudQ',
};

export function createBearerSupabaseClient(auth: Pick<AuthResult, 'project' | 'token'>) {
  if (auth.project === 'mobileDuezo' && auth.token) {
    return createSupabaseClient(mobileDuezoProject.url, mobileDuezoProject.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      },
    });
  }

  return createAdminClient();
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
      return { user, method: 'cookie', project: 'web', token: null };
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
          return { user, method: 'bearer', project: 'web', token };
        }
      } catch {
        // Web bearer auth failed, try the native mobile auth project below.
      }

      try {
        const mobileSupabase = createSupabaseClient(mobileDuezoProject.url, mobileDuezoProject.anonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        const { data: { user } } = await mobileSupabase.auth.getUser(token);
        if (user) {
          return { user, method: 'bearer', project: 'mobileDuezo', token };
        }
      } catch {
        // Mobile bearer auth also failed.
      }
    }
  }

  return { user: null, method: null, project: null, token: null };
}
