import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'leadgen' } }
  );

  const { data: link } = await db
    .from('short_links')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (!link) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Append UTM params to destination
  const dest = new URL(link.destination_url);
  if (link.utm_source)   dest.searchParams.set('utm_source',   link.utm_source);
  if (link.utm_medium)   dest.searchParams.set('utm_medium',   link.utm_medium);
  if (link.utm_campaign) dest.searchParams.set('utm_campaign', link.utm_campaign);
  if (link.utm_content)  dest.searchParams.set('utm_content',  link.utm_content);
  if (link.utm_term)     dest.searchParams.set('utm_term',     link.utm_term);
  if (link.source)       dest.searchParams.set('source',       link.source);

  // Fire-and-forget click log
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  db.from('link_clicks').insert({
    link_id:    link.id,
    ip_address: ip,
    user_agent: req.headers.get('user-agent'),
    referer:    req.headers.get('referer'),
  }).then();

  return NextResponse.redirect(dest.toString(), { status: 302 });
}
