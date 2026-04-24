import type { SRSCard } from "./types";
import { getProgress, saveProgress } from "./progress";
import { getDefaultCard, addDays, todayLocal } from "./srs";

function seedSrsData(count: number): void {
  const p = getProgress();
  const today = todayLocal();
  for (let i = 1; i <= Math.min(count, 570); i++) {
    const daysOffset = Math.floor(Math.random() * 14) - 3;
    const card: SRSCard = {
      ...getDefaultCard(String(i)),
      easeFactor: 1.3 + Math.random() * 1.7,
      interval: Math.max(1, Math.floor(Math.random() * 20)),
      repetitions: Math.floor(Math.random() * 5),
      dueDate: addDays(today, daysOffset),
      lapses: Math.floor(Math.random() * 3),
    };
    p.srs[String(i)] = card;
  }
  saveProgress(p);
  console.log(`[SRS Dev] Seeded ${count} cards`);
}

function resetSrs(): void {
  const p = getProgress();
  p.srs = {};
  saveProgress(p);
  if (typeof window !== "undefined") {
    localStorage.removeItem("srs-migrated");
  }
  console.log("[SRS Dev] SRS data reset");
}

function dumpSrs(): Record<string, SRSCard> {
  return getProgress().srs;
}

export function exposeToWindow(): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>).__srs = {
    seed: seedSrsData,
    reset: resetSrs,
    dump: dumpSrs,
  };
  console.log("[SRS Dev] window.__srs available: seed(n), reset(), dump()");
}
