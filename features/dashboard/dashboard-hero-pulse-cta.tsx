"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Organic pulse + ripples: inviting “moment before something important” — not a flat sine wave. */
export function DashboardHeroPulseCta({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <span className="inline-flex">{children}</span>;
  }

  const softOut = [0.33, 0, 0.19, 1] as const;
  const rippleDuration = 2.85;
  const rippleDelay = 1.22;

  return (
    <div className="relative inline-flex items-center justify-center py-3">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[-10px] z-0 rounded-full border-2 border-[var(--accent)]/30"
        initial={false}
        animate={{ scale: [1, 1.38], opacity: [0.5, 0] }}
        transition={{
          duration: rippleDuration,
          repeat: Infinity,
          ease: softOut,
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[-10px] z-0 rounded-full border border-[var(--accent)]/25"
        initial={false}
        animate={{ scale: [1, 1.42], opacity: [0.38, 0] }}
        transition={{
          duration: rippleDuration,
          repeat: Infinity,
          ease: softOut,
          delay: rippleDelay,
        }}
      />

      <motion.div
        className="relative z-10 inline-flex will-change-transform rounded-full"
        initial={false}
        animate={{
          scale: [1, 1.026, 1.009, 1.032, 1.005, 1],
          boxShadow: [
            "0 14px 34px -10px color-mix(in srgb, var(--accent) 38%, transparent)",
            "0 18px 44px -8px color-mix(in srgb, var(--accent) 52%, transparent)",
            "0 15px 36px -10px color-mix(in srgb, var(--accent) 42%, transparent)",
            "0 22px 52px -6px color-mix(in srgb, var(--accent) 58%, transparent)",
            "0 16px 38px -10px color-mix(in srgb, var(--accent) 44%, transparent)",
            "0 14px 34px -10px color-mix(in srgb, var(--accent) 38%, transparent)",
          ],
        }}
        transition={{
          duration: 3.65,
          repeat: Infinity,
          ease: [0.42, 0, 0.58, 1],
          times: [0, 0.14, 0.34, 0.52, 0.76, 1],
        }}
        whileHover={{
          scale: 1.045,
          transition: { type: "spring", stiffness: 380, damping: 22 },
        }}
        whileTap={{ scale: 0.97 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
