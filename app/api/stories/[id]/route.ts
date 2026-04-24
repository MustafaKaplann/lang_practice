import { NextResponse } from 'next/server';
import { getStories } from '@/lib/kv';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const stories = await getStories();
  const story = stories.find((s) => s.id === id);
  if (!story) return NextResponse.json({ error: 'Hikaye bulunamadı.' }, { status: 404 });
  return NextResponse.json(story, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}
