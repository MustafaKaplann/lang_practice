"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Check, X, ChevronLeft, RotateCcw, Settings } from "lucide-react";
import type { PoolWord } from "@/lib/types";
import { buildQuiz, type DirectionSetting, type Question } from "@/lib/quiz";
import { getProgress, recordAnswer } from "@/lib/progress";
import { getWordPool, getCustomCategories, type WordPoolCategory } from "@/lib/wordPool";
import ErrorState from "@/components/ui/ErrorState";
import SpeakButton from "@/components/ui/SpeakButton";
import CategoryFilter from "@/components/games/CategoryFilter";

type Screen = "setup" | "playing" | "result";
type Status = "loading" | "error" | "ready";
type CountChoice = 10 | 20 | 50 | "all";

const SUBLISTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const COUNTS: CountChoice[] = [10, 20, 50, "all"];

interface Answered { question: Question; pickedIndex: number; correct: boolean }

export default function QuizPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [allWords, setAllWords] = useState<PoolWord[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [screen, setScreen] = useState<Screen>("setup");

  const [category, setCategory] = useState<WordPoolCategory>("awl");
  const [selectedSublists, setSelectedSublists] = useState<Set<number>>(new Set(SUBLISTS));
  const [direction, setDirection] = useState<DirectionSetting>("en-tr");
  const [countChoice, setCountChoice] = useState<CountChoice>(10);
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [updateSrs, setUpdateSrs] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState<Answered[]>([]);

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

  const pool = useMemo(() => {
    const known = new Set(getProgress().knownWords);
    return allWords.filter((w) => {
      if (!isCustomPool && w.sublist !== undefined && !selectedSublists.has(w.sublist)) return false;
      if (onlyUnknown && known.has(w.uid)) return false;
      return true;
    });
  }, [allWords, selectedSublists, onlyUnknown, isCustomPool]);

  const startQuiz = useCallback(() => {
    const total = countChoice === "all" ? pool.length : Math.min(countChoice, pool.length);
    setQuestions(buildQuiz(pool, total, direction));
    setIndex(0);
    setPickedIndex(null);
    setAnswered([]);
    setScreen("playing");
  }, [pool, countChoice, direction]);

  const current = questions[index];

  const pick = useCallback(
    (optIdx: number) => {
      if (!current || pickedIndex !== null) return;
      const correct = optIdx === current.correctIndex;
      setPickedIndex(optIdx);
      recordAnswer(current.wordId, correct, undefined, updateSrs);
      setAnswered((a) => [...a, { question: current, pickedIndex: optIdx, correct }]);
    },
    [current, pickedIndex, updateSrs],
  );

  const next = useCallback(() => {
    if (pickedIndex === null) return;
    if (index + 1 >= questions.length) setScreen("result");
    else { setIndex((i) => i + 1); setPickedIndex(null); }
  }, [pickedIndex, index, questions.length]);

  useEffect(() => {
    if (screen !== "playing") return;
    function onKey(e: KeyboardEvent) {
      if (e.key >= "1" && e.key <= "4") pick(parseInt(e.key, 10) - 1);
      else if (e.key === "Enter") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, pick, next]);

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
          isCustomPool={isCustomPool}
          category={category} onCategoryChange={setCategory}
          customCategories={customCategories}
          selectedSublists={selectedSublists} setSelectedSublists={setSelectedSublists}
          direction={direction} setDirection={setDirection}
          countChoice={countChoice} setCountChoice={setCountChoice}
          onlyUnknown={onlyUnknown} setOnlyUnknown={setOnlyUnknown}
          updateSrs={updateSrs} setUpdateSrs={setUpdateSrs}
          pool={pool} onStart={startQuiz}
        />
      )}

      {screen === "playing" && current && (
        <Playing current={current} index={index} total={questions.length}
          pickedIndex={pickedIndex} answered={answered} onPick={pick} onNext={next} />
      )}

      {screen === "result" && (
        <Result answered={answered} allWords={allWords}
          onRestart={startQuiz} onBackToSetup={() => setScreen("setup")} />
      )}
    </div>
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────

function Setup({
  isCustomPool, category, onCategoryChange, customCategories,
  selectedSublists, setSelectedSublists, direction, setDirection,
  countChoice, setCountChoice, onlyUnknown, setOnlyUnknown,
  updateSrs, setUpdateSrs, pool, onStart,
}: {
  isCustomPool: boolean;
  category: WordPoolCategory; onCategoryChange: (c: WordPoolCategory) => void;
  customCategories: string[];
  selectedSublists: Set<number>; setSelectedSublists: (s: Set<number>) => void;
  direction: DirectionSetting; setDirection: (d: DirectionSetting) => void;
  countChoice: CountChoice; setCountChoice: (c: CountChoice) => void;
  onlyUnknown: boolean; setOnlyUnknown: (b: boolean) => void;
  updateSrs: boolean; setUpdateSrs: (b: boolean) => void;
  pool: PoolWord[]; onStart: () => void;
}) {
  const toggle = (n: number) => {
    const next = new Set(selectedSublists);
    if (next.has(n)) next.delete(n); else next.add(n);
    if (next.size === 0) next.add(n);
    setSelectedSublists(next);
  };
  const canStart = pool.length >= 4;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Quiz Ayarları</h1>

      <Field label="Kelime Kaynağı">
        <CategoryFilter value={category} onChange={onCategoryChange} categories={customCategories} />
      </Field>

      {!isCustomPool && (
        <Field label="Sublist (çoklu seçim)">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelectedSublists(selectedSublists.size === SUBLISTS.length ? new Set([1]) : new Set(SUBLISTS))}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedSublists.size === SUBLISTS.length ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"}`}>
              Tümü
            </button>
            {SUBLISTS.map((n) => (
              <button key={n} type="button" aria-pressed={selectedSublists.has(n)} onClick={() => toggle(n)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedSublists.has(n) ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"}`}>
                Sublist {n}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Yön">
        <div className="flex flex-wrap gap-2">
          {([ ["en-tr", "EN → TR"], ["tr-en", "TR → EN"], ["mixed", "Karışık"] ] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={direction === v} onClick={() => setDirection(v)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${direction === v ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Soru sayısı">
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((c) => (
            <button key={String(c)} type="button" aria-pressed={countChoice === c} onClick={() => setCountChoice(c)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${countChoice === c ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"}`}>
              {c === "all" ? "Tümü" : c}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
          <input type="checkbox" checked={onlyUnknown} onChange={(e) => setOnlyUnknown(e.target.checked)} className="accent-emerald-500" />
          Sadece bilmediklerim
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
          <input type="checkbox" checked={updateSrs} onChange={(e) => setUpdateSrs(e.target.checked)} className="accent-emerald-500" />
          Akıllı tekrarı güncelle
        </label>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        Havuz: <span className="text-slate-200 font-medium">{pool.length}</span> kelime
        {pool.length < 4 && <span className="text-red-400 ml-2">— en az 4 gerekli</span>}
      </div>

      <button type="button" onClick={onStart} disabled={!canStart}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-6 py-3 font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed">
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

// ── Playing ───────────────────────────────────────────────────────────────────

function Playing({ current, index, total, pickedIndex, answered, onPick, onNext }: {
  current: Question; index: number; total: number; pickedIndex: number | null;
  answered: Answered[]; onPick: (i: number) => void; onNext: () => void;
}) {
  const correctCount = answered.filter((a) => a.correct).length;
  const wrongCount = answered.length - correctCount;
  const pct = Math.round(((index + (pickedIndex !== null ? 1 : 0)) / total) * 100);
  const labels = ["A", "B", "C", "D"];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-400">
          <span>Soru {index + 1} / {total}</span>
          <span><span className="text-emerald-400">✓ {correctCount}</span> <span className="text-red-400 ml-2">✗ {wrongCount}</span></span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">
              {current.direction === "en-tr" ? "Türkçesi?" : "İngilizcesi?"}
            </div>
            <div className={current.direction === "en-tr" ? "font-heading text-4xl sm:text-5xl font-bold text-slate-100" : "text-xl sm:text-2xl text-slate-100 leading-snug"}>
              {current.prompt}
            </div>
          </div>

          <div className="space-y-2">
            {current.options.map((opt, i) => {
              const isPicked = pickedIndex === i;
              const isCorrect = i === current.correctIndex;
              const reveal = pickedIndex !== null;
              let cls = "w-full text-left rounded-lg border px-4 py-3 flex items-center gap-3 transition-colors ";
              if (!reveal) cls += "bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-800";
              else if (isCorrect) cls += "bg-emerald-500/15 border-emerald-500/50 text-emerald-200";
              else if (isPicked) cls += "bg-red-500/15 border-red-500/50 text-red-200";
              else cls += "bg-slate-900 border-slate-800 text-slate-500 opacity-60";
              return (
                <button key={i} type="button" disabled={reveal} aria-pressed={isPicked} onClick={() => onPick(i)} className={cls}>
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-slate-300">{labels[i]}</span>
                  <span className="flex-1">{opt}</span>
                  {reveal && isCorrect && <Check className="h-4 w-4 text-emerald-400" />}
                  {reveal && isPicked && !isCorrect && <X className="h-4 w-4 text-red-400" />}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={onNext} disabled={pickedIndex === null}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-5 py-2.5 font-medium hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed">
              {index + 1 >= total ? "Sonucu Gör" : "Sonraki"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
      <p className="text-center text-xs text-slate-500">1–4: şık seç · Enter: sonraki</p>
    </div>
  );
}

// ── Result ────────────────────────────────────────────────────────────────────

function Result({ answered, allWords, onRestart, onBackToSetup }: {
  answered: Answered[]; allWords: PoolWord[]; onRestart: () => void; onBackToSetup: () => void;
}) {
  const correct = answered.filter((a) => a.correct).length;
  const total = answered.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const xp = correct * 10;

  const wordByUid = useMemo(() => {
    const m = new Map<string, PoolWord>();
    for (const w of allWords) m.set(w.uid, w);
    return m;
  }, [allWords]);

  const wrongs = answered.filter((a) => !a.correct);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-4">
        <h2 className="font-heading text-2xl font-bold">Sonuç</h2>
        <div className="font-heading text-6xl font-bold text-emerald-400">{correct} / {total}</div>
        <p className="text-slate-400">%{pct} doğru · <span className="text-emerald-400">+{xp} XP</span></p>
      </div>

      {wrongs.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-lg font-semibold text-slate-200">Yanlış yaptıkların ({wrongs.length})</h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {wrongs.map((a, i) => {
              const w = wordByUid.get(a.question.wordId);
              if (!w) return null;
              return (
                <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading text-lg font-bold text-slate-100">{w.word}</span>
                    <SpeakButton text={w.word} size="sm" />
                    <span className="text-sm text-emerald-400">{w.meaningTr}</span>
                  </div>
                  {w.exampleEn && <p className="text-sm italic text-slate-400">&ldquo;{w.exampleEn}&rdquo;</p>}
                  {w.exampleTr && <p className="text-sm italic text-slate-500">{w.exampleTr}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-5 py-2.5 font-medium hover:bg-emerald-400">
          <RotateCcw className="h-4 w-4" /> Tekrar Başla
        </button>
        <button type="button" onClick={onBackToSetup}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-5 py-2.5 font-medium hover:border-slate-600">
          <Settings className="h-4 w-4" /> Ayarları Değiştir
        </button>
        <Link href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-5 py-2.5 font-medium hover:border-slate-600">
          Dashboard&apos;a Dön
        </Link>
      </div>
    </div>
  );
}
