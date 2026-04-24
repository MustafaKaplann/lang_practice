import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { signSession, SESSION_COOKIE } from '@/lib/auth';

// In-memory rate limiter: IP → { count, blockedUntil }
const attempts = new Map<string, { count: number; blockedUntil: number }>();

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (entry.blockedUntil > Date.now()) return true;
  // Block expired — reset
  attempts.delete(ip);
  return false;
}

function recordFailure(ip: string): void {
  const entry = attempts.get(ip) ?? { count: 0, blockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  }
  attempts.set(ip, entry);
}

function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

function timingSafeCompare(a: string, b: string): boolean {
  // Lengths must match for timingSafeEqual; pad to equal length first
  const bufA = Buffer.from(a.padEnd(Math.max(a.length, b.length), '\0'));
  const bufB = Buffer.from(b.padEnd(Math.max(a.length, b.length), '\0'));
  // Short-circuit only AFTER equal-length buffers are created
  const lengthsMatch = a.length === b.length;
  return crypto.timingSafeEqual(bufA, bufB) && lengthsMatch;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.' },
      { status: 429 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
  }

  const { username = '', password = '' } = body;
  const expectedUser = process.env.ADMIN_USERNAME ?? '';
  const expectedPass = process.env.ADMIN_PASSWORD ?? '';

  const userOk = timingSafeCompare(username, expectedUser);
  const passOk = timingSafeCompare(password, expectedPass);

  if (!userOk || !passOk) {
    recordFailure(ip);
    return NextResponse.json({ error: 'Giriş başarısız.' }, { status: 401 });
  }

  clearAttempts(ip);
  const token = await signSession(username);
  const isProd = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 3600,
    path: '/',
  });
  return response;
}
