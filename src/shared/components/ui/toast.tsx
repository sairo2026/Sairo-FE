"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type ToastTone = "info" | "success" | "error";
export type ToastItem = { id: number; tone: ToastTone; message: string };

type ToastApi = { showToast: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 5000;

const toneClass: Record<ToastTone, string> = {
  info: "border-primary-line bg-primary-soft text-primary",
  success: "border-tag-green bg-tag-green text-tag-green-ink",
  error: "border-tag-red bg-tag-red text-tag-red-ink",
};

/** 오류 토스트만으로 중요한 오류를 끝내지 않는다. 해당 폼·영역에도 오류를 함께 표시한다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId.current++;
      setItems((current) => [...current, { id, tone, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-control border px-4 py-3 text-caption font-medium shadow-popup",
              toneClass[item.tone],
            )}
          >
            <span>{item.message}</span>
            <button
              type="button"
              aria-label="알림 닫기"
              onClick={() => dismiss(item.id)}
              className="text-current"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast는 ToastProvider 안에서만 쓸 수 있다.");
  return context;
}
