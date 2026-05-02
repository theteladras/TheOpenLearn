"use client";

import { AppUserButton } from "@/components/app/app-user-button";
import {
  Activity,
  Award,
  BookPlus,
  LayoutDashboard,
  Menu,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { SiteBrandLockup } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const sidebarSurface =
  "border-[var(--border)]/50 bg-[color-mix(in_srgb,var(--card)_82%,transparent)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--card)_70%,transparent)] dark:border-[var(--border)]/40 dark:bg-[color-mix(in_srgb,var(--card)_58%,transparent)] dark:supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--card)_48%,transparent)]";

type NavDef = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string[];
};

const mobileSheetLinkClass =
  "flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)]";

function useIsActive(def: NavDef, pathname: string) {
  const paths = def.match ?? [def.href];
  return paths.some(
    (p) => pathname === p || (p !== "/dashboard" && pathname.startsWith(p)),
  );
}

function SidebarNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavDef;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = useIsActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)]/75 hover:text-[var(--foreground)]",
        active &&
          "bg-[var(--accent-soft)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]/60 dark:ring-white/10",
      )}
    >
      <Icon
        className={cn(
          "size-5 shrink-0 opacity-80",
          active && "text-[var(--accent)] opacity-100",
        )}
        aria-hidden
      />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}

export function AppSidebar({
  plan,
  coins,
  labels,
}: {
  plan: string;
  coins: number;
  labels: {
    dashboard: string;
    newLearning: string;
    activities: string;
    rankings: string;
    achievements: string;
    menu: string;
    menuTitle: string;
    openWallet: string;
    walletBalance: string;
  };
}) {
  const pathname = usePathname();

  const nav: NavDef[] = [
    {
      href: "/learn/new",
      label: labels.newLearning,
      icon: BookPlus,
      match: ["/learn/new"],
    },
    {
      href: "/dashboard",
      label: labels.dashboard,
      icon: LayoutDashboard,
      match: ["/dashboard"],
    },
    {
      href: "/activities",
      label: labels.activities,
      icon: Activity,
      match: ["/activities", "/feed"],
    },
    {
      href: "/rankings",
      label: labels.rankings,
      icon: Trophy,
      match: ["/rankings"],
    },
    {
      href: "/profile/achievements",
      label: labels.achievements,
      icon: Award,
      match: ["/profile/achievements"],
    },
  ];

  const navList = (
    <div className="relative min-h-0 flex-1">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45] dark:opacity-[0.28]"
        aria-hidden
      >
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_90%_100%_at_50%_-20%,var(--accent-soft)_0%,transparent_72%)]" />
      </div>
      <nav
        className="relative z-[1] flex flex-col gap-0.5 p-3"
        aria-label={labels.menuTitle}
      >
        {nav.map((item) => (
          <SidebarNavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </div>
  );

  const footer = (
    <div className="mt-auto border-t border-[var(--border)]/50 p-3">
      <div className="flex items-center justify-center px-1 pb-0.5 pt-0.5">
        <AppUserButton
          plan={plan}
          coins={coins}
          labels={{
            openWallet: labels.openWallet,
            walletBalance: labels.walletBalance,
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden w-64 flex-col pt-[env(safe-area-inset-top,0px)] shadow-[4px_0_24px_-12px_rgba(109,77,243,0.12)] dark:shadow-[4px_0_28px_-12px_rgba(0,0,0,0.45)] lg:flex",
          sidebarSurface,
        )}
      >
        <div className="flex min-h-16 shrink-0 items-center border-b border-[var(--border)]/40 px-3 sm:px-4">
          <SiteBrandLockup
            href="/dashboard"
            className="w-full min-w-0 py-1"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {navList}
          {footer}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className={cn(
          "sticky top-0 z-30 flex min-h-14 shrink-0 items-center gap-1.5 border-b border-[var(--border)]/40 px-2 pt-[env(safe-area-inset-top,0px)] sm:gap-2 sm:px-3 lg:hidden",
          sidebarSurface,
        )}
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 touch-manipulation"
              aria-label={labels.menu}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] max-h-[min(560px,calc(100dvh-1.5rem))] w-auto max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto border-[var(--border)]/80 bg-[var(--card)]/95 p-0 backdrop-blur-xl sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[90vh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2">
            <DialogTitle className="sr-only">{labels.menuTitle}</DialogTitle>
            <div className="border-b border-[var(--border)]/70 px-4 py-4">
              <SiteBrandLockup
                href="/dashboard"
                className="w-full min-w-0"
                logoClassName="h-9 max-h-9"
                wordmarkClassName="text-base sm:text-lg"
              />
            </div>
            <nav
              className="flex flex-col gap-1 p-3"
              aria-label={labels.menuTitle}
            >
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <DialogClose key={item.href} asChild>
                    <Link href={item.href} className={mobileSheetLinkClass}>
                      <Icon className="size-5 shrink-0 opacity-80" aria-hidden />
                      {item.label}
                    </Link>
                  </DialogClose>
                );
              })}
            </nav>
            {plan !== "FREE" ?
              <div className="border-t border-[var(--border)]/60 p-3">
                <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--accent-soft)]/30 px-3 py-2 text-center text-xs font-medium text-[var(--muted)]">
                  Pro
                </div>
              </div>
            : null}
          </DialogContent>
        </Dialog>
        <SiteBrandLockup
          href="/dashboard"
          className="min-w-0 flex-1"
          collapseWordmarkOnNarrowViewport
        />
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          <AppUserButton
            plan={plan}
            coins={coins}
            labels={{
              openWallet: labels.openWallet,
              walletBalance: labels.walletBalance,
            }}
          />
        </div>
      </header>
    </>
  );
}
