"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const standaloneQuery = "(display-mode: standalone)";

function subscribeToDisplayMode(onChange: () => void) {
  const media = window.matchMedia(standaloneQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isStandalone() {
  return window.matchMedia(standaloneQuery).matches;
}

export function InstallAction() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [promptError, setPromptError] = useState(false);
  const standalone = useSyncExternalStore(subscribeToDisplayMode, isStandalone, () => false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || standalone) {
    return (
      <p role="status" className="text-body font-semibold text-primary">
        설치된 사이로 앱에서 이용 중입니다.
      </p>
    );
  }

  if (!prompt) {
    return (
      <p className="text-body text-ink-2" role={promptError ? "alert" : undefined}>
        {promptError ? "설치 창을 열지 못했습니다. " : null}
        Chrome 또는 Edge 주소창의 설치 아이콘이나 브라우저 메뉴의 <strong>앱 설치</strong>를
        선택하세요.
      </p>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-6 text-body font-semibold text-white hover:bg-primary-hover"
      onClick={async () => {
        const event = prompt;
        setPrompt(null);
        try {
          await event.prompt();
          await event.userChoice;
        } catch {
          setPromptError(true);
        }
      }}
    >
      PC에 설치하기
    </button>
  );
}
