import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { preprocessEmail } from '@/lib/bill-extraction/preprocessEmail';

/**
 * GET /api/extraction/debug/email/[id]
 * Debug endpoint to see raw email body content
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the email by subject match (since we might not have the exact ID)
    const { data: email, error } = await supabase
      .from('emails_raw')
      .select('*')
      .eq('user_id', user.id)
      .ilike('subject', `%${id}%`)
      .single();

    if (error || !email) {
      // Try exact ID match
      const { data: emailById, error: idError } = await supabase
        .from('emails_raw')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', id)
        .single();

      if (idError || !emailById) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }

      const { cleanedText } = preprocessEmail(
        emailById.body_plain || null,
        emailById.body_html || null
      );

      return NextResponse.json({
        id: emailById.id,
        subject: emailById.subject,
        from: emailById.from_address,
        date: emailById.date_received,
        body_plain_length: (emailById.body_plain || '').length,
        body_html_length: (emailById.body_html || '').length,
        body_cleaned_length: cleanedText.length,
        body_plain_preview: (emailById.body_plain || '').substring(0, 2000),
        body_html_preview: (emailById.body_html || '').substring(0, 3000),
        body_cleaned_preview: cleanedText.substring(0, 2000),
      });
    }

    const { cleanedText } = preprocessEmail(
      email.body_plain || null,
      email.body_html || null
    );

    return NextResponse.json({
      id: email.id,
      subject: email.subject,
      from: email.from_address,
      date: email.date_received,
      body_plain_length: (email.body_plain || '').length,
      body_html_length: (email.body_html || '').length,
      body_cleaned_length: cleanedText.length,
      body_plain_preview: (email.body_plain || '').substring(0, 2000),
      body_html_preview: (email.body_html || '').substring(0, 3000),
      body_cleaned_preview: cleanedText.substring(0, 2000),
    });
  } catch (error) {
    console.error('Debug email endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email data' },
      { status: 500 }
    );
  }
}
