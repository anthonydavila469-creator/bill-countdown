import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWidgetToken } from '@/lib/widget-auth';

/**
 * GET /api/widget/token
 * Generate a widget token for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await generateWidgetToken(user.id, user.email || '');

    return NextResponse.json({ 
      token,
      expiresIn: '30 days'
    });
  } catch (error) {
    console.error('[Widget Token API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
