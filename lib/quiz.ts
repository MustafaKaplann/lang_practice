import type { PoolWord } from "./types";
import { shuffle } from "./shuffle";

export type Direction = "en-tr" | "tr-en";
export type DirectionSetting = Direction | "mixed";

export interface Question {
  wordId: string;       // was number
  direction: Direction;
  prompt: string;
  correct: string;
  options: string[];
  correctIndex: number;
}

function answerOf(w: PoolWord, dir: Direction): string {
  return dir === "en-tr" ? w.meaningTr : w.word;
}

function promptOf(w: PoolWord, dir: Direction): string {
  return dir === "en-tr" ? w.word : w.meaningTr;
}

export function generateQuestion(
  word: PoolWord,
  pool: readonly PoolWord[],
  direction: Direction,
): Question {
  const correct = answerOf(word, direction);

  const sameGroup = pool.filter(
    (w) => w.uid !== word.uid &&
      (w.sublist === word.sublist || w.category === word.category) &&
      answerOf(w, direction) !== correct,
  );
  const others = pool.filter(
    (w) => w.uid !== word.uid &&
      w.sublist !== word.sublist &&
      w.category !== word.category &&
      answerOf(w, direction) !== correct,
  );

  const picked: PoolWord[] = [];
  const usedAnswers = new Set<string>([correct]);
  for (const candidate of [...shuffle(sameGroup), ...shuffle(others)]) {
    const a = answerOf(candidate, direction);
    if (usedAnswers.has(a)) continue;
    usedAnswers.add(a);
    picked.push(candidate);
    if (picked.length === 3) break;
  }

  const options = shuffle([correct, ...picked.map((p) => answerOf(p, direction))]);
  return {
    wordId: word.uid,
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
  pool: readonly PoolWord[],
  count: number,
  setting: DirectionSetting,
): Question[] {
  const selected = shuffle(pool).slice(0, count);
  return selected.map((w) => generateQuestion(w, pool, resolveDirection(setting)));
}
