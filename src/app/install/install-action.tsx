"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { takeInstallPrompt } from "@/shared/lib/install-prompt";

const standaloneQuery = "(display-mode: standalone)";

function subscribeToDisplayMode(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(standaloneQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isStandalone() {
  return typeof window.matchMedia === "function" && window.matchMedia(standaloneQuery).matches;
}

export function InstallAction() {
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");
  const [installing, setInstalling] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const acceptedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const installedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusStatusAfterInstall = useRef(false);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const standalone = useSyncExternalStore(subscribeToDisplayMode, isStandalone, () => false);

  useEffect(() => {
    if (installed && focusStatusAfterInstall.current) statusRef.current?.focus();
  }, [installed]);

  useEffect(() => {
    const onInstalled = () => {
      focusStatusAfterInstall.current = document.activeElement === buttonRef.current;
      installedRef.current = true;
      if (acceptedTimeout.current) clearTimeout(acceptedTimeout.current);
      setInstalled(true);
      setInstalling(false);
      setAccepted(false);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      if (acceptedTimeout.current) clearTimeout(acceptedTimeout.current);
    };
  }, []);

  if (standalone) {
    return (
      <p role="status" className="text-body font-semibold text-primary">
        설치된 사이로 앱에서 이용 중입니다.
      </p>
    );
  }

  return (
    <>
      {!installed && (
        <button
          ref={buttonRef}
          type="button"
          aria-disabled={installing || accepted}
          aria-busy={installing || accepted}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-6 text-body font-semibold text-white hover:bg-primary-hover aria-disabled:cursor-wait aria-disabled:opacity-80 aria-disabled:hover:bg-primary sm:w-auto"
          onClick={async () => {
            if (installing || accepted) return;
            const event = takeInstallPrompt();
            if (!event) {
              setMessage("Chrome·Edge 주소창의 설치 아이콘이나 메뉴의 앱 설치를 선택해 주세요.");
              return;
            }
            setInstalling(true);
            setMessage("");
            try {
              await event.prompt();
              const choice = await event.userChoice;
              if (choice.outcome === "dismissed") {
                setMessage("나중에 주소창의 설치 아이콘으로 설치할 수 있어요.");
              } else {
                if (!installedRef.current) {
                  setAccepted(true);
                  setMessage(
                    "설치가 진행 중이에요. 완료되지 않으면 브라우저 메뉴를 확인해 주세요.",
                  );
                  acceptedTimeout.current = setTimeout(() => {
                    setAccepted(false);
                    setMessage(
                      "설치가 완료되지 않았다면 브라우저 메뉴에서 앱 설치를 확인해 주세요.",
                    );
                  }, 10000);
                }
              }
            } catch {
              setMessage("설치 창을 열지 못했어요. Chrome·Edge 메뉴의 앱 설치를 선택해 주세요.");
            } finally {
              setInstalling(false);
            }
          }}
        >
          {installing || accepted ? "설치 진행 중" : "PC에 설치하기"}
        </button>
      )}
      <p
        ref={statusRef}
        role="status"
        tabIndex={installed ? -1 : undefined}
        className={message || installed ? "mt-3 break-keep text-body text-ink-2" : "sr-only"}
      >
        {installed ? "설치된 사이로 앱에서 이용할 수 있어요." : message}
      </p>
    </>
  );
}
