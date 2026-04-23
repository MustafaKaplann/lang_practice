"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { Progress, Word } from "@/lib/types";
import {
  getSublistProgress,
  getCelebratedSublists,
} from "@/lib/badges";

const SUBLISTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function SublistSection({
  progress,
  words,
}: {
  progress: Progress;
  words: Word[];
}) {
  const [celebrated, setCelebrated] = useState<number[]>([]);

  useEffect(() => {
    setCelebrated(getCelebratedSublists());
  }, [progress]);

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-slate-100">
        Sublist İlerlemesi
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {SUBLISTS.map((n) => {
          const { known, total, percent, completed } = getSublistProgress(
            n,
            progress,
            words,
          );
          const done = completed || celebrated.includes(n);
          return (
            <div
              key={n}
              className={`rounded-xl border p-4 space-y-2 transition-colors ${
                done
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-medium text-slate-200">
                  Sublist {n}
                </span>
                {done && <Trophy className="h-4 w-4 text-amber-400 shrink-0" />}
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    done ? "bg-amber-400" : "bg-emerald-500"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">
                {known} / {total}
                {done && (
                  <span className="ml-1 text-amber-400 font-medium">
                    Tamamlandı
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
