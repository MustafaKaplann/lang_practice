export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  voice?: string | null;
}

// Ordered by preference — first match wins
const PRIORITY_VOICES = [
  "Google US English",
  "Google UK English Female",
  "Google UK English Male",
  "Microsoft Aria",
  "Microsoft Guy",
  "Microsoft Jenny",
  "Microsoft Davis",
  "Samantha",
  "Daniel",
  "Karen",
  "Moira",
];

const BLACKLISTED = ["eSpeak", "Fred"];

let _initPromise: Promise<void> | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;
let cachedVoiceName: string | null | undefined = undefined;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let keepAliveInterval: number | null = null;

export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function initSpeech(): Promise<void> {
  if (!isSupported()) return Promise.resolve();
  if (_initPromise) return _initPromise;

  _initPromise = new Promise<void>((resolve) => {
    if (window.speechSynthesis.getVoices().length > 0) {
      resolve();
      return;
    }
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    // Fallback: some browsers never fire voiceschanged
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve();
    }, 2000);
  });

  return _initPromise;
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (!isSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => {
      if (v.lang.toLowerCase().startsWith("tr")) return false;
      if (BLACKLISTED.some((b) => v.name.includes(b))) return false;
      return v.lang.startsWith("en");
    })
    .sort((a, b) => {
      const rank = (v: SpeechSynthesisVoice): number => {
        const pIdx = PRIORITY_VOICES.findIndex((p) => v.name.includes(p));
        if (pIdx !== -1) return pIdx;             // 0–10: high-quality named voices
        if (!v.localService) return 20;            // cloud voices
        if (v.lang === "en-US") return 30;
        if (v.lang.startsWith("en")) return 40;
        return 50;
      };
      return rank(a) - rank(b);
    });
}

function getSelectedVoice(requestedName?: string | null): SpeechSynthesisVoice | null {
  const name = requestedName ?? null;
  if (name === cachedVoiceName && cachedVoice !== null) return cachedVoice;

  // Name changed or cache empty — recompute
  cachedVoiceName = name;
  cachedVoice = null;

  const voices = getEnglishVoices();
  if (name) {
    const match = voices.find((v) => v.name === name);
    if (match) { cachedVoice = match; return match; }
  }
  cachedVoice = voices[0] ?? null;
  return cachedVoice;
}

export function invalidateVoiceCache(): void {
  cachedVoice = null;
  cachedVoiceName = undefined;
}

export async function speak(text: string, options?: SpeechOptions): Promise<void> {
  if (!isSupported()) return;

  // Stop any active keepalive timer
  if (keepAliveInterval !== null) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }

  // Cancel current speech; Chrome needs a short gap or the new utterance gets dropped
  if (currentUtterance || window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
    await new Promise<void>((r) => setTimeout(r, 50));
  }

  return new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    // Both lang AND voice must be set — Chrome on Turkish system can override voice with system lang
    utterance.lang = "en-US";
    utterance.voice = getSelectedVoice(options?.voice);
    utterance.rate = options?.rate ?? 0.9;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      // Chrome keepalive: synthesis silently stops after ~15s without this
      keepAliveInterval = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(keepAliveInterval!);
          keepAliveInterval = null;
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10000);
    };

    utterance.onend = () => {
      if (keepAliveInterval !== null) { clearInterval(keepAliveInterval); keepAliveInterval = null; }
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (e) => {
      if (keepAliveInterval !== null) { clearInterval(keepAliveInterval); keepAliveInterval = null; }
      currentUtterance = null;
      // "interrupted" / "canceled" are expected when a new speak() cancels the previous one
      if (e.error === "interrupted" || e.error === "canceled") resolve();
      else reject(e);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

export function cancel(): void {
  if (!isSupported()) return;
  if (keepAliveInterval !== null) { clearInterval(keepAliveInterval); keepAliveInterval = null; }
  currentUtterance = null;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return isSupported() && window.speechSynthesis.speaking;
}

// Dev console helper — tree-shaken in production build
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as Record<string, unknown>).__speech = {
    listVoices: () =>
      console.table(
        window.speechSynthesis.getVoices().map((v) => ({
          name: v.name,
          lang: v.lang,
          localService: v.localService,
          default: v.default,
        }))
      ),
    testVoice: (name: string) =>
      speak("The quick brown fox jumps over the lazy dog.", { voice: name }),
    current: () => cachedVoice?.name ?? "(none)",
  };
}
