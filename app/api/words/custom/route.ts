import { NextResponse } from 'next/server';
import { getCustomWords } from '@/lib/kv';

export async function GET() {
  const words = await getCustomWords();
  return NextResponse.json(words, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}
