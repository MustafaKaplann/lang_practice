import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

export async function GET(request: Request) {
  const url = new URL('/', request.url);
  const response = NextResponse.redirect(url);
  response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  return response;
}
