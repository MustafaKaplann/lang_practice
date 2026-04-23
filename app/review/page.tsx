"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Brain, ChevronLeft, RotateCcw, Calendar } from "lucide-react";
import type { Progress, SRSCard, Word } from "@/lib/types";
import { getDefaultProgress, getProgress, saveProgress } from "@/lib/progress";
import {
  getDueCards, getNewCards, getDefaultCard, reviewCard,
  getTomorrowDueCount, todayLocal, addDays, type SRSQuality,
} from "@/lib/srs";
import { speak, isSupported, cancel } from "@/lib/speech";
import { getSettings } from "@/lib/settings";
import ErrorState from "@/components/ui/ErrorState";
import SpeakButton from "@/components/ui/SpeakButton";

type Phase = "intro" | "reviewing" | "done";
interface QItem { wordId: number; isNew: boolean }

const DAILY_LIMITS = [5, 10, 15, 20, 30];

const QUALITY_OPTS: Array<{ label: string; key: string; q: SRSQuality; cls: string }> = [
  { label: "Bilmiyorum", key: "1", q: 0, cls: "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20" },
  { label: "Zor", key: "2", q: 3, cls: "border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20" },
  { label: "İyi", key: "3", q: 4, cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" },
  { label: "Kolay", key: "4", q: 5, cls: "border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20" },
];

function fmtInterval(days: number): string {
  if (days <= 1) return "1 gün";
  if (days < 30) return `${days} gün`;
  return `${Math.round(days / 30)} ay`;
}

function migrate(p: Progress): boolean {
  if (typeof window === "undefined" || localStorage.getItem("srs-migrated") === "true") return false;
  for (const id of p.knownWords) {
    if (!p.srs[id]) {
      p.srs[id] = { ...getDefaultCard(id), repetitions: 2, interval: 6, dueDate: addDays(todayLocal(), 6) };
    }
  }
  localStorage.setItem("srs-migrated", "true");
  return true;
}

export default function ReviewPage() {
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Progress>(getDefaultProgress);
  const [phase, setPhase] = useState<Phase>("intro");
  const [dailyLimit, setDailyLimit] = useState(10);
  const [queue, setQueue] = useState<QItem[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [shown, setShown] = useState(false);
  const [stats, setStats] = useState({ dueInit: 0, newInit: 0, answered: 0, qualitySum: 0 });

  useEffect(() => {
    setStatus("loading");
    let cancelled = false;
    fetch("/data/words.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<Word[]>; })
      .then((w) => {
        if (cancelled) return;
        setWords(w);
        const p = getProgress();
        if (migrate(p)) saveProgress(p);
        setProgress(p);
        setStatus("ready");
        if (process.env.NODE_ENV === "development") {
          import("@/lib/srs-dev").then((m) => m.exposeToWindow());
        }
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [retryKey]);

  const today = todayLocal();
  const wordMap = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const dueIds = useMemo(() => getDueCards(progress.srs, today), [progress.srs, today]);
  const newIds = useMemo(() => getNewCards(words, progress.srs, dailyLimit), [words, progress.srs, dailyLimit]);

  function startSession() {
    const q: QItem[] = [
      ...dueIds.map((id) => ({ wordId: id, isNew: false })),
      ...newIds.map((id) => ({ wordId: id, isNew: true })),
    ];
    setQueue(q);
    setQIdx(0);
    setShown(false);
    setStats({ dueInit: dueIds.length, newInit: newIds.length, answered: 0, qualitySum: 0 });
    setPhase("reviewing");
  }

  const handleAnswer = useCallback((quality: SRSQuality) => {
    const item = queue[qIdx];
    if (!item) return;
    const p = getProgress();
    const card = p.srs[item.wordId] ?? getDefaultCard(item.wordId);
    p.srs[item.wordId] = reviewCard(card, quality);
    saveProgress(p);
    setProgress(p);
    setStats((s) => ({ ...s, answered: s.answered + 1, qualitySum: s.qualitySum + quality }));
    const willAddBack = quality < 3;
    if (willAddBack) setQueue((q) => [...q, { wordId: item.wordId, isNew: false }]);
    const nextIdx = qIdx + 1;
    setQIdx(nextIdx);
    setShown(false);
    if (nextIdx >= (willAddBack ? queue.length + 1 : queue.length)) setPhase("done");
  }, [queue, qIdx]);

  // Cancel speech on unmount
  useEffect(() => () => { cancel(); }, []);

  // AutoPlay: speak word when card is shown
  useEffect(() => {
    if (!shown || !isSupported()) return;
    const w = wordMap.get(queue[qIdx]?.wordId ?? -1);
    if (!w) return;
    const s = getSettings().speech;
    if (s.enabled && s.autoPlayInGames) {
      speak(w.word, { rate: s.rate, voice: s.voice ?? undefined });
    }
  }, [shown, qIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "reviewing") return;
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") { e.preventDefault(); setShown((s) => !s); return; }
      if (!shown) return;
      const map: Record<string, SRSQuality> = { "1": 0, "2": 3, "3": 4, "4": 5 };
      const q = map[e.key];
      if (q !== undefined) handleAnswer(q);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, shown, handleAnswer]);

  if (status === "loading") return <div className="text-slate-400">Yükleniyor…</div>;
  if (status === "error") return <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />;

  const currentWord = phase === "reviewing" ? wordMap.get(queue[qIdx]?.wordId ?? -1) : undefined;
  const currentCard = phase === "reviewing" && queue[qIdx]
    ? (progress.srs[queue[qIdx].wordId] ?? getDefaultCard(queue[qIdx].wordId))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400">
          <ChevronLeft className="h-4 w-4" /> Ana sayfa
        </Link>
      </div>

      {phase === "intro" && (
        <IntroScreen
          dueCount={dueIds.length}
          newCount={newIds.length}
          dailyLimit={dailyLimit}
          setDailyLimit={setDailyLimit}
          onStart={startSession}
          progress={progress}
          wordMap={wordMap}
          today={today}
        />
      )}

      {phase === "reviewing" && currentWord && currentCard && (
        <div className="space-y-5">
          <div className="flex justify-between text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Brain className="h-4 w-4" /> Akıllı Tekrar</span>
            <span>{qIdx + 1} / {queue.length} kart</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(qIdx / queue.length) * 100}%` }} />
          </div>
          <ReviewCard word={currentWord} shown={shown} onShow={() => setShown(true)} />
          {shown && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUALITY_OPTS.map((opt) => (
                <button
                  key={opt.q}
                  type="button"
                  onClick={() => handleAnswer(opt.q)}
                  className={`rounded-lg border py-3 px-2 text-sm font-medium transition-colors flex flex-col items-center gap-1 ${opt.cls}`}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs opacity-60">{fmtInterval(reviewCard(currentCard, opt.q).interval)}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-slate-500">Space: göster · 1–4: kalite</p>
        </div>
      )}

      {phase === "done" && (
        <DoneScreen
          stats={stats}
          tomorrowCount={getTomorrowDueCount(progress.srs, today)}
          onRestart={startSession}
        />
      )}
    </div>
  );
}

function IntroScreen({ dueCount, newCount, dailyLimit, setDailyLimit, onStart, progress, wordMap, today }: {
  dueCount: number; newCount: number; dailyLimit: number;
  setDailyLimit: (n: number) => void; onStart: () => void;
  progress: Progress; wordMap: Map<number, Word>; today: string;
}) {
  const total = dueCount + newCount;
  const srsCards = Object.values(progress.srs);
  const avgEF = srsCards.length > 0
    ? (srsCards.reduce((s, c) => s + c.easeFactor, 0) / srsCards.length).toFixed(2)
    : "—";
  const topLapses = [...srsCards].filter((c) => c.lapses > 0).sort((a, b) => b.lapses - a.lapses).slice(0, 5);
  const tomorrowCount = getTomorrowDueCount(progress.srs, today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-emerald-400" /> Akıllı Tekrar
        </h1>
        <p className="text-slate-400 text-sm mt-1">SM-2 algoritması ile en doğru zamanda tekrar et.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 text-center">
          <div className="font-heading text-3xl font-bold text-orange-300">{dueCount}</div>
          <div className="text-xs text-slate-400 mt-1">Bugün tekrar edilecek</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
          <div className="font-heading text-3xl font-bold text-emerald-300">{newCount}</div>
          <div className="text-xs text-slate-400 mt-1">Yeni öğrenilecek</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-300">Günlük yeni kelime limiti</div>
        <div className="flex flex-wrap gap-2">
          {DAILY_LIMITS.map((n) => (
            <button key={n} type="button" onClick={() => setDailyLimit(n)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${dailyLimit === n ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center space-y-3">
          <p className="text-slate-300 font-medium">Bugünlük hiçbir şey yok 🎉</p>
          <p className="text-slate-500 text-sm">Yarın {tomorrowCount} kart seni bekliyor.</p>
          <button type="button" onClick={onStart}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-4 py-2 text-sm hover:border-slate-600">
            <Calendar className="h-4 w-4" /> Yine de başla
          </button>
        </div>
      ) : (
        <button type="button" onClick={onStart}
          className="w-full sm:w-auto rounded-lg bg-emerald-500 text-slate-950 px-6 py-3 font-medium hover:bg-emerald-400 inline-flex items-center gap-2">
          <Brain className="h-4 w-4" /> Başla ({total} kart)
        </button>
      )}

      {srsCards.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">İstatistikler</h2>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="font-heading text-xl font-bold text-slate-100">{srsCards.length}</div>
              <div className="text-xs text-slate-500">Hafızandaki kartlar</div>
            </div>
            <div>
              <div className="font-heading text-xl font-bold text-slate-100">{avgEF}</div>
              <div className="text-xs text-slate-500">Ortalama ease factor</div>
            </div>
          </div>
          {topLapses.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500">En çok unuttuğun kelimeler</div>
              {topLapses.map((c) => {
                const w = wordMap.get(c.wordId);
                return w ? (
                  <Link key={c.wordId} href={`/dictionary?id=${c.wordId}`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 hover:border-slate-700">
                    <span className="font-heading text-sm font-semibold text-slate-200">{w.word}</span>
                    <span className="text-xs text-red-400">{c.lapses}× unutuldu</span>
                  </Link>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ word, shown, onShow }: { word: Word; shown: boolean; onShow: () => void }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={word.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-8 min-h-[200px] flex flex-col items-center justify-center text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <div className="font-heading text-4xl sm:text-5xl font-bold text-slate-100">{word.word}</div>
          <SpeakButton text={word.word} size="md" />
        </div>
        {word.sublist && <div className="text-xs uppercase tracking-wider text-slate-500">Sublist {word.sublist}</div>}
        {!shown ? (
          <button type="button" onClick={onShow}
            className="mt-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 px-5 py-2 text-sm hover:bg-slate-700">
            Göster · Space
          </button>
        ) : (
          <div className="w-full text-left space-y-3 pt-2 border-t border-slate-800">
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-400 mb-0.5">Türkçe</div>
              <div className="text-lg font-medium text-slate-100">{word.meaningTr}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">English</div>
              <div className="text-sm text-slate-400">{word.meaningEn}</div>
            </div>
            {word.exampleEn && (
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="flex items-start gap-1.5">
                  <p className="text-sm italic text-slate-300 flex-1">&ldquo;{word.exampleEn}&rdquo;</p>
                  <SpeakButton text={word.exampleEn} size="sm" className="shrink-0 mt-0.5" />
                </div>
                {word.exampleTr && <p className="text-sm italic text-slate-500">{word.exampleTr}</p>}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function DoneScreen({ stats, tomorrowCount, onRestart }: {
  stats: { dueInit: number; newInit: number; answered: number; qualitySum: number };
  tomorrowCount: number; onRestart: () => void;
}) {
  const avgQ = stats.answered > 0 ? (stats.qualitySum / stats.answered).toFixed(1) : "—";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold mb-2">Oturum Tamamlandı 🎉</h2>
        <p className="text-slate-400 text-sm">{stats.answered} cevap verdin.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tekrar", value: stats.dueInit },
          { label: "Yeni", value: stats.newInit },
          { label: "Ort. kalite", value: avgQ },
          { label: "Yarın", value: tomorrowCount },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <div className="font-heading text-xl font-bold text-slate-100">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <button type="button" onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-5 py-2.5 font-medium hover:bg-emerald-400">
          <RotateCcw className="h-4 w-4" /> Tekrar Başla
        </button>
        <Link href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-5 py-2.5 font-medium hover:border-slate-600">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
