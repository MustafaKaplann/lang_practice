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

export interface Progress {
  knownWords: number[];
  strugglingWords: number[];
  wordStats: Record<number, WordStats>;
  streak: { current: number; lastDate: string };
  totalXP: number;
}

export const TOTAL_WORDS = 570;
