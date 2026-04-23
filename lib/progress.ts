import type { Progress } from "./types";
import { showToast } from "./toast";
import { getDefaultCard, reviewCard, type SRSQuality } from "./srs";

const STORAGE_KEY = "awl-progress";
const MILESTONES = [100, 200, 300, 400, 500, 570];

export function getDefaultProgress(): Progress {
  return {
    knownWords: [],
    strugglingWords: [],
    wordStats: {},
    streak: { current: 0, lastDate: "" },
    totalXP: 0,
    srs: {},
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
    window.dispatchEvent(
      new CustomEvent("awl-progress-updated", { detail: progress }),
    );
  } catch {
    // storage full or blocked — silently ignore
  }
}

function todayStr(): string {
  // YYYY-MM-DD in local time
  return new Date().toLocaleDateString("sv");
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("sv");
}

function updateStreak(p: Progress): void {
  const today = todayStr();
  const last = p.streak.lastDate;

  if (!last) {
    p.streak.current = 1;
    p.streak.lastDate = today;
    showToast({ type: "info", message: `🔥 ${p.streak.current} günlük seri!` });
    return;
  }
  if (last === today) return;

  if (last === yesterdayStr()) {
    p.streak.current += 1;
  } else {
    p.streak.current = 1;
  }
  p.streak.lastDate = today;
  showToast({ type: "info", message: `🔥 ${p.streak.current} günlük seri!` });
}

export function markKnown(id: number): Progress {
  const p = getProgress();
  const before = p.knownWords.length;
  if (!p.knownWords.includes(id)) p.knownWords.push(id);
  const after = p.knownWords.length;
  if (after !== before) {
    const milestone = MILESTONES.find((m) => before < m && after >= m);
    if (milestone) {
      showToast({
        type: "achievement",
        message: `${milestone} kelimeye ulaştın! 🎓`,
        duration: 5000,
      });
    }
  }
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
  updateSrs = true,
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

  if (updateSrs) {
    const quality: SRSQuality = correct ? 4 : 0;
    const card = p.srs[id] ?? getDefaultCard(id);
    p.srs[id] = reviewCard(card, quality);
  }

  updateStreak(p);
  saveProgress(p);
  return p;
}
