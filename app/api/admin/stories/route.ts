import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getStories, addStory } from '@/lib/kv';
import type { Story } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const stories = await getStories();
  return NextResponse.json(stories);
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  let body: Partial<Omit<Story, 'id' | 'createdAt'>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON.' }, { status: 400 });
  }

  const { title, author, audioUrl, transcript, difficulty, estimatedMinutes, source } = body;
  if (!title?.trim() || !author?.trim() || !audioUrl?.trim() || !transcript?.trim() ||
      !difficulty || estimatedMinutes === undefined || !source?.trim()) {
    return NextResponse.json({ error: 'Tüm zorunlu alanlar gereklidir.' }, { status: 422 });
  }
  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    return NextResponse.json({ error: 'Geçersiz zorluk seviyesi.' }, { status: 422 });
  }
  if (transcript.trim().length < 500) {
    return NextResponse.json({ error: 'Transcript en az 500 karakter olmalıdır.' }, { status: 422 });
  }

  const created = await addStory({
    title: title.trim(),
    author: author.trim(),
    description: body.description?.trim() || undefined,
    audioUrl: audioUrl.trim(),
    transcript: transcript.trim(),
    difficulty,
    estimatedMinutes: Number(estimatedMinutes),
    source: source.trim(),
  });

  return NextResponse.json(created, { status: 201 });
}
