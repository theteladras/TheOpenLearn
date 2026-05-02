"use client";

import { useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Check,
  Home,
  ListChecks,
  Lock,
  Map,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { learnerLevelFromXp } from "@/lib/xp-level";

function PathConnector() {
  return (
    <div
      aria-hidden
      className="mx-1 hidden h-px min-w-[0.5rem] flex-1 bg-[var(--border)] sm:mx-1.5 sm:block"
    />
  );
}

export function HeroProductMockup() {
  const t = useTranslations("Landing");
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative isolate rounded-2xl border border-[var(--border)]/80 bg-[var(--card)]/55 shadow-[0_24px_80px_-24px_rgba(109,77,243,0.35)] backdrop-blur-xl dark:border-[var(--border)]/50 dark:bg-[var(--card)]/40 dark:shadow-[0_28px_90px_-28px_rgba(157,139,255,0.25)]"
      style={{ borderRadius: "var(--radius)" }}
    >
      <div className="flex min-h-[280px] overflow-hidden rounded-[inherit]">
        <aside
          aria-hidden
          className="flex w-11 shrink-0 flex-col items-center gap-3 border-r border-[var(--border)]/60 bg-[var(--accent-soft)]/35 py-3 dark:bg-[var(--accent-soft)]/20 sm:w-12 sm:gap-3.5 sm:py-4"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--card)]/80 text-[var(--accent)] shadow-sm dark:bg-[var(--card)]/50">
            <Home className="size-4" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)]/60 hover:text-[var(--foreground)]">
            <Map className="size-4" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)]/60 hover:text-[var(--foreground)]">
            <BookOpen className="size-4" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)]/60 hover:text-[var(--foreground)]">
            <ListChecks className="size-4" />
          </span>
          <span className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)]/60 hover:text-[var(--foreground)]">
            <Trophy className="size-4" />
          </span>
        </aside>

        <div className="min-w-0 flex-1 space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-5">
          <p className="text-sm font-medium tracking-tight text-[var(--foreground)] sm:text-base">
            {t("hero.mockup.welcome")}
          </p>

          <div>
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)] sm:text-xs">
              {t("hero.mockup.pathTitle")}
            </p>
            <div className="flex flex-wrap items-center gap-y-2 sm:flex-nowrap">
              <div className="flex min-w-0 flex-1 items-center sm:min-w-[unset] sm:flex-initial sm:basis-auto">
                <div className="flex min-w-[4.5rem] flex-col items-center gap-1 text-center sm:min-w-[5rem]">
                  <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="max-w-[5.5rem] text-[0.65rem] font-medium leading-tight text-[var(--foreground)] sm:text-xs">
                    {t("hero.mockup.phaseFoundations")}
                  </span>
                </div>
                <PathConnector />
              </div>
              <div className="flex min-w-0 flex-1 items-center sm:flex-initial sm:basis-auto">
                <div className="flex min-w-[4.5rem] flex-col items-center gap-1 text-center sm:min-w-[5rem]">
                  <span className="relative flex size-7 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)] ring-2 ring-[var(--accent)]/35 ring-offset-2 ring-offset-[var(--background)] dark:ring-offset-[var(--card)]">
                    {!reduceMotion ? (
                      <span className="absolute inset-0 rounded-full bg-[var(--accent)]/25 animate-ping opacity-40 [animation-duration:2.2s]" />
                    ) : null}
                    <span className="relative size-2 rounded-full bg-[var(--accent)]" />
                  </span>
                  <span className="max-w-[5.5rem] text-[0.65rem] font-medium leading-tight text-[var(--foreground)] sm:text-xs">
                    {t("hero.mockup.phaseCore")}
                  </span>
                </div>
                <PathConnector />
              </div>
              <div className="flex min-w-0 flex-1 items-center sm:flex-initial sm:basis-auto">
                <div className="flex min-w-[4.5rem] flex-col items-center gap-1 text-center sm:min-w-[5rem]">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.65rem] font-semibold tabular-nums text-[var(--accent)] sm:text-xs">
                    {t("hero.mockup.phasePracticeRatio")}
                  </span>
                  <span className="max-w-[5.5rem] text-[0.65rem] font-medium leading-tight text-[var(--foreground)] sm:text-xs">
                    {t("hero.mockup.phasePractice")}
                  </span>
                </div>
                <PathConnector />
              </div>
              <div className="flex min-w-0 flex-1 items-center sm:flex-initial sm:basis-auto">
                <div className="flex min-w-[4.5rem] flex-col items-center gap-1 text-center sm:min-w-[5rem]">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[var(--muted)]/15 text-[var(--muted)]">
                    <Lock className="size-3" />
                  </span>
                  <span className="max-w-[5.5rem] text-[0.65rem] font-medium leading-tight text-[var(--muted)] sm:text-xs">
                    {t("hero.mockup.phaseAdvanced")}
                  </span>
                </div>
                <PathConnector />
              </div>
              <div className="flex min-w-0 flex-1 items-center sm:flex-initial sm:basis-auto">
                <div className="flex min-w-[4.5rem] flex-col items-center gap-1 text-center sm:min-w-[5rem]">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[var(--muted)]/15 text-[var(--muted)]">
                    <Lock className="size-3" />
                  </span>
                  <span className="max-w-[5.5rem] text-[0.65rem] font-medium leading-tight text-[var(--muted)] sm:text-xs">
                    {t("hero.mockup.phaseMastery")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5 md:gap-4">
            <div className="space-y-3 md:col-span-3">
              <div className="rounded-xl border border-[var(--border)]/70 bg-[var(--accent-soft)]/40 p-3 dark:bg-[var(--accent-soft)]/15 sm:p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {t("hero.mockup.continueLabel")}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)] sm:text-base">
                      {t("hero.mockup.continueCourse")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--accent)]">
                    {t("hero.mockup.continuePct")}
                  </span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--background)]/80 dark:bg-[var(--foreground)]/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-fuchsia-500/90"
                    style={{ width: "65%" }}
                  />
                </div>
                <button
                  type="button"
                  className="w-full rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white shadow-md shadow-[var(--accent)]/25 transition hover:opacity-95 sm:text-sm"
                >
                  {t("hero.mockup.continueCta")}
                </button>
              </div>
              <div className="space-y-2 rounded-xl border border-[var(--border)]/60 bg-[var(--card)]/50 p-3 dark:bg-[var(--card)]/30">
                <div>
                  <div className="mb-1 flex justify-between text-xs font-medium text-[var(--foreground)]">
                    <span className="truncate pr-2">
                      {t("hero.mockup.miniCourseA")}
                    </span>
                    <span className="tabular-nums text-[var(--muted)]">42%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-[var(--border)]/80">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]/70"
                      style={{ width: "42%" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs font-medium text-[var(--foreground)]">
                    <span className="truncate pr-2">
                      {t("hero.mockup.miniCourseB")}
                    </span>
                    <span className="tabular-nums text-[var(--muted)]">25%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-[var(--border)]/80">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]/50"
                      style={{ width: "25%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)]/70 bg-[var(--card)]/50 p-3 dark:bg-[var(--card)]/30 md:col-span-2 md:p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)] sm:text-xs">
                <Sparkles className="size-3.5 text-[var(--accent)] sm:size-4" />
                {t("hero.mockup.aiTitle")}
              </div>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li className="rounded-lg bg-[var(--accent-soft)]/50 px-2.5 py-2 font-medium text-[var(--foreground)] dark:bg-[var(--accent-soft)]/20">
                  {t("hero.mockup.aiItem1")}
                </li>
                <li className="rounded-lg bg-[var(--accent-soft)]/35 px-2.5 py-2 font-medium text-[var(--foreground)]/90 dark:bg-[var(--accent-soft)]/15">
                  {t("hero.mockup.aiItem2")}
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)]/50 pt-3 sm:grid-cols-4 sm:gap-3 sm:pt-4">
            <div className="rounded-lg bg-[var(--accent-soft)]/25 px-2 py-2 dark:bg-[var(--accent-soft)]/10 sm:px-3">
              <p className="text-[0.65rem] font-medium text-[var(--muted)] sm:text-xs">
                {t("hero.mockup.statCourses")}
              </p>
              <p className="text-sm font-semibold tabular-nums text-[var(--foreground)] sm:text-base">
                {t("hero.mockup.statCoursesVal")}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--accent-soft)]/25 px-2 py-2 dark:bg-[var(--accent-soft)]/10 sm:px-3">
              <p className="text-[0.65rem] font-medium text-[var(--muted)] sm:text-xs">
                {t("hero.mockup.statTasks")}
              </p>
              <p className="text-sm font-semibold tabular-nums text-[var(--foreground)] sm:text-base">
                {t("hero.mockup.statTasksVal")}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--accent-soft)]/25 px-2 py-2 dark:bg-[var(--accent-soft)]/10 sm:px-3">
              <p className="text-[0.65rem] font-medium text-[var(--muted)] sm:text-xs">
                {t("hero.mockup.statOverall")}
              </p>
              <p className="text-sm font-semibold tabular-nums text-[var(--foreground)] sm:text-base">
                {t("hero.mockup.statOverallVal")}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--accent-soft)]/25 px-2 py-2 dark:bg-[var(--accent-soft)]/10 sm:px-3">
              <p className="text-[0.65rem] font-medium text-[var(--muted)] sm:text-xs">
                {t("hero.mockup.statLevelXp")}
              </p>
              <p className="text-sm font-semibold tabular-nums sm:text-base">
                <span className="text-[var(--accent)]">
                  {t("hero.mockup.statLevelPrefix", {
                    level: learnerLevelFromXp(3200),
                  })}
                </span>
                <span className="text-[var(--muted)]"> · </span>
                <span className="text-[var(--foreground)]">
                  {t("hero.mockup.statXpTotal", { xp: 3200 })}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
