"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, RotateCcw, ChevronLeft, SearchX } from "lucide-react";
import Link from "next/link";
import type { PoolWord } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import { getProgress, markKnown, markUnknown, recordAnswer } from "@/lib/progress";
import { speak, isSupported, cancel } from "@/lib/speech";
import { getSettings } from "@/lib/settings";
import { getWordPool, getCustomCategories, type WordPoolCategory } from "@/lib/wordPool";
import ErrorState from "@/components/ui/ErrorState";
import SpeakButton from "@/components/ui/SpeakButton";
import CategoryFilter from "@/components/games/CategoryFilter";

type Status = "loading" | "error" | "ready";
const SUBLISTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function FlashcardsPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [allWords, setAllWords] = useState<PoolWord[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const [category, setCategory] = useState<WordPoolCategory>("awl");
  const [sublist, setSublist] = useState<number | "all">("all");
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());

  const [deck, setDeck] = useState<PoolWord[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState({ known: 0, unknown: 0 });
  const [done, setDone] = useState(false);
  const [updateSrs, setUpdateSrs] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([getWordPool(category), getCustomCategories()])
      .then(([words, cats]) => {
        if (cancelled) return;
        setAllWords(words);
        setCustomCategories(cats);
        setKnownIds(new Set(getProgress().knownWords));
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [retryKey, category]);

  const isCustomPool = category !== "awl";

  const filtered = useMemo(() => {
    return allWords.filter((w) => {
      if (!isCustomPool && sublist !== "all" && w.sublist !== sublist) return false;
      if (onlyUnknown && knownIds.has(w.uid)) return false;
      return true;
    });
  }, [allWords, sublist, onlyUnknown, knownIds, isCustomPool]);

  const buildDeck = useCallback(() => {
    setDeck(shuffle(filtered));
    setIndex(0);
    setFlipped(false);
    setSession({ known: 0, unknown: 0 });
    setDone(false);
  }, [filtered]);

  useEffect(() => { buildDeck(); }, [buildDeck]);

  const current = deck[index];

  const answer = useCallback(
    (correct: boolean) => {
      if (!current || done) return;
      if (correct) {
        markKnown(current.uid);
        setKnownIds((prev) => new Set(prev).add(current.uid));
      } else {
        markUnknown(current.uid);
        setKnownIds((prev) => { const n = new Set(prev); n.delete(current.uid); return n; });
      }
      recordAnswer(current.uid, correct, undefined, updateSrs);
      setSession((s) => ({ known: s.known + (correct ? 1 : 0), unknown: s.unknown + (correct ? 0 : 1) }));
      if (index + 1 >= deck.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setFlipped(false);
      }
    },
    [current, done, index, deck.length, updateSrs],
  );

  useEffect(() => () => { cancel(); }, []);

  useEffect(() => {
    if (!flipped || !current || !isSupported()) return;
    const s = getSettings().speech;
    if (s.enabled && s.autoPlayInGames) {
      speak(current.word, { rate: s.rate, voice: s.voice ?? undefined });
    }
  }, [flipped, current?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status !== "ready" || deck.length === 0 || done) return;
      if (e.code === "Space") { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === "ArrowRight") answer(true);
      else if (e.key === "ArrowLeft") answer(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, deck.length, done, answer]);

  if (status === "loading") return <div className="text-slate-400">Yükleniyor…</div>;
  if (status === "error") return <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400">
          <ChevronLeft className="h-4 w-4" /> Ana sayfa
        </Link>
        {!done && deck.length > 0 && <div className="text-sm text-slate-400">{index + 1} / {deck.length}</div>}
      </div>

      <CategoryFilter value={category} onChange={setCategory} categories={customCategories} />

      <div className="space-y-3">
        {!isCustomPool && (
          <div className="flex flex-wrap gap-2">
            {(["all", ...SUBLISTS] as Array<"all" | number>).map((s) => (
              <button key={String(s)} type="button" onClick={() => setSublist(s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${s === sublist ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"}`}>
                {s === "all" ? "Tümü" : `Sublist ${s}`}
              </button>
            ))}
          </div>
        )}
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
      </div>

      {deck.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center space-y-4">
          <SearchX className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-slate-400">Bu filtreyle eşleşen kart bulunamadı.</p>
          <button type="button" onClick={() => { setSublist("all"); setOnlyUnknown(false); }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 px-4 py-2 text-sm hover:bg-emerald-500/20">
            <RotateCcw className="h-4 w-4" /> Filtreyi Sıfırla
          </button>
        </div>
      ) : done ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center space-y-6">
          <div><h2 className="font-heading text-2xl font-bold mb-2">Bitti 🎉</h2>
            <p className="text-slate-400">{deck.length} kartı tamamladın.</p></div>
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
              <div className="text-3xl font-bold text-emerald-400">{session.known}</div>
              <div className="text-xs text-slate-400 mt-1">Biliyorum</div>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
              <div className="text-3xl font-bold text-red-400">{session.unknown}</div>
              <div className="text-xs text-slate-400 mt-1">Bilmiyorum</div>
            </div>
          </div>
          <button type="button" onClick={buildDeck}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-5 py-2.5 font-medium hover:bg-emerald-400">
            <RotateCcw className="h-4 w-4" /> Tekrar Başla
          </button>
        </div>
      ) : current ? (
        <>
          <Flashcard word={current} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
          <div className="flex gap-3 justify-center">
            <button type="button" onClick={() => answer(false)}
              className="flex-1 max-w-[200px] rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 py-3 font-medium inline-flex items-center justify-center gap-2">
              <X className="h-4 w-4" /> Bilmiyorum
            </button>
            <button type="button" onClick={() => answer(true)}
              className="flex-1 max-w-[200px] rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 py-3 font-medium inline-flex items-center justify-center gap-2">
              <Check className="h-4 w-4" /> Biliyorum
            </button>
          </div>
          <p className="text-center text-xs text-slate-500">Space: çevir · ← Bilmiyorum · → Biliyorum</p>
        </>
      ) : null}
    </div>
  );
}

function Flashcard({ word, flipped, onFlip }: { word: PoolWord; flipped: boolean; onFlip: () => void }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={word.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
        className="mx-auto w-full max-w-xl" style={{ perspective: 1200 }}>
        <button type="button" onClick={onFlip}
          aria-label={flipped ? "Kartı ön yüze çevir" : "Kartı arka yüze çevir"}
          className="relative w-full h-80 cursor-pointer" style={{ transformStyle: "preserve-3d" }}>
          <motion.div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45 }}>
            <CardFace>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="font-heading text-4xl sm:text-5xl font-bold text-slate-100">{word.word}</div>
                  <SpeakButton text={word.word} size="md" />
                </div>
                {word.sublist && <div className="mt-3 text-xs uppercase tracking-wider text-slate-500">Sublist {word.sublist}</div>}
                {word.category && <div className="mt-3 text-xs uppercase tracking-wider text-violet-400">{word.category}</div>}
                <div className="mt-6 text-xs text-slate-500">Çevirmek için tıkla / Space</div>
              </div>
            </CardFace>
            <CardFace back>
              <div className="w-full space-y-4 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-lg font-bold text-slate-200">{word.word}</span>
                  <SpeakButton text={word.word} size="sm" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-emerald-400 mb-1">Türkçe</div>
                  <div className="text-lg font-medium text-slate-100">{word.meaningTr}</div>
                </div>
                {word.meaningEn && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">English</div>
                    <div className="text-sm text-slate-400">{word.meaningEn}</div>
                  </div>
                )}
                {word.exampleEn && (
                  <div className="pt-3 border-t border-slate-800 space-y-1">
                    <div className="flex items-start gap-1.5">
                      <p className="text-sm italic text-slate-300 flex-1">&ldquo;{word.exampleEn}&rdquo;</p>
                      <SpeakButton text={word.exampleEn} size="sm" className="shrink-0 mt-0.5" />
                    </div>
                    {word.exampleTr && <p className="text-sm italic text-slate-500">{word.exampleTr}</p>}
                  </div>
                )}
              </div>
            </CardFace>
          </motion.div>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

function CardFace({ children, back = false }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div className="absolute inset-0 rounded-2xl border border-slate-800 bg-slate-900 p-8 flex items-center justify-center shadow-lg overflow-auto"
      style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : undefined }}>
      {children}
    </div>
  );
}
