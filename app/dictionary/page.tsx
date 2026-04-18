"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  Layers,
  Quote,
  Search,
  X,
} from "lucide-react";
import type { Word } from "@/lib/types";
import { getProgress, markKnown, markUnknown } from "@/lib/progress";
import { highlightWord } from "@/lib/highlight";

type KnownFilter = "all" | "known" | "unknown";
type Status = "loading" | "error" | "ready";

const SUBLISTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function DictionaryPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [allWords, setAllWords] = useState<Word[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSublists, setSelectedSublists] = useState<Set<number>>(
    new Set(SUBLISTS),
  );
  const [knownFilter, setKnownFilter] = useState<KnownFilter>("all");
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch("/data/words.json")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<Word[]>;
      })
      .then((d) => {
        if (!cancelled) {
          setAllWords(d);
          setKnownIds(new Set(getProgress().knownWords));
          setStatus("ready");
        }
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce search
  useEffect(() => {
    const h = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 200);
    return () => clearTimeout(h);
  }, [searchInput]);

  const filtered = useMemo(() => {
    return allWords.filter((w) => {
      if (w.sublist !== undefined && !selectedSublists.has(w.sublist)) return false;
      if (w.sublist === undefined && selectedSublists.size !== SUBLISTS.length) return false;
      if (knownFilter === "known" && !knownIds.has(w.id)) return false;
      if (knownFilter === "unknown" && knownIds.has(w.id)) return false;
      if (searchQuery) {
        const hay = `${w.word} ${w.meaningTr}`.toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });
  }, [allWords, selectedSublists, knownFilter, searchQuery, knownIds]);

  const selectedWord = useMemo(
    () => (selectedWordId !== null ? allWords.find((w) => w.id === selectedWordId) ?? null : null),
    [selectedWordId, allWords],
  );

  const toggleSublist = (n: number) => {
    const next = new Set(selectedSublists);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    if (next.size === 0) next.add(n);
    setSelectedSublists(next);
  };
  const toggleAllSublists = () =>
    setSelectedSublists(
      selectedSublists.size === SUBLISTS.length ? new Set([1]) : new Set(SUBLISTS),
    );

  const toggleKnown = useCallback(
    (id: number) => {
      if (knownIds.has(id)) {
        markUnknown(id);
        setKnownIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        markKnown(id);
        setKnownIds((prev) => new Set(prev).add(id));
      }
    },
    [knownIds],
  );

  const resetFilters = () => {
    setSearchInput("");
    setSelectedSublists(new Set(SUBLISTS));
    setKnownFilter("all");
  };

  if (status === "loading") return <div className="text-slate-400">Yükleniyor…</div>;
  if (status === "error")
    return <div className="text-red-400">Kelimeler yüklenemedi.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400"
        >
          <ChevronLeft className="h-4 w-4" /> Ana sayfa
        </Link>
      </div>

      <h1 className="font-heading text-2xl font-bold">Kelime Sözlüğü</h1>

      <FiltersBar
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        selectedSublists={selectedSublists}
        toggleSublist={toggleSublist}
        toggleAllSublists={toggleAllSublists}
        knownFilter={knownFilter}
        setKnownFilter={setKnownFilter}
        count={filtered.length}
        total={allWords.length}
      />

      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <WordList
            words={filtered}
            knownIds={knownIds}
            selectedId={selectedWordId}
            onSelect={setSelectedWordId}
            onReset={resetFilters}
          />
        </div>

        {/* Desktop detail */}
        <div className="hidden md:block md:col-span-2">
          <div className="sticky top-24">
            {selectedWord ? (
              <WordDetail
                word={selectedWord}
                known={knownIds.has(selectedWord.id)}
                onToggleKnown={() => toggleKnown(selectedWord.id)}
              />
            ) : (
              <DetailPlaceholder />
            )}
          </div>
        </div>
      </div>

      {/* Mobile modal */}
      <AnimatePresence>
        {selectedWord && (
          <MobileSheet
            key="sheet"
            word={selectedWord}
            known={knownIds.has(selectedWord.id)}
            onToggleKnown={() => toggleKnown(selectedWord.id)}
            onClose={() => setSelectedWordId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FiltersBar({
  searchInput,
  setSearchInput,
  selectedSublists,
  toggleSublist,
  toggleAllSublists,
  knownFilter,
  setKnownFilter,
  count,
  total,
}: {
  searchInput: string;
  setSearchInput: (s: string) => void;
  selectedSublists: Set<number>;
  toggleSublist: (n: number) => void;
  toggleAllSublists: () => void;
  knownFilter: KnownFilter;
  setKnownFilter: (f: KnownFilter) => void;
  count: number;
  total: number;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="search"
          aria-label="Kelime veya anlam ara"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Kelime veya anlam ara…"
          className="w-full rounded-lg bg-slate-900 border border-slate-800 text-slate-100 pl-9 pr-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleAllSublists}
          className={pillCls(selectedSublists.size === SUBLISTS.length)}
          title="Tüm sublist'ler"
        >
          Tümü
        </button>
        {SUBLISTS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={selectedSublists.has(n)}
            onClick={() => toggleSublist(n)}
            className={pillCls(selectedSublists.has(n))}
            title={`Sublist ${n}`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(["all", "known", "unknown"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={knownFilter === f}
              onClick={() => setKnownFilter(f)}
              className={pillCls(knownFilter === f)}
            >
              {f === "all" ? "Tümü" : f === "known" ? "Bildiklerim" : "Bilmediklerim"}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-400">
          <span className="text-slate-200 font-medium">{count}</span> / {total} kelime
        </div>
      </div>
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

function WordList({
  words,
  knownIds,
  selectedId,
  onSelect,
  onReset,
}: {
  words: Word[];
  knownIds: Set<number>;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onReset: () => void;
}) {
  if (words.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center space-y-3">
        <p className="text-slate-400">Eşleşen kelime yok.</p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300"
        >
          Filtreleri sıfırla
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden md:max-h-[70vh] md:overflow-y-auto">
      <ul className="divide-y divide-slate-800/60">
        {words.map((w) => {
          const isSelected = selectedId === w.id;
          const isKnown = knownIds.has(w.id);
          return (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onSelect(w.id)}
                aria-current={isSelected ? "true" : undefined}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${
                  isSelected
                    ? "bg-emerald-500/10 border-l-2 border-emerald-500"
                    : "border-l-2 border-transparent hover:bg-slate-900"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-semibold text-slate-100 truncate">
                      {w.word}
                    </span>
                    {isKnown && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {truncate(w.meaningTr, 40)}
                  </div>
                </div>
                {w.sublist !== undefined && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                    S{w.sublist}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function DetailPlaceholder() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center space-y-3">
      <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
      <p className="text-slate-400">Bir kelime seç.</p>
    </div>
  );
}

function WordDetail({
  word,
  known,
  onToggleKnown,
}: {
  word: Word;
  known: boolean;
  onToggleKnown: () => void;
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
      <header className="space-y-2">
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-100">
          {word.word}
        </h2>
        <div className="flex flex-wrap gap-2">
          {word.sublist !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
              <Layers className="h-3 w-3" /> Sublist {word.sublist}
            </span>
          )}
          {known ? (
            <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
              <CheckCircle2 className="h-3 w-3" /> Biliyorum
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
              Henüz öğrenilmedi
            </span>
          )}
        </div>
      </header>

      <section className="rounded-lg bg-slate-900 border border-slate-800 p-4">
        <div className="text-xs uppercase tracking-wider text-emerald-400 mb-1.5">
          Türkçe Anlam
        </div>
        <p className="text-lg text-slate-100">{word.meaningTr}</p>
      </section>

      <section>
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">
          English Definition
        </div>
        <p className="text-sm text-slate-400">{word.meaningEn}</p>
      </section>

      {word.exampleEn && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2">
          <div className="flex gap-2">
            <Quote className="h-4 w-4 text-slate-500 shrink-0 mt-1" />
            <p className="italic text-slate-200">
              {highlightWord(word.exampleEn, word.word).map((s, i) =>
                s.highlight ? (
                  <strong key={i} className="text-emerald-400 not-italic font-bold">
                    {s.text}
                  </strong>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )}
            </p>
          </div>
          {word.exampleTr && (
            <p className="text-sm italic text-slate-500 pl-6">{word.exampleTr}</p>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={onToggleKnown}
          className={
            known
              ? "inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 px-4 py-2 text-sm font-medium hover:border-slate-600"
              : "inline-flex items-center gap-2 rounded-lg bg-emerald-500 text-slate-950 px-4 py-2 text-sm font-medium hover:bg-emerald-400"
          }
        >
          <Check className="h-4 w-4" />
          {known ? "Biliyorum (kaldır)" : "Biliyorum"}
        </button>
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-4 py-2 text-sm font-medium hover:border-slate-600"
        >
          <Layers className="h-4 w-4" /> Flashcard'da Gör
        </Link>
      </div>
    </article>
  );
}

function MobileSheet({
  word,
  known,
  onToggleKnown,
  onClose,
}: {
  word: Word;
  known: boolean;
  onToggleKnown: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, [word.id]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="md:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <motion.div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        aria-hidden="true"
      />
      <motion.div
        className="relative w-full bg-slate-950 border-t border-slate-800 rounded-t-2xl max-h-[85vh] overflow-y-auto"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "tween", duration: 0.25 }}
      >
        <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-slate-950/95 backdrop-blur border-b border-slate-800">
          <div className="font-heading font-semibold text-slate-100">Detay</div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-800 text-slate-300 hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <WordDetail word={word} known={known} onToggleKnown={onToggleKnown} />
        </div>
      </motion.div>
    </div>
  );
}
