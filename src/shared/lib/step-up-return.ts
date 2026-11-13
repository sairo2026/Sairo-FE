const STORAGE_KEY = "sairo-step-up-return";
const VALID_FOR_MS = 15 * 60 * 1000;
const FALLBACK_PATH = "/";

type StoredReturn = { path: string; savedAt: number };

function isInternalPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !path.startsWith("/api/")
  );
}

function readStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberStepUpReturn(path: string, now: number = Date.now()): void {
  const storage = readStorage();
  if (!storage || !isInternalPath(path)) return;
  const value: StoredReturn = { path, savedAt: now };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    return;
  }
}

export function takeStepUpReturn(now: number = Date.now()): string {
  const storage = readStorage();
  if (!storage) return FALLBACK_PATH;
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    storage.removeItem(STORAGE_KEY);
  } catch {
    return FALLBACK_PATH;
  }
  if (raw === null) return FALLBACK_PATH;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return FALLBACK_PATH;
    const { path, savedAt } = parsed as Partial<StoredReturn>;
    if (!isInternalPath(path) || typeof savedAt !== "number") return FALLBACK_PATH;
    if (now - savedAt > VALID_FOR_MS || now < savedAt) return FALLBACK_PATH;
    return path;
  } catch {
    return FALLBACK_PATH;
  }
}
