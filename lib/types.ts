export interface Word {
  id: number;
  word: string;
  meaningEn: string;
  meaningTr: string;
  exampleEn?: string;
  exampleTr?: string;
  sublist?: number;
}

export interface WordStats {
  correct: number;
  wrong: number;
  lastSeen: string;
}

export interface SRSCard {
  wordId: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReviewedAt?: string;
  lapses: number;
}

export interface Progress {
  knownWords: number[];
  strugglingWords: number[];
  wordStats: Record<number, WordStats>;
  streak: { current: number; lastDate: string };
  totalXP: number;
  srs: Record<number, SRSCard>;
}

export const TOTAL_WORDS = 570;
