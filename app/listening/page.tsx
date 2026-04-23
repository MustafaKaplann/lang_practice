"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Headphones, RotateCcw, Settings, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Word } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import { speak, isSupported, cancel } from "@/lib/speech";
import { getSettings } from "@/lib/settings";
import { recordAnswer } from "@/lib/progress";
import ErrorState from "@/components/ui/ErrorState";
import SpeakButton from "@/components/ui/SpeakButton";

type Screen = "setup" | "playing" | "result";
type ListeningMode = "word" | "sentence";
type CountChoice = 10 | 20 | 50;

interface ListeningQ {
  wordId: number;
  word: string;
  speakText: string;
  meaningTr: string;
  sentenceHint?: string;
}

interface Answered { q: ListeningQ; typed: string; correct: boolean }

const SUBLISTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const COUNTS: CountChoice[] = [10, 20, 50];

function buildQuestions(pool: Word[], mode: ListeningMode, count: number): ListeningQ[] {
  const eligible = mode === "sentence" ? pool.filter((w) => !!w.exampleEn) : pool;
  return shuffle(eligible).slice(0, Math.min(count, eligible.length)).map((w) => ({
    wordId: w.id,
    word: w.word,
    speakText: mode === "sentence" ? (w.exampleEn ?? w.word) : w.word,
    meaningTr: w.meaningTr,
    sentenceHint: mode === "sentence" ? w.exampleTr : undefined,
  }));
}

const pillCls = (a: boolean) =>
  `px-3 py-1.5 rounded-full text-sm border transition-colors ${a ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"}`;

export default function ListeningPage() {
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [speechOk, setSpeechOk] = useState(false);
  const [screen, setScreen] = useState<Screen>("setup");

  const [selectedSublists, setSelectedSublists] = useState<Set<number>>(new Set(SUBLISTS));
  const [mode, setMode] = useState<ListeningMode>("word");
  const [countChoice, setCountChoice] = useState<CountChoice>(10);

  const [questions, setQuestions] = useState<ListeningQ[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSpeechOk(isSupported());
    let cancelled = false;
    setStatus("loading");
    fetch("/data/words.json")
      .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<Word[]>; })
      .then((d) => { if (!cancelled) { setAllWords(d); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; cancel(); };
  }, [retryKey]);

  const pool = useMemo(
    () => allWords.filter((w) => w.sublist !== undefined && selectedSublists.has(w.sublist)),
    [allWords, selectedSublists],
  );

  const currentQ = questions[qIdx];

  function startGame() {
    const qs = buildQuestions(pool, mode, countChoice);
    setQuestions(qs);
    setQIdx(0);
    setTyped("");
    setRevealed(false);
    setCorrect(false);
    setAnswered([]);
    setScreen("playing");
  }

  function doSpeak(q: ListeningQ) {
    const s = getSettings().speech;
    speak(q.speakText, { rate: s.rate, voice: s.voice ?? undefined });
  }

  // Auto-speak when question appears
  useEffect(() => {
    if (screen !== "playing" || !questions[qIdx]) return;
    doSpeak(questions[qIdx]);
    setTimeout(() => inputRef.current?.focus(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, qIdx]);

  function doSubmit() {
    if (!currentQ) return;
    const isCorrect = typed.trim().toLowerCase() === currentQ.word.toLowerCase();
    setCorrect(isCorrect);
    setRevealed(true);
    setAnswered((a) => [...a, { q: currentQ, typed: typed.trim(), correct: isCorrect }]);
    recordAnswer(currentQ.wordId, isCorrect);
    if (isCorrect) {
      const s = getSettings().speech;
      speak(currentQ.word, { rate: (s.rate ?? 0.9) * 0.85, voice: s.voice ?? undefined });
    }
  }

  function doAdvance() {
    if (qIdx + 1 >= questions.length) {
      setScreen("result");
    } else {
      setQIdx((i) => i + 1);
      setTyped("");
      setRevealed(false);
    }
  }

  useEffect(() => {
    if (screen !== "playing") return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "Enter") {
        e.preventDefault();
        if (revealed) doAdvance();
        else doSubmit();
      } else if ((e.key === "r" || e.key === "R") && tag !== "INPUT" && tag !== "TEXTAREA") {
        if (currentQ) doSpeak(currentQ);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, revealed, qIdx, typed, questions]);

  if (status === "loading") return <div className="text-slate-400">Yükleniyor…</div>;
  if (status === "error") return <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />;

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400">
        <ChevronLeft className="h-4 w-4" /> Ana sayfa
      </Link>

      {screen === "setup" && (
        <div className="space-y-6">
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6 text-emerald-400" /> Dinleme Modu
          </h1>

          {!speechOk && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-5 space-y-2">
              <p className="text-orange-300 font-medium">Tarayıcın ses sentezini desteklemiyor.</p>
              <p className="text-orange-400/70 text-sm">Bu oyun için ses desteği gereklidir.</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-300">Sublist</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedSublists(selectedSublists.size === SUBLISTS.length ? new Set([1]) : new Set(SUBLISTS))} className={pillCls(selectedSublists.size === SUBLISTS.length)}>Tümü</button>
              {SUBLISTS.map((n) => <button key={n} type="button" onClick={() => { const next = new Set(selectedSublists); next.has(n) ? next.delete(n) : next.add(n); if (next.size > 0) setSelectedSublists(next); }} className={pillCls(selectedSublists.has(n))}>Sublist {n}</button>)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-300">Mod</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setMode("word")} className={pillCls(mode === "word")}>Tek Kelime</button>
              <button type="button" onClick={() => setMode("sentence")} className={pillCls(mode === "sentence")}>Cümle Bazlı</button>
            </div>
            <p className="text-xs text-slate-500">
              {mode === "word" ? "Kelime sesli okunur, siz yazarsınız." : "Örnek cümle okunur, hedef kelimeyi yazarsınız. Türkçe çeviri ipucu olarak görünür."}
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-300">Soru sayısı</div>
            <div className="flex flex-wrap gap-2">
              {COUNTS.map((c) => <button key={c} type="button" onClick={() => setCountChoice(c)} className={pillCls(countChoice === c)}>{c}</button>)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
            Havuz: <span className="text-slate-200 font-medium">{buildQuestions(pool, mode, Infinity).length}</span> kelime.
          </div>

          {!speechOk && (
            <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline">
              <Settings className="h-4 w-4" /> Ses ayarlarını kontrol et
            </Link>
          )}

          <button
            type="button"
            onClick={startGame}
            disabled={!speechOk || pool.length < 1}
            className="w-full sm:w-auto rounded-lg bg-emerald-500 text-slate-950 px-6 py-3 font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <Headphones className="h-4 w-4" /> Başla
          </button>
        </div>
      )}

      {screen === "playing" && currentQ && (
        <div className="space-y-5">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Soru {qIdx + 1} / {questions.length}</span>
            <span>
              <span className="text-emerald-400">✓ {answered.filter(a => a.correct).length}</span>
              <span className="text-red-400 ml-2">✗ {answered.filter(a => !a.correct).length}</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(qIdx / questions.length) * 100}%` }} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={qIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center space-y-4">
                <button
                  type="button"
                  onClick={() => doSpeak(currentQ)}
                  className="mx-auto inline-flex flex-col items-center gap-3 text-slate-300 hover:text-emerald-400 transition-colors"
                  aria-label="Kelimeyi dinle"
                >
                  <Volume2 className="h-12 w-12" aria-hidden />
                  <span className="text-sm">Tekrar Dinle · R</span>
                </button>
                {currentQ.sentenceHint && (
                  <p className="text-sm text-slate-500 italic">{currentQ.sentenceHint}</p>
                )}
                {revealed && (
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <div className={`text-2xl font-heading font-bold ${correct ? "text-emerald-400" : "text-red-400"}`}>
                      {correct ? "Doğru! ✓" : "Yanlış ✗"}
                    </div>
                    {!correct && (
                      <div className="space-y-1">
                        <div className="text-sm text-slate-500">
                          Yazdığın: <span className="line-through text-red-400">{typed || "(boş)"}</span>
                        </div>
                        <div className="text-sm text-slate-300">
                          Doğrusu: <strong className="text-emerald-400">{currentQ.word}</strong>
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-slate-400">{currentQ.meaningTr}</div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {!revealed ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Kelimeyi yaz…"
                className="flex-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 px-4 py-3 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <button type="button" onClick={doSubmit} className="rounded-lg bg-emerald-500 text-slate-950 px-5 py-3 font-medium hover:bg-emerald-400">
                Cevapla
              </button>
            </div>
          ) : (
            <button type="button" onClick={doAdvance} className="w-full rounded-lg bg-emerald-500 text-slate-950 py-3 font-medium hover:bg-emerald-400">
              {qIdx + 1 >= questions.length ? "Sonucu Gör" : "Sonraki →"}
            </button>
          )}
          <p className="text-center text-xs text-slate-500">Enter: cevapla/sonraki · R: tekrar dinle</p>
        </div>
      )}

      {screen === "result" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-3">
            <h2 className="font-heading text-2xl font-bold">Sonuç</h2>
            <div className="font-heading text-5xl font-bold text-emerald-400">
              {answered.filter((a) => a.correct).length} / {answered.length}
            </div>
            <p className="text-slate-400">+{answered.filter((a) => a.correct).length * 10} XP</p>
          </div>

          {answered.filter((a) => !a.correct).length > 0 && (
            <div className="space-y-3">
              <h3 className="font-heading text-lg font-semibold">Yanlışlar</h3>
              <div className="space-y-2">
                {answered.filter((a) => !a.correct).map((a, i) => (
                  <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold text-slate-100">{a.q.word}</span>
                        <SpeakButton text={a.q.word} size="sm" />
                      </div>
                      <div className="text-xs text-slate-500">
                        Yazdığın: <span className="text-red-400 line-through">{a.typed || "(boş)"}</span>
                      </div>
                      <div className="text-xs text-slate-400">{a.q.meaningTr}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={startGame} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-5 py-2.5 font-medium hover:bg-emerald-400">
              <RotateCcw className="h-4 w-4" /> Tekrar Başla
            </button>
            <button type="button" onClick={() => setScreen("setup")} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-5 py-2.5 font-medium hover:border-slate-600">
              <Settings className="h-4 w-4" /> Ayarları Değiştir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
