"use client";

import Link from "next/link";
import { Flame, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { getProgress } from "@/lib/progress";

export default function Header() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(getProgress().streak.current);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-heading text-xl font-bold text-emerald-400">
          AWL Master
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5 text-orange-400" title="Günlük seri">
            <Flame className="h-4 w-4" />
            <span className="font-medium">{streak}</span>
          </div>
          <Link
            href="/dictionary"
            className="flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Sözlük</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
