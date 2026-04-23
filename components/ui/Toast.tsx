"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Trophy, Info, CheckCircle } from "lucide-react";
import type { ToastOptions, ToastType } from "@/lib/toast";

interface ToastItem extends ToastOptions {
  id: number;
}

let nextId = 0;

const STYLES: Record<ToastType, string> = {
  success: "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
  info: "bg-slate-800 border-slate-700 text-slate-200",
  achievement: "bg-amber-500/15 border-amber-500/40 text-amber-200",
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />,
  info: <Info className="h-4 w-4 shrink-0 text-slate-400" />,
  achievement: <Trophy className="h-4 w-4 shrink-0 text-amber-400" />,
};

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const ms = item.duration ?? 3000;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(onDismiss, ms);
    return () => clearTimeout(t);
  }, [paused, ms, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: "tween", duration: 0.25 }}
      className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg w-72 ${STYLES[item.type]}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {ICONS[item.type]}
      <p className="flex-1 text-sm leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Kapat"
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      const opts = (e as CustomEvent<ToastOptions>).detail;
      setToasts((prev) => [...prev.slice(-4), { ...opts, id: ++nextId }]);
    }
    window.addEventListener("awl-toast", handler);
    return () => window.removeEventListener("awl-toast", handler);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast item={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
