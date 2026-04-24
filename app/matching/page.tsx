"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, ChevronLeft, RotateCcw, Settings, Sparkles } from "lucide-react";
import type { PoolWord } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import { getProgress, recordAnswer, addXP } from "@/lib/progress";
import { getWordPool, getCustomCategories, type WordPoolCategory } from "@/lib/wordPool";
import ErrorState from "@/components/ui/ErrorState";
import CategoryFilter from "@/components/games/CategoryFilter";

type Screen = "setup" | "playing" | "result";
type Status = "loading" | "error" | "ready";
type PairCount = 6 | 8 | 10;

const SUBLISTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PAIR_CHOICES: PairCount[] = [6, 8, 10];

interface WrongFlash {
  leftId: string;
  rightId: string;
  nonce: number;
}

export default function MatchingPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [allWords, setAllWords] = useState<PoolWord[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<WordPoolCategory>("awl");
  const [screen, setScreen] = useState<Screen>("setup");

  const [selectedSublists, setSelectedSublists] = useState<Set<number>>(new Set(SUBLISTS));
  const [pairCount, setPairCount] = useState<PairCount>(6);
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [updateSrs, setUpdateSrs] = useState(true);

  const [pairs, setPairs] = useState<PoolWord[]>([]);
  const [leftOrder, setLeftOrder] = useState<PoolWord[]>([]);
  const [rightOrder, setRightOrder] = useState<PoolWord[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [wrongFlash, setWrongFlash] = useState<WrongFlash | null>(null);
  const [errors, setErrors] = useState(0);

  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState(0);

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
    const filtered = allWords.filter((w) => {
      if (!isCustomPool && w.sublist !== undefined && !selectedSublists.has(w.sublist)) return false;
      if (!w.meaningTr) return false;
      if (onlyUnknown && known.has(w.uid)) return false;
      return true;
    });
    // Dedupe by meaningTr to avoid visual ambiguity in the grid
    const byMeaning = new Map<string, PoolWord>();
    for (const w of filtered) {
      if (!byMeaning.has(w.meaningTr)) byMeaning.set(w.meaningTr, w);
    }
    return Array.from(byMeaning.values());
  }, [allWords, selectedSublists, onlyUnknown, isCustomPool]);

  const start = useCallback(() => {
    const picked = shuffle(pool).slice(0, pairCount);
    setPairs(picked);
    let left = shuffle(picked);
    let right = shuffle(picked);
    if (picked.length > 1 && left.every((w, i) => w.uid === right[i].uid)) {
      right = [...right.slice(1), right[0]];
    }
    setLeftOrder(left);
    setRightOrder(right);
    setSolvedIds(new Set());
    setSelectedLeft(null);
    setWrongFlash(null);
    setErrors(0);
    setStartTime(Date.now());
    setElapsed(0);
    setFinalTime(0);
    setScreen("playing");
  }, [pool, pairCount]);

  useEffect(() => {
    if (screen !== "playing") return;
    const h = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 500);
    return () => clearInterval(h);
  }, [screen, startTime]);

  useEffect(() => {
    if (screen === "playing" && pairs.length > 0 && solvedIds.size === pairs.length) {
      const total = Math.floor((Date.now() - startTime) / 1000);
      setFinalTime(total);
      const base = pairs.length * 10 - errors * 2;
      const bonus = errors === 0 ? 20 : 0;
      const xp = Math.max(0, base) + bonus;
      addXP(xp);
      setScreen("result");
    }
  }, [screen, solvedIds, pairs.length, startTime, errors]);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickLeft = (uid: string) => {
    if (solvedIds.has(uid)) return;
    if (wrongFlash) return;
    setSelectedLeft(uid);
  };

  const pickRight = (uid: string) => {
    if (solvedIds.has(uid)) return;
    if (wrongFlash) return;
    if (selectedLeft === null) return;
    if (uid === selectedLeft) {
      recordAnswer(uid, true, 0, updateSrs);
      setSolvedIds((prev) => new Set(prev).add(uid));
      setSelectedLeft(null);
    } else {
      recordAnswer(selectedLeft, false, 0, updateSrs);
      setErrors((e) => e + 1);
      const nonce = Date.now();
      setWrongFlash({ leftId: selectedLeft, rightId: uid, nonce });
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        setWrongFlash(null);
        setSelectedLeft(null);
      }, 500);
    }
  };

  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

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
          selectedSublists={selectedSublists}
          setSelectedSublists={setSelectedSublists}
          pairCount={pairCount}
          setPairCount={setPairCount}
          onlyUnknown={onlyUnknown}
          setOnlyUnknown={setOnlyUnknown}
          updateSrs={updateSrs}
          setUpdateSrs={setUpdateSrs}
          pool={pool}
          onStart={start}
        />
      )}

      {screen === "playing" && (
        <Playing
          leftOrder={leftOrder}
          rightOrder={rightOrder}
          solvedIds={solvedIds}
          selectedLeft={selectedLeft}
          wrongFlash={wrongFlash}
          errors={errors}
          elapsed={elapsed}
          solvedCount={solvedIds.size}
          totalPairs={pairs.length}
          onPickLeft={pickLeft}
          onPickRight={pickRight}
        />
      )}

      {screen === "result" && (
        <Result
          totalPairs={pairs.length}
          errors={errors}
          finalTime={finalTime}
          onRestart={start}
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
  selectedSublists: Set<number>;
  setSelectedSublists: (s: Set<number>) => void;
  pairCount: PairCount;
  setPairCount: (n: PairCount) => void;
  onlyUnknown: boolean;
  setOnlyUnknown: (b: boolean) => void;
  updateSrs: boolean;
  setUpdateSrs: (b: boolean) => void;
  pool: PoolWord[];
  onStart: () => void;
}) {
  const {
    category, setCategory, customCategories, isCustomPool,
    selectedSublists, setSelectedSublists, pairCount, setPairCount,
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

  const canStart = pool.length >= pairCount;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Hızlı Eşleştirme</h1>

      <CategoryFilter value={category} onChange={setCategory} categories={customCategories} />

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

      <Field label="Grid boyutu">
        <div className="flex flex-wrap gap-2">
          {PAIR_CHOICES.map((n) => (
            <button key={n} type="button" aria-pressed={pairCount === n} onClick={() => setPairCount(n)} className={pillCls(pairCount === n)}>
              {n} çift{n === 6 && " (kolay)"}{n === 10 && " (zor)"}
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
        <p className="text-red-400 text-sm">Bu filtrelerle yeterli kelime yok, en az {pairCount} gerekli.</p>
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
  leftOrder: PoolWord[];
  rightOrder: PoolWord[];
  solvedIds: Set<string>;
  selectedLeft: string | null;
  wrongFlash: WrongFlash | null;
  errors: number;
  elapsed: number;
  solvedCount: number;
  totalPairs: number;
  onPickLeft: (uid: string) => void;
  onPickRight: (uid: string) => void;
}) {
  const {
    leftOrder, rightOrder, solvedIds, selectedLeft, wrongFlash,
    errors, elapsed, solvedCount, totalPairs, onPickLeft, onPickRight,
  } = props;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="inline-flex items-center gap-1.5 text-slate-300">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="font-mono">{formatTime(elapsed)}</span>
        </div>
        <div className="inline-flex items-center gap-3">
          <span className="text-red-400">✗ {errors}</span>
          <span className="text-slate-400">{solvedCount} / {totalPairs}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2 sm:space-y-3">
          {leftOrder.map((w) => (
            <Cell
              key={`L-${w.uid}`}
              uid={w.uid}
              text={w.word}
              side="left"
              solved={solvedIds.has(w.uid)}
              selected={selectedLeft === w.uid}
              wrong={wrongFlash?.leftId === w.uid ? wrongFlash.nonce : null}
              onClick={() => onPickLeft(w.uid)}
            />
          ))}
        </div>
        <div className="space-y-2 sm:space-y-3">
          {rightOrder.map((w) => (
            <Cell
              key={`R-${w.uid}`}
              uid={w.uid}
              text={w.meaningTr}
              side="right"
              solved={solvedIds.has(w.uid)}
              selected={false}
              wrong={wrongFlash?.rightId === w.uid ? wrongFlash.nonce : null}
              onClick={() => onPickRight(w.uid)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Cell({
  uid,
  text,
  side,
  solved,
  selected,
  wrong,
  onClick,
}: {
  uid: string;
  text: string;
  side: "left" | "right";
  solved: boolean;
  selected: boolean;
  wrong: number | null;
  onClick: () => void;
}) {
  const base = "w-full rounded-lg border px-3 py-3 sm:px-4 sm:py-4 min-h-[64px] flex items-center transition-colors";
  let color: string;
  if (solved) {
    color = "border-emerald-500/60 bg-emerald-500/15 text-emerald-200";
  } else if (wrong !== null) {
    color = "border-red-500/70 bg-red-500/15 text-red-200";
  } else if (selected) {
    color = "border-emerald-500/70 bg-emerald-500/10 text-emerald-200 shadow-[0_0_0_2px_rgba(16,185,129,0.3)]";
  } else {
    color = "border-slate-800 bg-slate-900 text-slate-200 hover:border-emerald-500/40 hover:bg-slate-800";
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={solved}
      aria-hidden={solved}
      aria-pressed={selected}
      aria-label={side === "left" ? `Kelime: ${text}` : `Anlam: ${text}`}
      tabIndex={solved ? -1 : 0}
      className={`${base} ${color}`}
      animate={{
        opacity: solved ? 0 : 1,
        pointerEvents: solved ? "none" : "auto",
        x: wrong !== null ? [0, -8, 8, -8, 8, 0] : 0,
        scale: solved ? [1, 1.05, 1] : 1,
      }}
      transition={
        wrong !== null ? { duration: 0.4 } : solved ? { duration: 0.3 } : { duration: 0.15 }
      }
      key={wrong ?? `cell-${side}-${uid}`}
    >
      <span className={side === "left" ? "font-heading font-semibold text-base sm:text-lg" : "text-xs sm:text-sm leading-snug"}>
        {text}
      </span>
    </motion.button>
  );
}

function Result({
  totalPairs,
  errors,
  finalTime,
  onRestart,
  onBackToSetup,
}: {
  totalPairs: number;
  errors: number;
  finalTime: number;
  onRestart: () => void;
  onBackToSetup: () => void;
}) {
  const base = Math.max(0, totalPairs * 10 - errors * 2);
  const bonus = errors === 0 ? 20 : 0;
  const xp = base + bonus;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-3">
        <h2 className="font-heading text-3xl font-bold">Tamamlandı! 🎉</h2>
        <div className="font-heading text-5xl font-bold text-emerald-400 font-mono">
          {formatTime(finalTime)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Süre" value={formatTime(finalTime)} tone="slate" />
        <StatCard label="Hata" value={String(errors)} tone={errors === 0 ? "emerald" : "red"} />
        <StatCard label="XP" value={`+${xp}`} tone="emerald" />
      </div>

      {errors === 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber-300" />
          <div>
            <div className="font-heading font-semibold text-amber-200">Mükemmel!</div>
            <div className="text-xs text-amber-300/80">Hatasız bitirdin — bonus +20 XP.</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-5 py-2.5 font-medium hover:bg-emerald-400">
          <RotateCcw className="h-4 w-4" /> Tekrar Başla
        </button>
        <button type="button" onClick={onBackToSetup} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-5 py-2.5 font-medium hover:border-slate-600">
          <Settings className="h-4 w-4" /> Ayarları Değiştir
        </button>
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-5 py-2.5 font-medium hover:border-slate-600">
          Dashboard&apos;a Dön
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "slate" | "emerald" | "red" }) {
  const toneCls = tone === "emerald" ? "text-emerald-400" : tone === "red" ? "text-red-400" : "text-slate-200";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
      <div className={`font-heading text-2xl font-bold ${toneCls}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
