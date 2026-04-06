"use client";

import Image from "next/image";
import { useLayoutEffect, useState } from "react";

const STORAGE_KEY = "openlearn-splash-dismissed";
const MIN_MS = 1000;
const FADE_MS = 420;

export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "off">("show");

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;

    if (document.documentElement.classList.contains("splash-skip")) {
      queueMicrotask(() => setPhase("off"));
      return;
    }

    let cancelled = false;
    const start = Date.now();

    const finish = () => {
      if (cancelled) return;
      setPhase("fade");
      window.setTimeout(() => {
        if (cancelled) return;
        setPhase("off");
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* private mode */
        }
      }, FADE_MS);
    };

    const runAfterLoad = () => {
      const wait = Math.max(0, MIN_MS - (Date.now() - start));
      window.setTimeout(finish, wait);
    };

    if (document.readyState === "complete") {
      runAfterLoad();
    } else {
      window.addEventListener("load", runAfterLoad, { once: true });
    }

    const maxWait = window.setTimeout(runAfterLoad, 3200);
    return () => {
      cancelled = true;
      window.clearTimeout(maxWait);
    };
  }, []);

  if (phase === "off") return null;

  return (
    <div
      data-openlearn-splash
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[var(--background)] px-6 transition-[opacity,visibility] duration-[420ms] ease-out ${
        phase === "fade"
          ? "pointer-events-none opacity-0 invisible"
          : "opacity-100 visible"
      }`}
      aria-busy={phase === "show"}
      aria-live="polite"
      aria-label="Loading"
    >
      <Image
        src="/logo.png"
        alt=""
        width={200}
        height={200}
        className="h-auto w-[min(12rem,52vw)] max-w-[200px] object-contain drop-shadow-[0_12px_40px_rgba(109,77,243,0.22)] dark:drop-shadow-[0_12px_48px_rgba(157,139,255,0.18)]"
        priority
      />
      <div
        className="h-1 w-28 overflow-hidden rounded-full bg-[var(--border)]"
        aria-hidden
      >
        <div
          className="h-full w-1/3 rounded-full bg-[var(--accent)]"
          style={{
            animation: "openlearn-splash-bar 1.1s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}
