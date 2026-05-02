import { ChevronRight, Coins } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function WalletStrip({
  plan,
  coins,
  openLabel,
  balanceHint,
  appearance = "pill",
  className,
}: {
  plan: string;
  coins: number;
  /** Accessible name: e.g. “Open coins and referrals”. */
  openLabel: string;
  /** Shown in panel layouts (e.g. “Current balance”). */
  balanceHint?: string;
  /** `pill` — small chip. `panel` — full-width row for sidebar. `inline` — compact row for top bar. `menu` — profile menu row. */
  appearance?: "pill" | "panel" | "inline" | "menu";
  className?: string;
}) {
  if (plan !== "FREE") return null;

  if (appearance === "menu") {
    return (
      <Link
        href="/dashboard/wallet"
        aria-label={openLabel}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-2 transition-colors hover:border-amber-500/40 hover:bg-amber-500/11 dark:border-amber-400/20 dark:bg-amber-400/[0.08] dark:hover:border-amber-400/35 dark:hover:bg-amber-400/[0.12]",
          className,
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
          <Coins className="size-3.5 opacity-90" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          {balanceHint ?
            <span className="block text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {balanceHint}
            </span>
          : null}
          <span className="block text-sm font-semibold tabular-nums leading-tight text-amber-950 dark:text-amber-50">
            {coins}
          </span>
        </span>
        <ChevronRight
          className="size-3.5 shrink-0 text-[var(--muted)] opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-90"
          aria-hidden
        />
      </Link>
    );
  }

  if (appearance === "panel") {
    return (
      <Link
        href="/dashboard/wallet"
        aria-label={openLabel}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 transition-colors hover:border-amber-500/40 hover:bg-amber-500/11 dark:border-amber-400/20 dark:bg-amber-400/[0.08] dark:hover:border-amber-400/35 dark:hover:bg-amber-400/[0.12]",
          className,
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
          <Coins className="size-4 opacity-90" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          {balanceHint ?
            <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {balanceHint}
            </span>
          : null}
          <span className="block text-base font-semibold tabular-nums leading-tight text-amber-950 dark:text-amber-50">
            {coins}
          </span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-[var(--muted)] opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-90"
          aria-hidden
        />
      </Link>
    );
  }

  if (appearance === "inline") {
    return (
      <Link
        href="/dashboard/wallet"
        aria-label={openLabel}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-2.5 py-1.5 text-amber-950 transition-colors hover:border-amber-500/40 hover:bg-amber-500/12 dark:text-amber-100 dark:hover:bg-amber-400/10",
          className,
        )}
      >
        <Coins className="size-3.5 shrink-0 opacity-85" aria-hidden />
        <span className="text-xs font-semibold tabular-nums">{coins}</span>
        <ChevronRight className="size-3 shrink-0 opacity-45" aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/wallet"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-900 transition-colors hover:bg-amber-500/25 dark:text-amber-200",
        className,
      )}
      aria-label={openLabel}
    >
      <Coins className="h-3.5 w-3.5 opacity-90" aria-hidden />
      {coins}
    </Link>
  );
}
