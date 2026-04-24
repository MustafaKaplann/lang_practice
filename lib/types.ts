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
  wordId: string;       // was number — now string ("1".."570" or "custom-uuid")
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReviewedAt?: string;
  lapses: number;
}

export interface Progress {
  knownWords: string[];                   // was number[]
  strugglingWords: string[];              // was number[]
  wordStats: Record<string, WordStats>;   // was Record<number, ...>
  streak: { current: number; lastDate: string };
  totalXP: number;
  srs: Record<string, SRSCard>;          // was Record<number, ...>
}

export const TOTAL_WORDS = 570;

export interface CustomWord {
  id: string;           // crypto.randomUUID() — stored with "custom-" prefix in pool
  word: string;
  meaningEn?: string;
  meaningTr: string;
  exampleEn?: string;
  exampleTr?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  title: string;
  author: string;
  description?: string;
  audioUrl: string;
  transcript: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  source: string;
  createdAt: string;
}

/** Unified word type used by all games — works for both AWL and custom words */
export interface PoolWord {
  uid: string;          // String(word.id) for AWL; custom.id for custom words
  word: string;
  meaningEn?: string;
  meaningTr: string;
  exampleEn?: string;
  exampleTr?: string;
  sublist?: number;     // AWL only
  category?: string;    // custom only
  isCustom: boolean;
}
