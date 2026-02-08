import { createAdminClient } from '@/lib/supabase/admin';
import { SignJWT, jwtVerify } from 'jose';

const WIDGET_TOKEN_SECRET = new TextEncoder().encode(
  process.env.WIDGET_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || 'duezo-widget-secret-key'
);

/**
 * Generate a widget authentication token for a user
 */
export async function generateWidgetToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // Token valid for 30 days
    .sign(WIDGET_TOKEN_SECRET);
  
  return token;
}

/**
 * Verify a widget token and return the user ID
 */
export async function verifyWidgetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, WIDGET_TOKEN_SECRET);
    return payload.userId as string;
  } catch (error) {
    console.error('[Widget Auth] Token verification failed:', error);
    return null;
  }
}

/**
 * Authenticate user with email/password and return widget token
 */
export async function authenticateForWidget(
  email: string,
  password: string
): Promise<{ token: string; userId: string; email: string } | null> {
  const supabase = createAdminClient();
  
  // Use Supabase auth to verify credentials
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    console.error('[Widget Auth] Authentication failed:', error);
    return null;
  }

  const token = await generateWidgetToken(data.user.id, data.user.email || email);

  return {
    token,
    userId: data.user.id,
    email: data.user.email || email,
  };
}
