"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { WalletStrip } from "@/components/app/wallet-strip";
import {
  SiteBrand,
  SiteHeaderShell,
  siteNavLinkActiveClass,
  siteNavLinkClass,
} from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const mobileLinkClass =
  "flex w-full items-center rounded-2xl px-4 py-3.5 text-base font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)]";

type NavDef = { href: string; label: string; match?: string[] };

export function AppHeader({
  plan,
  coins,
  labels,
}: {
  plan: string;
  coins: number;
  labels: {
    dashboard: string;
    activities: string;
    rankings: string;
    profile: string;
    menu: string;
    menuTitle: string;
    openWallet: string;
  };
}) {
  const pathname = usePathname();
  const nav: NavDef[] = [
    {
      href: "/dashboard",
      label: labels.dashboard,
      match: ["/dashboard"],
    },
    {
      href: "/activities",
      label: labels.activities,
      match: ["/activities", "/feed"],
    },
    {
      href: "/rankings",
      label: labels.rankings,
      match: ["/rankings"],
    },
    {
      href: "/profile",
      label: labels.profile,
      match: ["/profile", "/settings"],
    },
  ];

  function isActive(def: NavDef) {
    const paths = def.match ?? [def.href];
    return paths.some(
      (p) => pathname === p || (p !== "/dashboard" && pathname.startsWith(p)),
    );
  }

  return (
    <SiteHeaderShell>
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 touch-manipulation md:hidden"
              aria-label={labels.menu}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] max-h-[min(520px,calc(100dvh-1.5rem))] w-auto max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto border-[var(--border)]/80 bg-[var(--card)]/95 p-0 backdrop-blur-xl sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[90vh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2">
            <DialogTitle className="sr-only">{labels.menuTitle}</DialogTitle>
            <div className="border-b border-[var(--border)]/70 px-4 py-4">
              <SiteBrand href="/dashboard" />
            </div>
            <nav
              className="flex flex-col gap-1 p-3"
              aria-label={labels.menuTitle}
            >
              {nav.map((item) => (
                <DialogClose key={item.href} asChild>
                  <Link href={item.href} className={mobileLinkClass}>
                    {item.label}
                  </Link>
                </DialogClose>
              ))}
            </nav>
          </DialogContent>
        </Dialog>
        <SiteBrand href="/dashboard" />
      </div>

      <nav
        className="hidden items-center md:flex"
        aria-label={labels.menuTitle}
      >
        <div className="flex items-center gap-0.5 rounded-full border border-[var(--border)]/70 bg-[var(--card)]/55 p-1 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-md dark:border-[var(--border)]/50 dark:bg-[var(--card)]/35 dark:ring-white/[0.06]">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                siteNavLinkClass,
                isActive(item) && siteNavLinkActiveClass,
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <WalletStrip plan={plan} coins={coins} openLabel={labels.openWallet} />
        <UserButton
          appearance={{
            elements: {
              avatarBox:
                "h-9 w-9 rounded-xl ring-2 ring-[var(--border)]/80 shadow-sm dark:ring-white/10",
            },
          }}
        />
      </div>
    </SiteHeaderShell>
  );
}
