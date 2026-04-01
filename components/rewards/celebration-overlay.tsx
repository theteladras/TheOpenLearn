"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Zap } from "lucide-react";
import { useEffect } from "react";

export type CelebrationKind = "task" | "phase" | "roadmap";

type Props = {
  open: boolean;
  onClose: () => void;
  kind: CelebrationKind;
  xpGained: number;
  coinsEarned: number;
  title: string;
  subtitle?: string;
};

export function CelebrationOverlay({
  open,
  onClose,
  kind,
  xpGained,
  coinsEarned,
  title,
  subtitle,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(
      () => onClose(),
      kind === "roadmap" ? 3200 : 2600,
    );
    return () => window.clearTimeout(t);
  }, [open, onClose, kind]);

  const Icon = kind === "roadmap" ? Trophy : kind === "phase" ? Sparkles : Zap;
  const iconClass =
    kind === "roadmap"
      ? "text-amber-400"
      : kind === "phase"
        ? "text-fuchsia-400"
        : "text-[var(--accent)]";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className="relative max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] px-8 py-10 text-center shadow-2xl"
            initial={{ scale: 0.85, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {Array.from({ length: 14 }, (_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-2 w-2 rounded-full bg-[var(--accent)]"
                  style={{ filter: "blur(0.5px)" }}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.4, 1.2, 0.8],
                    y: [0, -40 - (i % 5) * 12],
                    x: [(i % 7) * 14 - 42],
                  }}
                  transition={{
                    duration: 0.9 + (i % 4) * 0.1,
                    ease: "easeOut",
                    delay: 0.05 + i * 0.03,
                  }}
                />
              ))}
            </div>
            <motion.div
              className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)]"
              animate={{
                rotate: [0, -6, 6, 0],
                scale: [1, 1.08, 1],
              }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <Icon className={`h-9 w-9 ${iconClass}`} />
            </motion.div>
            <motion.h2
              className="relative text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {title}
            </motion.h2>
            {subtitle && (
              <p className="relative mt-2 text-sm text-[var(--muted)]">
                {subtitle}
              </p>
            )}
            <motion.div
              className="relative mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-700 dark:text-emerald-300">
                +{xpGained} XP
              </span>
              {coinsEarned > 0 && (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-800 dark:text-amber-200">
                  +{coinsEarned} coins
                </span>
              )}
            </motion.div>
            <button
              type="button"
              className="relative mt-8 text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
              onClick={onClose}
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
