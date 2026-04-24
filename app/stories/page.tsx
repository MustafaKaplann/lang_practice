"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, BookOpen, Clock, Mic } from "lucide-react";
import type { Story } from "@/lib/types";
import ErrorState from "@/components/ui/ErrorState";

type Status = "loading" | "error" | "ready";

const DIFFICULTY_LABELS: Record<Story["difficulty"], string> = {
  beginner: "Başlangıç",
  intermediate: "Orta",
  advanced: "İleri",
};

const DIFFICULTY_CLS: Record<Story["difficulty"], string> = {
  beginner: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  intermediate: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  advanced: "bg-red-500/15 border-red-500/30 text-red-300",
};

export default function StoriesPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch("/api/stories")
      .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<Story[]>; })
      .then((data) => { if (!cancelled) { setStories(data); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [retryKey]);

  if (status === "loading") return <div className="text-slate-400">Yükleniyor…</div>;
  if (status === "error") return <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400">
          <ChevronLeft className="h-4 w-4" /> Ana sayfa
        </Link>
      </div>

      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Mic className="h-6 w-6 text-violet-400" /> Hikayeler
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Dinle, metni takip et — AWL kelimeleri metinde vurgulanır.
        </p>
      </div>

      {stories.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-3">
          <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-slate-400">Henüz hikaye eklenmemiş.</p>
          <p className="text-xs text-slate-500">Admin panelinden hikaye ekleyebilirsin.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {stories.map((story) => (
            <Link
              key={story.id}
              href={`/stories/${story.id}`}
              className="group rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-violet-500/40 hover:bg-slate-900 transition-colors space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading font-semibold text-slate-100 group-hover:text-violet-300 transition-colors leading-snug">
                  {story.title}
                </h2>
                <span className={`shrink-0 inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${DIFFICULTY_CLS[story.difficulty]}`}>
                  {DIFFICULTY_LABELS[story.difficulty]}
                </span>
              </div>

              {story.description && (
                <p className="text-sm text-slate-400 line-clamp-2">{story.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500">
                {story.author && <span>{story.author}</span>}
                {story.estimatedMinutes > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {story.estimatedMinutes} dk
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
