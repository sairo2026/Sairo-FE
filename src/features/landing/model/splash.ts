export const SPLASH_STORAGE_KEY = "sairo-splash-seen";
export const SPLASH_DURATION_MS = 900;

export type SplashPhase = "play" | "seen";

export function markSplashPhase(storageKey: string): void {
  let phase = "seen";
  try {
    const isMotionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSeen = window.sessionStorage.getItem(storageKey) !== null;
    window.sessionStorage.setItem(storageKey, "1");
    if (!isMotionReduced && !isSeen) phase = "play";
  } catch {
    phase = "seen";
  }
  document.documentElement.dataset.splash = phase;
}

export const SPLASH_BOOT_SCRIPT = `(${markSplashPhase.toString()})(${JSON.stringify(SPLASH_STORAGE_KEY)})`;

const listeners = new Set<() => void>();

export function subscribeSplashPhase(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readSplashPhase(): SplashPhase {
  return document.documentElement.dataset.splash === "play" ? "play" : "seen";
}

export function readServerSplashPhase(): SplashPhase {
  return "play";
}

export function finishSplash(): void {
  if (document.documentElement.dataset.splash === "seen") return;
  document.documentElement.dataset.splash = "seen";
  for (const listener of listeners) listener();
}
