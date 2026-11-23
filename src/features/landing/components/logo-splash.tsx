"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import {
  SPLASH_BOOT_SCRIPT,
  SPLASH_DURATION_MS,
  finishSplash,
  readServerSplashPhase,
  readSplashPhase,
  subscribeSplashPhase,
} from "../model/splash";

const DISMISS_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function LogoSplash() {
  useServerInsertedHTML(() => (
    <script id="sairo-splash-boot" dangerouslySetInnerHTML={{ __html: SPLASH_BOOT_SCRIPT }} />
  ));
  const phase = useSyncExternalStore(subscribeSplashPhase, readSplashPhase, readServerSplashPhase);

  useEffect(() => {
    if (phase !== "play") return;
    const timer = window.setTimeout(finishSplash, SPLASH_DURATION_MS);
    for (const name of DISMISS_EVENTS) {
      window.addEventListener(name, finishSplash, { passive: true });
    }
    return () => {
      window.clearTimeout(timer);
      for (const name of DISMISS_EVENTS) window.removeEventListener(name, finishSplash);
    };
  }, [phase]);

  if (phase !== "play") return null;
  return (
    <div className="logo-splash" aria-hidden="true" data-testid="logo-splash">
      <BrandLogo variant="vertical" className="logo-splash-mark w-40 sm:w-48" />
    </div>
  );
}
