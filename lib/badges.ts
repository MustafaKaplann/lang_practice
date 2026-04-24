import type { Progress, Word } from "./types";

export interface SublistProgress {
  known: number;
  total: number;
  percent: number;
  completed: boolean;
}

export function getSublistProgress(
  sublistNum: number,
  progress: Progress,
  words: Word[],
): SublistProgress {
  const sublistWords = words.filter((w) => w.sublist === sublistNum);
  const knownSet = new Set(progress.knownWords);
  const known = sublistWords.filter((w) => knownSet.has(String(w.id))).length;
  const total = sublistWords.length;
  const percent = total > 0 ? Math.round((known / total) * 100) : 0;
  const completed = total > 0 && known === total;
  return { known, total, percent, completed };
}

export function getCelebratedSublists(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("awl-celebrated-sublists");
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function addCelebratedSublist(sublistNum: number): void {
  if (typeof window === "undefined") return;
  const list = getCelebratedSublists();
  if (!list.includes(sublistNum)) {
    list.push(sublistNum);
    localStorage.setItem("awl-celebrated-sublists", JSON.stringify(list));
  }
}
