import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateCustomWord, deleteCustomWord, deleteCustomWords } from '@/lib/kv';
import type { CustomWord } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdmin(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { id } = await params;

  let body: Partial<Omit<CustomWord, 'id' | 'createdAt' | 'updatedAt'>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON.' }, { status: 400 });
  }

  const patch: Partial<Omit<CustomWord, 'id' | 'createdAt'>> = {};
  if (body.word !== undefined) patch.word = body.word.trim();
  if (body.meaningTr !== undefined) patch.meaningTr = body.meaningTr.trim();
  if (body.meaningEn !== undefined) patch.meaningEn = body.meaningEn?.trim() || undefined;
  if (body.exampleEn !== undefined) patch.exampleEn = body.exampleEn?.trim() || undefined;
  if (body.exampleTr !== undefined) patch.exampleTr = body.exampleTr?.trim() || undefined;
  if (body.category !== undefined) patch.category = body.category.trim();

  const updated = await updateCustomWord(id, patch);
  if (!updated) return NextResponse.json({ error: 'Kelime bulunamadı.' }, { status: 404 });
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

  // Bulk delete: id === "__bulk" + body { ids: string[] }
  if (id === '__bulk') {
    let body: { ids?: string[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Geçersiz JSON.' }, { status: 400 });
    }
    if (!Array.isArray(body.ids)) {
      return NextResponse.json({ error: 'ids dizisi gereklidir.' }, { status: 422 });
    }
    const deleted = await deleteCustomWords(body.ids);
    return NextResponse.json({ deleted });
  }

  const ok = await deleteCustomWord(id);
  if (!ok) return NextResponse.json({ error: 'Kelime bulunamadı.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
