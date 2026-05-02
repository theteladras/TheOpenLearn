"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { BookMarked, Compass, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, getPathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { WalletStrip } from "@/components/app/wallet-strip";
import { learnerXpProgress } from "@/lib/xp-level";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const triggerClass =
  "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-2 ring-[var(--border)]/80 shadow-sm outline-none transition-[box-shadow,transform] hover:ring-[var(--accent)]/35 focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-[0.98] dark:ring-white/10";

export function AppUserButton({
  plan,
  coins,
  xpTotal,
  labels,
}: {
  plan: string;
  coins: number;
  xpTotal: number;
  labels: {
    openWallet: string;
    walletBalance: string;
  };
}) {
  const tDash = useTranslations("Dashboard");
  const tLocale = useTranslations("Locale");
  const tProfile = useTranslations("Profile");
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const locale = useLocale();

  const settingsHref = getPathname({ locale, href: "/profile/settings" });
  const profileHref = getPathname({ locale, href: "/profile" });
  const handbooksHref = getPathname({ locale, href: "/profile/handbooks" });
  const signInHref = getPathname({ locale, href: "/sign-in" });

  if (!isLoaded) {
    return (
      <div
        className="size-10 shrink-0 animate-pulse rounded-xl bg-[var(--accent-soft)]/60 ring-2 ring-[var(--border)]/50"
        aria-hidden
      />
    );
  }

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress;
  const displayName =
    user.fullName || user.firstName || email || tDash("userMenuFallbackName");

  const xpProg = learnerXpProgress(xpTotal);
  const fmt = (n: number) => n.toLocaleString(locale);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          aria-label={tDash("userMenuOpen")}
        >
          {user.imageUrl ?
            <Image
              src={user.imageUrl}
              alt=""
              width={40}
              height={40}
              className="size-full object-cover"
              unoptimized
            />
          : (
            <span className="flex size-full items-center justify-center bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
              {(user.firstName?.[0] ?? user.username?.[0] ?? "?").toUpperCase()}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(calc(100vw-1.5rem),18rem)] p-0"
      >
        <div className="border-b border-[var(--border)]/60 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {displayName}
          </p>
          {email ?
            <p className="truncate text-xs text-[var(--muted)]">{email}</p>
          : null}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold tracking-wide text-[var(--accent)]">
                {tDash("workspaceLevelPrefix", { level: xpProg.level })}
              </span>
              <span className="text-[0.65rem] tabular-nums text-[var(--muted)]">
                {tDash("userMenuXpTotal", { xp: fmt(xpProg.xpTotal) })}
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-sm border border-[var(--border)]/80 bg-black/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] dark:bg-black/45"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={xpProg.xpInSegment}
              aria-valuenow={xpProg.xpIntoLevel}
              aria-label={tDash("userMenuXpProgressAria")}
            >
              <div
                className="h-full min-w-0 rounded-sm bg-gradient-to-b from-[var(--accent)] via-violet-400 to-[color-mix(in_srgb,var(--accent)_75%,#1e1b4b)] shadow-[0_0_12px_rgba(139,92,246,0.35)] transition-[width] duration-500 ease-out dark:from-[var(--accent)] dark:via-violet-400 dark:to-indigo-900 dark:shadow-[0_0_14px_rgba(167,139,250,0.28)]"
                style={{
                  width: `${Math.min(100, Math.max(0, xpProg.pct))}%`,
                }}
              />
            </div>
            <p className="text-[0.65rem] leading-tight text-[var(--muted)]">
              {tDash("userMenuXpSegment", {
                current: fmt(xpProg.xpIntoLevel),
                need: fmt(xpProg.xpInSegment),
              })}
            </p>
          </div>
        </div>

        <div className="space-y-2 p-2">
          {plan === "FREE" ?
            <WalletStrip
              plan={plan}
              coins={coins}
              openLabel={labels.openWallet}
              balanceHint={labels.walletBalance}
              appearance="menu"
            />
          : null}

          <div className="space-y-1">
            <p className="px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {tLocale("groupLabel")}
            </p>
            <LocaleSwitcher className="h-10 w-full max-w-none justify-between rounded-xl border-[var(--border)]/70" />
          </div>
        </div>

        <DropdownMenuSeparator className="my-0 bg-[var(--border)]/60" />

        <div className="space-y-1 px-2 pb-1 pt-1.5">
          <p className="px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {tProfile("navTitle")}
          </p>
        </div>
        <div className="p-1 pt-0">
          <DropdownMenuItem asChild>
            <Link
              href={profileHref}
              className="w-full cursor-pointer text-[var(--foreground)]"
            >
              <Compass className="size-4 shrink-0 opacity-80" aria-hidden />
              {tProfile("navOverview")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={handbooksHref}
              className="w-full cursor-pointer text-[var(--foreground)]"
            >
              <BookMarked className="size-4 shrink-0 opacity-80" aria-hidden />
              {tProfile("navHandbooks")}
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-0 bg-[var(--border)]/60" />

        <div className="p-1">
          <DropdownMenuItem asChild>
            <Link
              href={settingsHref}
              className="w-full cursor-pointer text-[var(--foreground)]"
            >
              <Settings className="size-4 shrink-0 opacity-80" aria-hidden />
              {tDash("userMenuOptions")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:bg-red-500/10 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-500/10 dark:focus:text-red-300"
            onSelect={(e) => {
              e.preventDefault();
              void signOut({ redirectUrl: signInHref });
            }}
          >
            <LogOut className="size-4 shrink-0 opacity-80" aria-hidden />
            {tDash("userMenuSignOut")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
