"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Award, Sparkles, Trophy, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
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
  /** Level range after XP from this celebration (no upper bound). */
  levelUp?: { from: number; to: number } | null;
};

export function CelebrationOverlay({
  open,
  onClose,
  kind,
  xpGained,
  coinsEarned,
  title,
  subtitle,
  levelUp,
}: Props) {
  const t = useTranslations("Task");

  useEffect(() => {
    if (!open) return;
    const extra = levelUp ? 900 : 0;
    const base = kind === "roadmap" ? 3200 : 2600;
    const tmr = window.setTimeout(() => onClose(), base + extra);
    return () => window.clearTimeout(tmr);
  }, [open, onClose, kind, levelUp]);

  const Icon = kind === "roadmap" ? Trophy : kind === "phase" ? Sparkles : Zap;
  const iconClass =
    kind === "roadmap"
      ? "text-amber-400"
      : kind === "phase"
        ? "text-fuchsia-400"
        : "text-[var(--accent)]";

  const particleCount = levelUp ? 22 : 14;
  const levelSpan = levelUp ? levelUp.to - levelUp.from : 0;

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
              {Array.from({ length: particleCount }, (_, i) => (
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
            {levelUp ?
              <motion.div
                className="relative mx-auto mt-5 flex max-w-[min(100%,16rem)] flex-col items-center gap-1"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.12, type: "spring", stiffness: 280, damping: 22 }}
              >
                <div className="relative flex size-[min(100vw-4rem,11rem)] items-center justify-center">
                  <motion.div
                    className="absolute inset-0 rounded-full opacity-90"
                    style={{
                      background:
                        "conic-gradient(from 0deg, rgb(139,92,246), rgb(34,211,238), rgb(167,139,250), rgb(139,92,246))",
                      mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 4px) 100%)",
                      WebkitMask:
                        "radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 4px) 100%)",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <div className="relative flex size-[calc(100%-10px)] flex-col items-center justify-center rounded-full border border-[var(--border)]/60 bg-[var(--card)] shadow-inner">
                    <Award
                      className="mb-0.5 size-6 text-violet-500 dark:text-violet-300"
                      aria-hidden
                    />
                    <span
                      className="max-w-full truncate px-1 text-[clamp(1.65rem,9vmin,3.25rem)] font-bold tabular-nums leading-none tracking-tight text-[var(--foreground)]"
                      title={String(levelUp.to)}
                    >
                      {t("celebrationLevelNumber", { level: levelUp.to })}
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600/90 dark:text-violet-300/90">
                      {t("celebrationLevelUp")}
                    </span>
                  </div>
                </div>
                {levelSpan > 1 ?
                  <p className="text-center text-xs font-medium text-[var(--muted)]">
                    {t("celebrationLevelsJump", { count: levelSpan })}
                  </p>
                : null}
              </motion.div>
            : null}
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
              {t("celebrationContinue")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
