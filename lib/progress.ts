import type { Progress } from "./types";

const STORAGE_KEY = "awl-progress";

export function getDefaultProgress(): Progress {
  return {
    knownWords: [],
    strugglingWords: [],
    wordStats: {},
    streak: { current: 0, lastDate: "" },
    totalXP: 0,
  };
}

export function getProgress(): Progress {
  if (typeof window === "undefined") return getDefaultProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return { ...getDefaultProgress(), ...parsed };
  } catch {
    return getDefaultProgress();
  }
}

export function saveProgress(progress: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage full or blocked — silently ignore
  }
}

export function markKnown(id: number): Progress {
  const p = getProgress();
  if (!p.knownWords.includes(id)) p.knownWords.push(id);
  saveProgress(p);
  return p;
}

export function markUnknown(id: number): Progress {
  const p = getProgress();
  p.knownWords = p.knownWords.filter((x) => x !== id);
  saveProgress(p);
  return p;
}

export function addXP(amount: number): Progress {
  const p = getProgress();
  p.totalXP += Math.max(0, amount);
  saveProgress(p);
  return p;
}

export function recordAnswer(
  id: number,
  correct: boolean,
  xpGain?: number,
): Progress {
  const p = getProgress();
  const stats = p.wordStats[id] ?? { correct: 0, wrong: 0, lastSeen: "" };
  if (correct) {
    stats.correct += 1;
    p.totalXP += xpGain ?? 10;
  } else {
    stats.wrong += 1;
    p.totalXP += xpGain ?? 0;
  }
  stats.lastSeen = new Date().toISOString();
  p.wordStats[id] = stats;
  saveProgress(p);
  return p;
}
