"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Play, Pause, RotateCcw, Volume2, Clock,
} from "lucide-react";
import type { Story, Word } from "@/lib/types";
import { highlightAWLWords } from "@/lib/highlight";
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

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function StoryDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [status, setStatus] = useState<Status>("loading");
  const [story, setStory] = useState<Story | null>(null);
  const [awlSet, setAwlSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([
      fetch(`/api/stories/${id}`).then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<Story>; }),
      fetch("/data/words.json").then((r) => r.json() as Promise<Word[]>),
    ])
      .then(([storyData, words]) => {
        if (cancelled) return;
        setStory(storyData);
        setAwlSet(new Set(words.map((w) => w.word.toLowerCase())));
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [id]);

  if (status === "loading") return <div className="text-slate-400">Yükleniyor…</div>;
  if (status === "error") return <ErrorState onRetry={() => window.location.reload()} />;
  if (!story) return null;

  const segments = highlightAWLWords(story.transcript, awlSet);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/stories" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-violet-400">
          <ChevronLeft className="h-4 w-4" /> Hikayeler
        </Link>
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center text-xs border px-2 py-0.5 rounded-full ${DIFFICULTY_CLS[story.difficulty]}`}>
            {DIFFICULTY_LABELS[story.difficulty]}
          </span>
          {story.estimatedMinutes > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" /> {story.estimatedMinutes} dk
            </span>
          )}
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-100">{story.title}</h1>
        {story.author && <p className="text-sm text-slate-400">{story.author}</p>}
        {story.description && <p className="text-sm text-slate-400">{story.description}</p>}
      </header>

      <AudioPlayer src={story.audioUrl} />

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium">Metin</h2>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400/70"></span>
            AWL kelimeleri
          </div>
        </div>
        <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-slate-300 whitespace-pre-wrap">
          {segments.map((seg, i) =>
            seg.highlight ? (
              <mark
                key={i}
                className="bg-transparent text-emerald-300 font-semibold not-italic"
                title="AWL kelimesi"
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>
      </section>

      {story.source && (
        <p className="text-xs text-slate-600">Kaynak: {story.source}</p>
      )}
    </div>
  );
}

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play().catch(() => {}); }
  }, [playing]);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Progress bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.5}
          value={currentTime}
          onChange={seek}
          className="w-full h-1.5 rounded-full accent-violet-500 cursor-pointer"
          aria-label="Ses konumu"
        />
        <div className="flex justify-between text-xs text-slate-500 font-mono">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={restart}
          aria-label="Başa sar"
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Duraklat" : "Oynat"}
          className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-violet-500 hover:bg-violet-400 text-white transition-colors shrink-0"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        {/* Speed selector */}
        <div className="flex items-center gap-1 flex-wrap">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeSpeed(s)}
              className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                speed === s
                  ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                  : "border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Volume */}
        <div className="ml-auto flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={changeVolume}
            className="w-20 h-1 rounded-full accent-violet-500 cursor-pointer"
            aria-label="Ses seviyesi"
          />
        </div>
      </div>

      <p className="text-center text-xs text-slate-600">Space: oynat/duraklat</p>
    </div>
  );
}

function fmt(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
