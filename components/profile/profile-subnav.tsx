"use client";

import { BookMarked, Compass, Trophy, User } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type LabelKey = "overview" | "account" | "handbooks" | "achievements";

const items: {
  href: string;
  labelKey: LabelKey;
  icon: typeof Compass;
}[] = [
  { href: "/profile", labelKey: "overview", icon: Compass },
  { href: "/profile/account", labelKey: "account", icon: User },
  { href: "/profile/handbooks", labelKey: "handbooks", icon: BookMarked },
  { href: "/profile/achievements", labelKey: "achievements", icon: Trophy },
];

export function ProfileSubnav({
  ariaLabel,
  labels,
  className,
}: {
  ariaLabel: string;
  labels: {
    overview: string;
    account: string;
    handbooks: string;
    achievements: string;
  };
  className?: string;
}) {
  const pathname = usePathname();
  const labelFor = (k: LabelKey) => labels[k];

  function activeFor(href: string) {
    if (href === "/profile") {
      return pathname === "/profile" || pathname === "/profile/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex flex-row gap-1 overflow-x-auto border-b border-[var(--border)]/70 pb-3 md:w-52 md:shrink-0 md:flex-col md:gap-0.5 md:border-b-0 md:border-r md:pb-0 md:pr-6",
        className,
      )}
    >
      {items.map(({ href, labelKey, icon: Icon }) => {
        const active = activeFor(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--accent-soft)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]/60"
                : "text-[var(--muted)] hover:bg-[var(--accent-soft)]/70 hover:text-[var(--foreground)]",
            )}
          >
            <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
            {labelFor(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
