"use client";

import { useEffect, useState } from "react";
import { Layers, ListChecks, PenLine, Shuffle, BookOpen } from "lucide-react";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { getProgress } from "@/lib/progress";
import { TOTAL_WORDS } from "@/lib/types";

const MODES = [
  {
    href: "/flashcards",
    icon: Layers,
    title: "Flashcards",
    description: "Kartları çevir, bildiklerini işaretle.",
  },
  {
    href: "/quiz",
    icon: ListChecks,
    title: "Çoktan Seçmeli",
    description: "4 şıktan doğru anlamı seç.",
  },
  {
    href: "/fill-blank",
    icon: PenLine,
    title: "Boşluk Doldurma",
    description: "Cümledeki eksik kelimeyi bul.",
  },
  {
    href: "/matching",
    icon: Shuffle,
    title: "Eşleştirme",
    description: "İngilizce–Türkçe çiftleri hızla eşle.",
  },
];

export default function HomePage() {
  const [known, setKnown] = useState(0);

  useEffect(() => {
    setKnown(getProgress().knownWords.length);
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-heading text-3xl font-bold mb-2">Hoş geldin 👋</h1>
        <p className="text-slate-400">
          570 Academic Word List kelimesini oyunlaştırılmış modlarla çalış.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <ProgressBar value={known} max={TOTAL_WORDS} label="Öğrenilen kelime" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {MODES.map((m) => (
          <Card key={m.href} {...m} />
        ))}
      </section>

      <section>
        <Card
          href="/dictionary"
          icon={BookOpen}
          title="Kelime Sözlüğü"
          description="570 kelimeyi sublist'e göre gözden geçir, ara, detayları oku."
        />
      </section>
    </div>
  );
}
