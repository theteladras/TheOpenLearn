"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  earned: number;
  total: number;
  children: React.ReactNode;
  className?: string;
};

/** Collapsible section; closed by default (<details> without open). */
export function AchievementGroupShell({
  title,
  earned,
  total,
  children,
  className,
}: Props) {
  return (
    <details
      className={cn(
        "group rounded-2xl border border-[var(--border)]/80 bg-[var(--card)]/45 shadow-sm backdrop-blur-sm dark:bg-[var(--card)]/30",
        className,
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition-colors",
          "hover:bg-[var(--accent-soft)]/25 dark:hover:bg-[var(--accent-soft)]/15",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <div className="min-w-0 flex-1 text-left">
          <span className="font-semibold text-[var(--foreground)]">{title}</span>
          <span className="ml-2 tabular-nums text-sm font-medium text-[var(--muted)]">
            {earned}/{total}
          </span>
        </div>
        <ChevronDown
          className="size-5 shrink-0 text-[var(--muted)] transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-[var(--border)]/50 px-3 pb-4 pt-3 sm:px-4">
        {children}
      </div>
    </details>
  );
}
