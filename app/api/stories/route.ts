import { NextResponse } from 'next/server';
import { getStories } from '@/lib/kv';

export async function GET() {
  const stories = await getStories();
  return NextResponse.json(stories, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}
