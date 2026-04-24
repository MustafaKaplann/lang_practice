"use client";

import Link from "next/link";
import { Flame, BookOpen, Keyboard, Settings, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getProgress } from "@/lib/progress";
import type { Progress } from "@/lib/types";
import KeyboardModal from "@/components/ui/KeyboardModal";

export default function Header() {
  const [streak, setStreak] = useState(0);
  const [kbOpen, setKbOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setStreak(getProgress().streak.current);

    function onUpdate(e: Event) {
      const p = (e as CustomEvent<Progress>).detail;
      setStreak(p.streak.current);
    }
    window.addEventListener("awl-progress-updated", onUpdate);
    return () => window.removeEventListener("awl-progress-updated", onUpdate);
  }, []);

  useEffect(() => {
    fetch("/api/admin/me").then((r) => setIsAdmin(r.ok)).catch(() => {});
  }, []);

  const openKb = useCallback(() => setKbOpen(true), []);
  const closeKb = useCallback(() => setKbOpen(false), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "?") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      setKbOpen((prev) => !prev);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const flameActive = streak > 0;
  const flamePulse = streak >= 7;

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-heading text-xl font-bold text-emerald-400"
          >
            AWL Master
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            {flameActive ? (
              <div
                className="flex items-center gap-1.5 text-orange-400"
                title={`${streak} günlük seri`}
              >
                {flamePulse ? (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Flame className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <Flame className="h-4 w-4" />
                )}
                <span className="font-medium">{streak}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-600" title="Henüz seri yok">
                <Flame className="h-4 w-4" />
              </div>
            )}
            <Link
              href="/dictionary"
              className="flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span>Sözlük</span>
            </Link>
            <button
              type="button"
              onClick={openKb}
              aria-label="Klavye kısayolları"
              title="Klavye kısayolları (?)"
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <Link
              href="/settings"
              aria-label="Ayarlar"
              title="Ayarlar"
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                aria-label="Admin Paneli"
                title="Admin Paneli"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
              </Link>
            )}
          </nav>
        </div>
      </header>
      <KeyboardModal open={kbOpen} onClose={closeKb} />
    </>
  );
}
