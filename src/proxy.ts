import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Block crawlers on the leads. subdomain — canonical lives at edscanlan.co.nz
  if (request.nextUrl.pathname === '/robots.txt' && host.startsWith('leads.')) {
    return new NextResponse('User-agent: *\nDisallow: /', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/robots.txt',
};
