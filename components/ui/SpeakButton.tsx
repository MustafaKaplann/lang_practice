"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { speak, isSupported } from "@/lib/speech";
import { getSettings } from "@/lib/settings";

interface Props {
  text: string;
  size?: "sm" | "md" | "lg";
  rate?: number;
  className?: string;
}

const ICON = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };
const PAD = { sm: "p-1", md: "p-1.5", lg: "p-2" };

export default function SpeakButton({ text, size = "md", rate, className = "" }: Props) {
  const [ready, setReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setReady(isSupported() && getSettings().speech.enabled);
  }, []);

  if (!ready) return null;

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (speaking) return;
    setSpeaking(true);
    const s = getSettings().speech;
    try {
      await speak(text, { rate: rate ?? s.rate, voice: s.voice ?? undefined });
    } finally {
      setSpeaking(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Telaffuzu dinle: ${text}`}
      aria-pressed={speaking}
      className={`inline-flex items-center justify-center rounded-md transition-colors text-slate-400 hover:text-emerald-400 hover:bg-slate-800 ${PAD[size]} ${className}`}
    >
      {speaking ? (
        <SoundWave size={size} />
      ) : (
        <Volume2 className={ICON[size]} aria-hidden />
      )}
    </button>
  );
}

function SoundWave({ size }: { size: "sm" | "md" | "lg" }) {
  const pxH = size === "sm" ? 12 : size === "md" ? 14 : 18;
  return (
    <span
      className="inline-flex items-end gap-px"
      style={{ height: pxH }}
      aria-hidden
    >
      {(["60%", "100%", "70%"] as const).map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-emerald-400 animate-pulse"
          style={{ height: h, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
