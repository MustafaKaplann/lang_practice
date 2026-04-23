const STORAGE_KEY = "awl-settings";

export interface Settings {
  speech: {
    enabled: boolean;
    voice: string | null;
    rate: number;
    autoPlayInGames: boolean;
  };
}

function getDefault(): Settings {
  return {
    speech: { enabled: true, voice: null, rate: 0.9, autoPlayInGames: false },
  };
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return getDefault();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefault();
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const def = getDefault();
    return { speech: { ...def.speech, ...(parsed.speech ?? {}) } };
  } catch {
    return getDefault();
  }
}

export function saveSettings(update: { speech?: Partial<Settings["speech"]> }): void {
  const current = getSettings();
  const updated: Settings = {
    speech: { ...current.speech, ...(update.speech ?? {}) },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // storage full — ignore
  }
}

export function resetSettings(): void {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}
