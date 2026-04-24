import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? '';
  const { valid } = token ? await verifySession(token) : { valid: false };

  if (pathname.startsWith('/admin/login')) {
    if (valid) return NextResponse.redirect(new URL('/admin', request.url));
    return NextResponse.next();
  }

  if (!valid) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
