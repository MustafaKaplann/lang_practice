import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateStory, deleteStory } from '@/lib/kv';
import type { Story } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdmin(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await params;

  let body: Partial<Omit<Story, 'id' | 'createdAt'>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON.' }, { status: 400 });
  }

  if (body.difficulty && !['beginner', 'intermediate', 'advanced'].includes(body.difficulty)) {
    return NextResponse.json({ error: 'Geçersiz zorluk seviyesi.' }, { status: 422 });
  }
  if (body.transcript && body.transcript.trim().length < 500) {
    return NextResponse.json({ error: 'Transcript en az 500 karakter olmalıdır.' }, { status: 422 });
  }

  const patch: Partial<Omit<Story, 'id' | 'createdAt'>> = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.author !== undefined) patch.author = body.author.trim();
  if (body.description !== undefined) patch.description = body.description?.trim() || undefined;
  if (body.audioUrl !== undefined) patch.audioUrl = body.audioUrl.trim();
  if (body.transcript !== undefined) patch.transcript = body.transcript.trim();
  if (body.difficulty !== undefined) patch.difficulty = body.difficulty;
  if (body.estimatedMinutes !== undefined) patch.estimatedMinutes = Number(body.estimatedMinutes);
  if (body.source !== undefined) patch.source = body.source.trim();

  const updated = await updateStory(id, patch);
  if (!updated) return NextResponse.json({ error: 'Hikaye bulunamadı.' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAdmin(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await params;
  const ok = await deleteStory(id);
  if (!ok) return NextResponse.json({ error: 'Hikaye bulunamadı.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
