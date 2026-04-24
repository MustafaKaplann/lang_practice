"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Check, X, ChevronLeft, RotateCcw, Settings, Lightbulb } from "lucide-react";
import type { PoolWord } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import { BLANK, maskSentence, pickDistractorWords } from "@/lib/fill-blank";
import { getProgress, recordAnswer } from "@/lib/progress";
import { getWordPool, getCustomCategories, type WordPoolCategory } from "@/lib/wordPool";
import ErrorState from "@/components/ui/ErrorState";
import SpeakButton from "@/components/ui/SpeakButton";
import CategoryFilter from "@/components/games/CategoryFilter";

type Screen = "setup" | "playing" | "result";
type Status = "loading" | "error" | "ready";
type Difficulty = "easy" | "hard";
type CountChoice = 10 | 20 | 50 | "all";

const SUBLISTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const COUNTS: CountChoice[] = [10, 20, 50, "all"];

interface FBQuestion {
  wordId: string;
  word: string;
  meaningTr: string;
  exampleTr: string;
  masked: string;
  options: string[];
  correctIndex: number;
}

interface Answered {
  q: FBQuestion;
  correct: boolean;
  hintUsed: boolean;
  typed?: string;
  pickedIndex?: number;
}

export default function FillBlankPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [allWords, setAllWords] = useState<PoolWord[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<WordPoolCategory>("awl");
  const [screen, setScreen] = useState<Screen>("setup");

  const [selectedSublists, setSelectedSublists] = useState<Set<number>>(new Set(SUBLISTS));
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [countChoice, setCountChoice] = useState<CountChoice>(10);
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [updateSrs, setUpdateSrs] = useState(true);

  const [questions, setQuestions] = useState<FBQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [submittedHard, setSubmittedHard] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([getWordPool(category), getCustomCategories()])
      .then(([words, cats]) => {
        if (cancelled) return;
        setAllWords(words);
        setCustomCategories(cats);
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [retryKey, category]);

  const isCustomPool = category !== "awl";

  const eligible = useMemo(
    () => allWords.filter((w) => w.exampleEn && w.exampleTr),
    [allWords],
  );

  const pool = useMemo(() => {
    const known = new Set(getProgress().knownWords);
    return eligible.filter((w) => {
      if (!isCustomPool && w.sublist !== undefined && !selectedSublists.has(w.sublist)) return false;
      if (onlyUnknown && known.has(w.uid)) return false;
      return true;
    });
  }, [eligible, selectedSublists, onlyUnknown, isCustomPool]);

  const startQuiz = useCallback(() => {
    const total = countChoice === "all" ? pool.length : Math.min(countChoice, pool.length);
    const selected = shuffle(pool).slice(0, total);
    const built: FBQuestion[] = [];
    for (const w of selected) {
      const masked = maskSentence(w.exampleEn!, w.word);
      if (!masked) {
        console.warn(`[fill-blank] Skipping "${w.word}" — no variant matched in sentence.`);
        continue;
      }
      let options: string[] = [];
      let correctIndex = 0;
      if (difficulty === "easy") {
        const distractors = pickDistractorWords(w, pool, 3);
        options = shuffle([w.word, ...distractors.map((d) => d.word)]);
        correctIndex = options.indexOf(w.word);
      }
      built.push({
        wordId: w.uid,
        word: w.word,
        meaningTr: w.meaningTr,
        exampleTr: w.exampleTr!,
        masked: masked.masked,
        options,
        correctIndex,
      });
    }
    setQuestions(built);
    setIndex(0);
    setAnswered([]);
    setPickedIndex(null);
    setTyped("");
    setSubmittedHard(false);
    setHintUsed(false);
    setScreen("playing");
  }, [pool, countChoice, difficulty]);

  const current = questions[index];

  const revealed = difficulty === "easy" ? pickedIndex !== null : submittedHard;

  const commitAnswer = useCallback(
    (correct: boolean, extras: Partial<Answered>) => {
      if (!current) return;
      const xp = correct ? (hintUsed ? 5 : 10) : 0;
      recordAnswer(current.wordId, correct, xp, updateSrs);
      setAnswered((a) => [...a, { q: current, correct, hintUsed, ...extras }]);
    },
    [current, hintUsed, updateSrs],
  );

  const pickEasy = useCallback(
    (i: number) => {
      if (!current || pickedIndex !== null) return;
      const correct = i === current.correctIndex;
      setPickedIndex(i);
      commitAnswer(correct, { pickedIndex: i });
    },
    [current, pickedIndex, commitAnswer],
  );

  const submitHard = useCallback(() => {
    if (!current || submittedHard) return;
    const correct = typed.trim().toLowerCase() === current.word.toLowerCase();
    setSubmittedHard(true);
    commitAnswer(correct, { typed });
  }, [current, submittedHard, typed, commitAnswer]);

  const next = useCallback(() => {
    if (!revealed) return;
    if (index + 1 >= questions.length) {
      setScreen("result");
    } else {
      setIndex((i) => i + 1);
      setPickedIndex(null);
      setTyped("");
      setSubmittedHard(false);
      setHintUsed(false);
    }
  }, [revealed, index, questions.length]);

  useEffect(() => {
    if (screen !== "playing") return;
    function onKey(e: KeyboardEvent) {
      if (difficulty === "easy") {
        if (e.key >= "1" && e.key <= "4") pickEasy(parseInt(e.key, 10) - 1);
        else if (e.key === "Enter" && revealed) next();
      } else {
        if (e.key === "Enter") {
          if (!submittedHard) submitHard();
          else next();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, difficulty, pickEasy, submitHard, next, revealed, submittedHard]);

  if (status === "loading") return <div className="text-slate-400">Yükleniyor…</div>;
  if (status === "error") return <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400">
          <ChevronLeft className="h-4 w-4" /> Ana sayfa
        </Link>
      </div>

      {screen === "setup" && (
        <Setup
          category={category}
          setCategory={setCategory}
          customCategories={customCategories}
          isCustomPool={isCustomPool}
          eligibleCount={eligible.length}
          selectedSublists={selectedSublists}
          setSelectedSublists={setSelectedSublists}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          countChoice={countChoice}
          setCountChoice={setCountChoice}
          onlyUnknown={onlyUnknown}
          setOnlyUnknown={setOnlyUnknown}
          updateSrs={updateSrs}
          setUpdateSrs={setUpdateSrs}
          pool={pool}
          onStart={startQuiz}
        />
      )}

      {screen === "playing" && current && (
        <Playing
          current={current}
          index={index}
          total={questions.length}
          answered={answered}
          difficulty={difficulty}
          pickedIndex={pickedIndex}
          typed={typed}
          setTyped={setTyped}
          submittedHard={submittedHard}
          revealed={revealed}
          hintUsed={hintUsed}
          onHint={() => setHintUsed(true)}
          onPickEasy={pickEasy}
          onSubmitHard={submitHard}
          onNext={next}
        />
      )}

      {screen === "result" && (
        <Result
          answered={answered}
          onRestart={startQuiz}
          onBackToSetup={() => setScreen("setup")}
        />
      )}
    </div>
  );
}

function Setup(props: {
  category: WordPoolCategory;
  setCategory: (c: WordPoolCategory) => void;
  customCategories: string[];
  isCustomPool: boolean;
  eligibleCount: number;
  selectedSublists: Set<number>;
  setSelectedSublists: (s: Set<number>) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  countChoice: CountChoice;
  setCountChoice: (c: CountChoice) => void;
  onlyUnknown: boolean;
  setOnlyUnknown: (b: boolean) => void;
  updateSrs: boolean;
  setUpdateSrs: (b: boolean) => void;
  pool: PoolWord[];
  onStart: () => void;
}) {
  const {
    category, setCategory, customCategories, isCustomPool,
    eligibleCount, selectedSublists, setSelectedSublists,
    difficulty, setDifficulty, countChoice, setCountChoice,
    onlyUnknown, setOnlyUnknown, updateSrs, setUpdateSrs, pool, onStart,
  } = props;

  const toggle = (n: number) => {
    const next = new Set(selectedSublists);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    if (next.size === 0) next.add(n);
    setSelectedSublists(next);
  };
  const toggleAll = () =>
    setSelectedSublists(
      selectedSublists.size === SUBLISTS.length ? new Set([1]) : new Set(SUBLISTS),
    );

  const canStart = pool.length >= 4;
  const easyDisabled = pool.length < 4;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Boşluk Doldurma</h1>

      <CategoryFilter value={category} onChange={setCategory} categories={customCategories} />

      <p className="text-sm text-slate-400">
        Bu modda örnek cümlesi olan{" "}
        <span className="text-slate-200 font-medium">{eligibleCount}</span> kelime mevcut.
      </p>

      {!isCustomPool && (
        <Field label="Sublist (çoklu seçim)">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={toggleAll} className={pillCls(selectedSublists.size === SUBLISTS.length)}>
              Tümü
            </button>
            {SUBLISTS.map((n) => (
              <button key={n} type="button" aria-pressed={selectedSublists.has(n)} onClick={() => toggle(n)} className={pillCls(selectedSublists.has(n))}>
                Sublist {n}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Zorluk">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={difficulty === "easy"}
            onClick={() => setDifficulty("easy")}
            disabled={easyDisabled}
            className={`${pillCls(difficulty === "easy")} ${easyDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Kolay (4 şık)
          </button>
          <button type="button" aria-pressed={difficulty === "hard"} onClick={() => setDifficulty("hard")} className={pillCls(difficulty === "hard")}>
            Zor (yazma)
          </button>
        </div>
        {difficulty === "hard" && (
          <p className="text-xs text-slate-500 mt-2">
            Zor modda kelimeyi köken haliyle yazmalısın (çekim kabul edilmez).
          </p>
        )}
      </Field>

      <Field label="Soru sayısı">
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((c) => (
            <button key={String(c)} type="button" aria-pressed={countChoice === c} onClick={() => setCountChoice(c)} className={pillCls(countChoice === c)}>
              {c === "all" ? "Tümü" : c}
            </button>
          ))}
        </div>
      </Field>

      <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
        <input type="checkbox" checked={onlyUnknown} onChange={(e) => setOnlyUnknown(e.target.checked)} className="accent-emerald-500" />
        Sadece bilmediklerim
      </label>
      <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
        <input type="checkbox" checked={updateSrs} onChange={(e) => setUpdateSrs(e.target.checked)} className="accent-emerald-500" />
        Akıllı tekrarı güncelle
      </label>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        Havuz: <span className="text-slate-200 font-medium">{pool.length}</span> kelime.
      </div>

      {!canStart && (
        <p className="text-red-400 text-sm">Bu filtrelerle yeterli kelime yok, en az 4 gerekli.</p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-6 py-3 font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Başla
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-300">{label}</div>
      {children}
    </div>
  );
}

function pillCls(active: boolean): string {
  return `px-3 py-1.5 rounded-full text-sm border transition-colors ${
    active
      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
      : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
  }`;
}

function Playing(props: {
  current: FBQuestion;
  index: number;
  total: number;
  answered: Answered[];
  difficulty: Difficulty;
  pickedIndex: number | null;
  typed: string;
  setTyped: (s: string) => void;
  submittedHard: boolean;
  revealed: boolean;
  hintUsed: boolean;
  onHint: () => void;
  onPickEasy: (i: number) => void;
  onSubmitHard: () => void;
  onNext: () => void;
}) {
  const {
    current, index, total, answered, difficulty, pickedIndex, typed, setTyped,
    submittedHard, revealed, hintUsed, onHint, onPickEasy, onSubmitHard, onNext,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (difficulty === "hard" && !submittedHard) inputRef.current?.focus();
  }, [difficulty, submittedHard, index]);

  const correctCount = answered.filter((a) => a.correct).length;
  const wrongCount = answered.length - correctCount;
  const pct = Math.round(((index + (revealed ? 1 : 0)) / total) * 100);

  const labels = ["A", "B", "C", "D"];
  const hardCorrect = submittedHard && typed.trim().toLowerCase() === current.word.toLowerCase();
  const parts = current.masked.split(BLANK);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Soru {index + 1} / {total}</span>
          <span>
            <span className="text-emerald-400">✓ {correctCount}</span>{" "}
            <span className="text-red-400 ml-2">✗ {wrongCount}</span>
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <div className="flex items-start gap-2">
              <p className="text-lg sm:text-xl leading-relaxed text-slate-100 flex-1">
                {parts[0]}
                <span className="inline-block mx-1 px-2 py-0.5 rounded border-b-2 border-emerald-400/60 text-emerald-300 font-mono">
                  {revealed && difficulty === "easy" && pickedIndex !== null
                    ? current.options[pickedIndex]
                    : revealed && difficulty === "hard"
                      ? current.word
                      : "_____"}
                </span>
                {parts[1]}
              </p>
              <SpeakButton text={parts.join(current.word)} size="sm" className="shrink-0 mt-1" />
            </div>

            <div className="mt-5">
              {!hintUsed ? (
                <button type="button" onClick={onHint} className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200">
                  <Lightbulb className="h-3.5 w-3.5" /> İpucu göster
                </button>
              ) : (
                <div className="text-sm text-slate-400 italic">💡 {current.exampleTr}</div>
              )}
            </div>
          </div>

          {difficulty === "easy" ? (
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const isPicked = pickedIndex === i;
                const isCorrect = i === current.correctIndex;
                let cls = "w-full text-left rounded-lg border px-4 py-3 flex items-center gap-3 transition-colors ";
                if (!revealed) {
                  cls += "bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800";
                } else if (isCorrect) {
                  cls += "bg-emerald-500/15 border-emerald-500/50 text-emerald-200";
                } else if (isPicked) {
                  cls += "bg-red-500/15 border-red-500/50 text-red-200";
                } else {
                  cls += "bg-slate-900 border-slate-800 text-slate-500 opacity-60";
                }
                return (
                  <button key={i} type="button" disabled={revealed} aria-pressed={isPicked} onClick={() => onPickEasy(i)} className={cls}>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-slate-300">
                      {labels[i]}
                    </span>
                    <span className="flex-1 font-heading">{opt}</span>
                    {revealed && isCorrect && <Check className="h-4 w-4 text-emerald-400" />}
                    {revealed && isPicked && !isCorrect && <X className="h-4 w-4 text-red-400" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={submittedHard}
                autoComplete="off"
                spellCheck={false}
                placeholder="Boşluğa gelecek kelimeyi yaz…"
                className={`w-full rounded-lg px-4 py-3 bg-slate-900 border text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                  !submittedHard ? "border-slate-800" : hardCorrect ? "border-emerald-500/60" : "border-red-500/60"
                }`}
              />
              {submittedHard && !hardCorrect && (
                <div className="text-sm">
                  <span className="text-slate-400">Doğru cevap: </span>
                  <span className="font-heading font-bold text-emerald-400">{current.word}</span>
                </div>
              )}
              {submittedHard && hardCorrect && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-400"
                >
                  <Check className="h-4 w-4" /> Doğru!
                </motion.div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {difficulty === "hard" && !submittedHard && (
              <button
                type="button"
                onClick={onSubmitHard}
                disabled={typed.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-5 py-2.5 font-medium hover:bg-emerald-400 disabled:opacity-40"
              >
                Cevapla
              </button>
            )}
            {revealed && (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-5 py-2.5 font-medium hover:bg-emerald-400"
              >
                {index + 1 >= total ? "Sonucu Gör" : "Sonraki"}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-xs text-slate-500">
        {difficulty === "easy" ? "1–4: şık seç · Enter: sonraki" : "Enter: cevapla / sonraki"}
      </p>
    </div>
  );
}

function Result({
  answered,
  onRestart,
  onBackToSetup,
}: {
  answered: Answered[];
  onRestart: () => void;
  onBackToSetup: () => void;
}) {
  const total = answered.length;
  const correct = answered.filter((a) => a.correct).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const xp = answered.reduce((sum, a) => sum + (a.correct ? (a.hintUsed ? 5 : 10) : 0), 0);
  const hintCount = answered.filter((a) => a.hintUsed).length;
  const wrongs = answered.filter((a) => !a.correct);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-4">
        <h2 className="font-heading text-2xl font-bold">Sonuç</h2>
        <div className="font-heading text-6xl font-bold text-emerald-400">{correct} / {total}</div>
        <p className="text-slate-400">
          %{pct} doğru · <span className="text-emerald-400">+{xp} XP</span>
          {hintCount > 0 && <> · <span className="text-amber-300">💡 {hintCount} ipucu</span></>}
        </p>
      </div>

      {wrongs.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-lg font-semibold text-slate-200">
            Yanlış yaptıkların ({wrongs.length})
          </h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {wrongs.map((a, i) => {
              const parts = a.q.masked.split(BLANK);
              return (
                <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-lg font-bold text-slate-100">{a.q.word}</span>
                    <span className="text-sm text-emerald-400">{a.q.meaningTr}</span>
                  </div>
                  <p className="text-sm italic text-slate-400">
                    &ldquo;{parts[0]}
                    <span className="text-emerald-300 font-bold not-italic">{a.q.word}</span>
                    {parts[1]}&rdquo;
                  </p>
                  <p className="text-sm italic text-slate-500">{a.q.exampleTr}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-5 py-2.5 font-medium hover:bg-emerald-400"
        >
          <RotateCcw className="h-4 w-4" /> Tekrar Başla
        </button>
        <button
          type="button"
          onClick={onBackToSetup}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-5 py-2.5 font-medium hover:border-slate-600"
        >
          <Settings className="h-4 w-4" /> Ayarları Değiştir
        </button>
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-5 py-2.5 font-medium hover:border-slate-600">
          Dashboard&apos;a Dön
        </Link>
      </div>
    </div>
  );
}
