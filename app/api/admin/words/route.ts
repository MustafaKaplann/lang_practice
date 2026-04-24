import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getCustomWords, addCustomWord } from '@/lib/kv';
import type { CustomWord } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  const words = await getCustomWords();
  return NextResponse.json(words);
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  let body: Partial<Omit<CustomWord, 'id' | 'createdAt' | 'updatedAt'>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON.' }, { status: 400 });
  }

  const { word, meaningTr, category } = body;
  if (!word?.trim() || !meaningTr?.trim() || !category?.trim()) {
    return NextResponse.json(
      { error: 'word, meaningTr ve category zorunludur.' },
      { status: 422 },
    );
  }

  const created = await addCustomWord({
    word: word.trim(),
    meaningTr: meaningTr.trim(),
    meaningEn: body.meaningEn?.trim() || undefined,
    exampleEn: body.exampleEn?.trim() || undefined,
    exampleTr: body.exampleTr?.trim() || undefined,
    category: category.trim(),
  });

  return NextResponse.json(created, { status: 201 });
}
