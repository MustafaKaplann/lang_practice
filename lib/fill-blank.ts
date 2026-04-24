import type { PoolWord } from "./types";
import { shuffle } from "./shuffle";

export const BLANK = "_____";

export function wordVariants(word: string): string[] {
  const w = word.toLowerCase();
  const set = new Set<string>([w, w + "s", w + "es", w + "ed", w + "ing", w + "ly", w + "d"]);
  if (w.endsWith("e") && w.length > 1) {
    const root = w.slice(0, -1);
    set.add(root + "ing");
    set.add(root + "ed");
  }
  if (w.endsWith("y") && w.length > 1) {
    const root = w.slice(0, -1);
    set.add(root + "ies");
    set.add(root + "ied");
  }
  return Array.from(set).sort((a, b) => b.length - a.length);
}

export interface MaskResult {
  masked: string;
  matched: string;
}

export function maskSentence(sentence: string, word: string): MaskResult | null {
  for (const v of wordVariants(word)) {
    const re = new RegExp(`\\b${escapeRegex(v)}\\b`, "i");
    const m = re.exec(sentence);
    if (m) {
      return {
        masked: sentence.slice(0, m.index) + BLANK + sentence.slice(m.index + m[0].length),
        matched: m[0],
      };
    }
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function pickDistractorWords(
  word: PoolWord,
  pool: readonly PoolWord[],
  n: number,
): PoolWord[] {
  const sameGroup = pool.filter(
    (w) => w.uid !== word.uid &&
      (w.sublist === word.sublist || w.category === word.category) &&
      w.word !== word.word,
  );
  const others = pool.filter(
    (w) => w.uid !== word.uid &&
      w.sublist !== word.sublist &&
      w.word !== word.word,
  );
  const picked: PoolWord[] = [];
  const used = new Set<string>([word.word]);
  for (const c of [...shuffle(sameGroup), ...shuffle(others)]) {
    if (used.has(c.word)) continue;
    used.add(c.word);
    picked.push(c);
    if (picked.length === n) break;
  }
  return picked;
}
