"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Info, RotateCcw, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getEnglishVoices, initSpeech, invalidateVoiceCache, isSupported, speak } from "@/lib/speech";
import { getSettings, saveSettings } from "@/lib/settings";
import type { Settings } from "@/lib/settings";

const PROGRESS_KEYS = [
  "awl-progress",
  "awl-settings",
  "awl-celebrated-sublists",
  "awl-hint-dismissed",
  "srs-migrated",
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechOk, setSpeechOk] = useState(true);
  const [testing, setTesting] = useState(false);
  const [resetModal, setResetModal] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    const ok = isSupported();
    setSpeechOk(ok);
    if (ok) {
      initSpeech().then(() => setVoices(getEnglishVoices()));
    }
  }, []);

  function update(patch: Partial<Settings["speech"]>) {
    if (patch.voice !== undefined) invalidateVoiceCache();
    saveSettings({ speech: patch });
    setSettings(getSettings());
  }

  async function testVoice(name: string) {
    if (testing) return;
    setTesting(true);
    try {
      await speak("The quick brown fox jumps over the lazy dog.", { voice: name, rate: settings?.speech.rate ?? 0.9 });
    } finally {
      setTesting(false);
    }
  }

  async function testCurrent() {
    if (!settings || testing) return;
    setTesting(true);
    try {
      await speak("The quick brown fox jumps over the lazy dog.", { rate: settings.speech.rate, voice: settings.speech.voice ?? undefined });
    } finally {
      setTesting(false);
    }
  }

  function handleReset() {
    PROGRESS_KEYS.forEach((k) => localStorage.removeItem(k));
    setResetModal(false);
    window.location.href = "/";
  }

  if (!settings) return <div className="text-slate-400">Yükleniyor…</div>;

  const effectiveVoice = settings.speech.voice ?? voices[0]?.name ?? null;

  return (
    <div className="space-y-8 max-w-2xl">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-400">
        <ChevronLeft className="h-4 w-4" /> Ana sayfa
      </Link>
      <h1 className="font-heading text-2xl font-bold">Ayarlar</h1>

      {/* Speech */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-5">
        <h2 className="font-heading text-lg font-semibold">Ses ve Telaffuz</h2>

        {!speechOk && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-300">
            Tarayıcın ses sentezini desteklemiyor. Telaffuz özellikleri kullanılamaz.
          </div>
        )}

        <Toggle
          label="Telaffuz sesini etkinleştir"
          checked={settings.speech.enabled}
          onChange={(v) => update({ enabled: v })}
          disabled={!speechOk}
        />

        {speechOk && settings.speech.enabled && (
          <>
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-300">Ses</div>
              {voices.length === 0 ? (
                <p className="text-sm text-slate-500">Sesler yükleniyor…</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {voices.map((v) => (
                    <div key={v.name} className="flex items-center gap-2">
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <input
                          type="radio"
                          name="voice"
                          value={v.name}
                          checked={effectiveVoice === v.name}
                          onChange={() => update({ voice: v.name })}
                          className="accent-emerald-500 shrink-0"
                        />
                        <span className="text-sm text-slate-300 truncate">{v.name || v.lang} ({v.lang})</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => testVoice(v.name)}
                        className="shrink-0 p-1 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                        aria-label="Bu sesi dene"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-300">Hız</div>
                <span className="text-sm text-slate-400 font-mono">{settings.speech.rate.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="0.5" max="1.5" step="0.1"
                  value={settings.speech.rate}
                  onChange={(e) => update({ rate: parseFloat(e.target.value) })}
                  className="flex-1 accent-emerald-500"
                />
                <button
                  type="button"
                  onClick={testCurrent}
                  disabled={testing}
                  className="text-xs rounded-lg border border-slate-700 bg-slate-900 text-slate-300 px-3 py-1.5 hover:border-slate-600 disabled:opacity-50 transition-colors"
                >
                  Test Et
                </button>
              </div>
            </div>

            <Toggle
              label="Oyun sırasında otomatik oynat"
              description="Flashcard veya Akıllı Tekrar kartı gösterilince kelime otomatik okunur."
              checked={settings.speech.autoPlayInGames}
              onChange={(v) => update({ autoPlayInGames: v })}
            />
          </>
        )}
      </section>

      {/* Data */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold">Veri Yönetimi</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 text-slate-600 px-4 py-2 text-sm cursor-not-allowed"
          >
            İlerlememi Dışa Aktar (Yakında)
          </button>
          <button
            type="button"
            onClick={() => setResetModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-4 py-2 text-sm hover:bg-red-500/20 transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> İlerlememi Sıfırla
          </button>
        </div>
      </section>

      {/* About */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-3">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Info className="h-5 w-5 text-slate-400" /> Hakkında
        </h2>
        <p className="text-sm text-slate-400">
          <strong className="text-slate-300">AWL Master</strong> — YDS ve YÖKDİL sınavlarına hazırlananlar için
          570 Academic Word List kelimesini pekiştirme platformu. Tüm veriler cihazınızda saklanır.
        </p>
        <p className="text-sm text-slate-500">Kelime listesi: Coxhead (2000) Academic Word List.</p>
      </section>

      {/* Reset confirmation modal */}
      <AnimatePresence>
        {resetModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setResetModal(false)} />
            <motion.div
              className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="font-heading text-lg font-bold text-red-400">İlerlemeni Sıfırla</h3>
              <p className="text-sm text-slate-300">
                Tüm kelime ilerlemen, XP, seri ve SRS verilerin silinecek. Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResetModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 text-slate-300 py-2 text-sm hover:border-slate-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 rounded-lg bg-red-500 text-white py-2 text-sm font-medium hover:bg-red-400 transition-colors"
                >
                  Sıfırla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({
  label, description, checked, onChange, disabled = false,
}: {
  label: string; description?: string; checked: boolean;
  onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer select-none ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => { if (!disabled) onChange(e.target.checked); }}
          disabled={disabled}
        />
        <div className={`w-10 h-6 rounded-full transition-colors ${checked && !disabled ? "bg-emerald-500" : "bg-slate-700"}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked && !disabled ? "translate-x-4" : ""}`} />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-300">{label}</div>
        {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
      </div>
    </label>
  );
}
