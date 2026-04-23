"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, ListChecks, PenLine, Shuffle, BookOpen, Flame, Trophy, Award, Brain, Calendar, Headphones } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import ProgressRing from "@/components/ui/ProgressRing";
import Confetti from "@/components/ui/Confetti";
import SublistSection from "@/components/games/SublistSection";
import { getDefaultProgress, getProgress } from "@/lib/progress";
import { isSupported as isSpeechSupported } from "@/lib/speech";
import { getSublistProgress, getCelebratedSublists, addCelebratedSublist } from "@/lib/badges";
import { getDueCards, getNewCards, getTomorrowDueCount, todayLocal } from "@/lib/srs";
import { showToast } from "@/lib/toast";
import type { Progress, Word } from "@/lib/types";
import { TOTAL_WORDS } from "@/lib/types";

const MODES = [
  { href: "/review", icon: Brain, title: "Akıllı Tekrar", description: "SM-2 algoritmasıyla kişisel tekrar planı." },
  { href: "/flashcards", icon: Layers, title: "Flashcards", description: "Kartları çevir, bildiklerini işaretle." },
  { href: "/quiz", icon: ListChecks, title: "Çoktan Seçmeli", description: "4 şıktan doğru anlamı seç." },
  { href: "/fill-blank", icon: PenLine, title: "Boşluk Doldurma", description: "Cümledeki eksik kelimeyi bul." },
  { href: "/matching", icon: Shuffle, title: "Eşleştirme", description: "İngilizce–Türkçe çiftleri hızla eşle." },
];

const SUBLISTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Günaydın";
  if (h >= 12 && h < 18) return "İyi günler";
  if (h >= 18 && h < 21) return "İyi akşamlar";
  return "İyi geceler";
}

export default function HomePage() {
  const [progress, setProgress] = useState<Progress>(getDefaultProgress);
  const [words, setWords] = useState<Word[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(true);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);

  const checkCompletions = useCallback((p: Progress, w: Word[]) => {
    if (w.length === 0) return;
    const celebrated = getCelebratedSublists();
    let hasNew = false;
    for (const n of SUBLISTS) {
      const { completed } = getSublistProgress(n, p, w);
      if (completed && !celebrated.includes(n)) {
        addCelebratedSublist(n);
        showToast({ type: "achievement", message: `Sublist ${n} tamamlandı! 🎉`, duration: 5000 });
        hasNew = true;
      }
    }
    if (hasNew) setShowConfetti(true);
  }, []);

  useEffect(() => {
    setSpeechSupported(isSpeechSupported());
    const p = getProgress();
    setProgress(p);
    const dismissed = localStorage.getItem("awl-hint-dismissed") === "true";
    setHintDismissed(dismissed);

    fetch("/data/words.json")
      .then((r) => r.json() as Promise<Word[]>)
      .then((w) => {
        setWords(w);
        checkCompletions(p, w);
      })
      .catch(() => {});
  }, [checkCompletions]);

  useEffect(() => {
    function handler(e: Event) {
      const p = (e as CustomEvent<Progress>).detail;
      setProgress(p);
      checkCompletions(p, words);
    }
    window.addEventListener("awl-progress-updated", handler);
    return () => window.removeEventListener("awl-progress-updated", handler);
  }, [words, checkCompletions]);

  const dismissHint = () => {
    localStorage.setItem("awl-hint-dismissed", "true");
    setHintDismissed(true);
  };

  const known = progress.knownWords.length;
  const completedSublists =
    words.length > 0
      ? SUBLISTS.filter((n) => getSublistProgress(n, progress, words).completed).length
      : 0;

  const today = todayLocal();
  const dueCount = useMemo(() => getDueCards(progress.srs, today).length, [progress.srs, today]);
  const newSrsCount = useMemo(() => getNewCards(words, progress.srs, 10).length, [words, progress.srs, today]);
  const tomorrowCount = useMemo(() => getTomorrowDueCount(progress.srs, today), [progress.srs, today]);

  return (
    <div className="space-y-8">
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* Hero */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="space-y-1.5">
          <h1 className="font-heading text-3xl font-bold text-slate-100">
            {getGreeting()} 👋
          </h1>
          {progress.streak.current > 0 && (
            <p className="flex items-center gap-1.5 text-orange-400 text-sm font-medium">
              <Flame className="h-4 w-4" /> {progress.streak.current} günlük seri
            </p>
          )}
          <p className="text-slate-400 text-sm">570 AWL kelimesini oyunlarla çalış.</p>
        </div>
        <div className="shrink-0">
          <ProgressRing value={known} max={TOTAL_WORDS} />
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: Trophy, label: "Toplam XP", value: progress.totalXP.toLocaleString("tr"), color: "text-amber-400" },
          { icon: BookOpen, label: "Öğrenilen", value: `${known} / ${TOTAL_WORDS}`, color: "text-emerald-400" },
          { icon: Flame, label: "Günlük seri", value: String(progress.streak.current), color: "text-orange-400" },
          { icon: Award, label: "Tamamlanan", value: `${completedSublists} / 10`, color: "text-violet-400" },
          { icon: Calendar, label: "Yarın kart", value: String(tomorrowCount), color: "text-sky-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
            <s.icon className={`h-5 w-5 mx-auto mb-1.5 ${s.color}`} />
            <div className="font-heading text-xl font-bold text-slate-100">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </section>

      {/* New user hint */}
      {!hintDismissed && known === 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-300">
            Henüz hiç kelime işaretlemedin.{" "}
            <Link href="/flashcards" className="text-emerald-400 hover:underline">
              Flashcard ile başla
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={dismissHint}
            className="text-slate-500 hover:text-slate-300 text-xs shrink-0 transition-colors"
          >
            Gizle
          </button>
        </div>
      )}

      {/* SRS CTA */}
      {dueCount > 0 && (
        <section className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-heading text-base font-bold text-emerald-300 flex items-center gap-2">
              <Brain className="h-4 w-4" /> Bugün {dueCount} kelimen tekrar için hazır
            </div>
            <p className="text-sm text-slate-400 mt-0.5">Akıllı tekrar sistemi önerisini kaçırma.</p>
          </div>
          <Link href="/review"
            className="shrink-0 rounded-lg bg-emerald-500 text-slate-950 px-4 py-2 font-medium hover:bg-emerald-400 text-sm">
            Hemen Başla
          </Link>
        </section>
      )}
      {dueCount === 0 && newSrsCount > 0 && (
        <section className="rounded-xl border border-slate-700 bg-slate-900/30 p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-heading text-base font-semibold text-slate-200 flex items-center gap-2">
              <Brain className="h-4 w-4 text-slate-400" /> {newSrsCount} yeni kelime seni bekliyor
            </div>
          </div>
          <Link href="/review"
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-4 py-2 font-medium hover:border-slate-600 text-sm">
            Başla
          </Link>
        </section>
      )}

      {/* Game modes */}
      <section className="grid gap-4 sm:grid-cols-2">
        {MODES.map((m) => (
          <Card key={m.href} {...m} />
        ))}
        {speechSupported === null ? null : speechSupported ? (
          <Card
            href="/listening"
            icon={Headphones}
            title="Dinleme Modu"
            description="Kelimeyi dinle, doğru anlamı yaz."
          />
        ) : (
          <div
            title="Tarayıcın desteklemiyor"
            className="block rounded-xl border border-slate-800 bg-slate-900/30 p-6 opacity-50 cursor-not-allowed select-none"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700/30">
              <Headphones className="h-5 w-5 text-slate-500" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-slate-400 mb-1">Dinleme Modu</h3>
            <p className="text-sm text-slate-500">Tarayıcın desteklemiyor.</p>
          </div>
        )}
      </section>

      <section>
        <Card
          href="/dictionary"
          icon={BookOpen}
          title="Kelime Sözlüğü"
          description="570 kelimeyi sublist'e göre gözden geçir, ara, detayları oku."
        />
      </section>

      {/* Sublist progress */}
      {words.length > 0 && <SublistSection progress={progress} words={words} />}
    </div>
  );
}
