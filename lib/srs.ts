import type { SRSCard } from "./types";

export type SRSQuality = 0 | 3 | 4 | 5;

export function todayLocal(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE");
}

export function getDefaultCard(wordId: string): SRSCard {
  return {
    wordId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: todayLocal(),
    lapses: 0,
  };
}

export function reviewCard(card: SRSCard, quality: SRSQuality): SRSCard {
  const updated = { ...card };

  if (quality < 3) {
    updated.repetitions = 0;
    updated.interval = 1;
    updated.lapses += 1;
  } else {
    updated.repetitions += 1;
    if (updated.repetitions === 1) {
      updated.interval = 1;
    } else if (updated.repetitions === 2) {
      updated.interval = 6;
    } else {
      updated.interval = Math.round(card.interval * card.easeFactor);
    }
  }

  const newEF =
    card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  updated.easeFactor = Math.max(1.3, newEF);
  updated.dueDate = addDays(todayLocal(), updated.interval);
  updated.lastReviewedAt = new Date().toISOString();

  return updated;
}

export function getDueCards(
  srs: Record<string, SRSCard>,
  today: string,
): string[] {
  return Object.values(srs)
    .filter((c) => c.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((c) => c.wordId);
}

export function getNewCards(
  pool: Array<{ uid: string; sublist?: number }>,
  srs: Record<string, SRSCard>,
  limit: number,
): string[] {
  return pool
    .filter((w) => !srs[w.uid])
    .sort((a, b) => (a.sublist ?? 99) - (b.sublist ?? 99))
    .slice(0, limit)
    .map((w) => w.uid);
}

export function getTomorrowDueCount(
  srs: Record<string, SRSCard>,
  today: string,
): number {
  const tomorrow = addDays(today, 1);
  return Object.values(srs).filter((c) => c.dueDate === tomorrow).length;
}
