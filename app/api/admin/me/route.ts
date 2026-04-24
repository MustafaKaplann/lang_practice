import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const username = await requireAdmin(request);
    return NextResponse.json({ ok: true, username });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
