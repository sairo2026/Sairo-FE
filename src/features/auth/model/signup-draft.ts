import { useSyncExternalStore } from "react";

const KEY = "sairo.signup.draft";

export type SignupDraft = { name: string; email: string; phone: string };

const EMPTY: SignupDraft = { name: "", email: "", phone: "" };

export function loadSignupDraft(): SignupDraft {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const record = parsed as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : "",
      email: typeof record.email === "string" ? record.email : "",
      phone: typeof record.phone === "string" ? record.phone : "",
    };
  } catch {
    return EMPTY;
  }
}

export function saveSignupDraft(draft: SignupDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    return;
  }
}

export function clearSignupDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
}

const CONTACT_KEY = "sairo.contact.pendingEmail";

export function loadPendingContactEmail(): string {
  try {
    return window.localStorage.getItem(CONTACT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePendingContactEmail(email: string): void {
  try {
    if (email === "") window.localStorage.removeItem(CONTACT_KEY);
    else window.localStorage.setItem(CONTACT_KEY, email);
  } catch {
    return;
  }
}

function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function parseDraft(raw: string): SignupDraft {
  if (raw === "") return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const record = parsed as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : "",
      email: typeof record.email === "string" ? record.email : "",
      phone: typeof record.phone === "string" ? record.phone : "",
    };
  } catch {
    return EMPTY;
  }
}

let cachedRaw = "";
let cachedDraft: SignupDraft = EMPTY;

function readDraftSnapshot(): SignupDraft {
  const raw = readRaw(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDraft = parseDraft(raw);
  }
  return cachedDraft;
}

export function useSignupDraft(): SignupDraft {
  return useSyncExternalStore(subscribeStorage, readDraftSnapshot, () => EMPTY);
}

export function usePendingContactEmail(): string {
  return useSyncExternalStore(
    subscribeStorage,
    () => readRaw(CONTACT_KEY),
    () => "",
  );
}
