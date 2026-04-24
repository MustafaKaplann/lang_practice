import type { Word, CustomWord, PoolWord } from "./types";

export type WordPoolCategory =
  | "awl"       // only AWL 570 words
  | "custom"    // all custom words
  | "all"       // AWL + all custom
  | string;     // "custom:CategoryName" — specific category

export function awlToPool(w: Word): PoolWord {
  return {
    uid: String(w.id),
    word: w.word,
    meaningEn: w.meaningEn,
    meaningTr: w.meaningTr,
    exampleEn: w.exampleEn,
    exampleTr: w.exampleTr,
    sublist: w.sublist,
    isCustom: false,
  };
}

export function customToPool(w: CustomWord): PoolWord {
  return {
    uid: w.id,
    word: w.word,
    meaningEn: w.meaningEn,
    meaningTr: w.meaningTr,
    exampleEn: w.exampleEn,
    exampleTr: w.exampleTr,
    category: w.category,
    isCustom: true,
  };
}

let _awlCache: PoolWord[] | null = null;
let _customCache: PoolWord[] | null = null;
let _customCategories: string[] | null = null;

export function clearWordPoolCache(): void {
  _awlCache = null;
  _customCache = null;
  _customCategories = null;
}

async function fetchAwl(): Promise<PoolWord[]> {
  if (_awlCache) return _awlCache;
  const res = await fetch("/data/words.json");
  if (!res.ok) throw new Error("AWL kelime listesi yüklenemedi.");
  const words: Word[] = await res.json();
  _awlCache = words.map(awlToPool);
  return _awlCache;
}

async function fetchCustom(): Promise<PoolWord[]> {
  if (_customCache) return _customCache;
  try {
    const res = await fetch("/api/words/custom");
    if (!res.ok) return [];
    const words: CustomWord[] = await res.json();
    _customCache = words.map(customToPool);
    _customCategories = Array.from(new Set(words.map((w) => w.category))).sort();
    return _customCache;
  } catch {
    return [];
  }
}

export async function getWordPool(category: WordPoolCategory): Promise<PoolWord[]> {
  if (category === "awl") {
    return fetchAwl();
  }
  if (category === "custom") {
    return fetchCustom();
  }
  if (category === "all") {
    const [awl, custom] = await Promise.all([fetchAwl(), fetchCustom()]);
    return [...awl, ...custom];
  }
  if (category.startsWith("custom:")) {
    const cat = category.slice("custom:".length);
    const all = await fetchCustom();
    return all.filter((w) => w.category === cat);
  }
  return fetchAwl();
}

export async function getCustomCategories(): Promise<string[]> {
  await fetchCustom(); // populates _customCategories
  return _customCategories ?? [];
}
