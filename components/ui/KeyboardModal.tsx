"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const SHORTCUTS = [
  {
    mode: "Flashcard",
    items: [
      { key: "Space", desc: "Kartı çevir" },
      { key: "→", desc: "Biliyorum" },
      { key: "←", desc: "Bilmiyorum" },
    ],
  },
  {
    mode: "Çoktan Seçmeli Quiz",
    items: [
      { key: "1–4", desc: "Seçenek seç" },
      { key: "Enter", desc: "Sonraki soru" },
    ],
  },
  {
    mode: "Boşluk Doldurma",
    items: [{ key: "Enter", desc: "Cevapla / Sonraki" }],
  },
  {
    mode: "Genel",
    items: [
      { key: "?", desc: "Bu yardım ekranı" },
      { key: "Esc", desc: "Modalı kapat" },
    ],
  },
];

export default function KeyboardModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Klavye kısayolları"
        >
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="relative bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-semibold text-slate-100">
                Klavye Kısayolları
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {SHORTCUTS.map((sec) => (
                <div key={sec.mode}>
                  <div className="text-xs uppercase tracking-wider text-emerald-400 mb-2">
                    {sec.mode}
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-800/60">
                      {sec.items.map((s) => (
                        <tr key={s.key}>
                          <td className="py-1.5 pr-4 w-28">
                            <kbd className="inline-flex items-center justify-center rounded bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 text-xs font-mono">
                              {s.key}
                            </kbd>
                          </td>
                          <td className="py-1.5 text-slate-300">{s.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
