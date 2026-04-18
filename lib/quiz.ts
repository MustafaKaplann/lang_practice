import type { Word } from "./types";
import { shuffle } from "./shuffle";

export type Direction = "en-tr" | "tr-en";
export type DirectionSetting = Direction | "mixed";

export interface Question {
  wordId: number;
  direction: Direction;
  prompt: string;
  correct: string;
  options: string[];
  correctIndex: number;
}

function answerOf(w: Word, dir: Direction): string {
  return dir === "en-tr" ? w.meaningTr : w.word;
}

function promptOf(w: Word, dir: Direction): string {
  return dir === "en-tr" ? w.word : w.meaningTr;
}

export function generateQuestion(
  word: Word,
  pool: readonly Word[],
  direction: Direction,
): Question {
  const correct = answerOf(word, direction);

  const sameSublist = pool.filter(
    (w) => w.id !== word.id && w.sublist === word.sublist && answerOf(w, direction) !== correct,
  );
  const others = pool.filter(
    (w) => w.id !== word.id && w.sublist !== word.sublist && answerOf(w, direction) !== correct,
  );

  const picked: Word[] = [];
  const usedAnswers = new Set<string>([correct]);
  for (const candidate of [...shuffle(sameSublist), ...shuffle(others)]) {
    const a = answerOf(candidate, direction);
    if (usedAnswers.has(a)) continue;
    usedAnswers.add(a);
    picked.push(candidate);
    if (picked.length === 3) break;
  }

  const options = shuffle([correct, ...picked.map((p) => answerOf(p, direction))]);
  return {
    wordId: word.id,
    direction,
    prompt: promptOf(word, direction),
    correct,
    options,
    correctIndex: options.indexOf(correct),
  };
}

export function resolveDirection(setting: DirectionSetting): Direction {
  if (setting === "mixed") return Math.random() < 0.5 ? "en-tr" : "tr-en";
  return setting;
}

export function buildQuiz(
  pool: readonly Word[],
  count: number,
  setting: DirectionSetting,
): Question[] {
  const selected = shuffle(pool).slice(0, count);
  return selected.map((w) => generateQuestion(w, pool, resolveDirection(setting)));
}
