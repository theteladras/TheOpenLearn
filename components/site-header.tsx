import Image from "next/image";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Outer surface: iOS-style frosted glass — blurred backdrop, saturated, mostly opaque tint (content behind stays soft). */
export const siteHeaderSurfaceClass =
  "sticky top-0 z-40 border-b border-[var(--border)]/40 pt-[env(safe-area-inset-top,0px)] bg-[color-mix(in_srgb,var(--card)_78%,transparent)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.72),0_10px_40px_-18px_rgba(109,77,243,0.22)] backdrop-blur-[28px] backdrop-saturate-[1.65] supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--card)_62%,transparent)] dark:border-[var(--border)]/35 dark:bg-[color-mix(in_srgb,var(--card)_68%,transparent)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_14px_48px_-20px_rgba(0,0,0,0.62)] dark:backdrop-blur-[28px] dark:backdrop-saturate-125 dark:supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--card)_52%,transparent)]";

export function SiteHeaderShell({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <header className={cn(siteHeaderSurfaceClass, "relative", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/35 to-transparent dark:via-[var(--accent)]/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-90 dark:opacity-60"
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-[3.5rem] max-w-6xl items-center justify-between gap-2 px-4 sm:min-h-16 sm:gap-3 sm:px-4",
          innerClassName,
        )}
      >
        {children}
      </div>
    </header>
  );
}

export function SiteBrand({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-w-0 shrink-0 items-center rounded-xl outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="TheOpenLearn"
        width={325}
        height={253}
        className="pointer-events-none h-11 max-h-11 object-contain object-left select-none filter transition-[filter] duration-300 ease-out group-hover:brightness-110 group-hover:saturate-125 group-focus-visible:brightness-110 group-focus-visible:saturate-125 dark:group-hover:brightness-115 dark:group-hover:saturate-150 dark:group-focus-visible:brightness-115 dark:group-focus-visible:saturate-150"
        draggable={false}
        priority={false}
      />
    </Link>
  );
}

export const siteNavLinkClass =
  "rounded-full px-3.5 py-2 text-sm font-medium text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--accent-soft)]/80 hover:text-[var(--foreground)] active:scale-[0.98]";

export const siteNavLinkActiveClass =
  "bg-[var(--accent-soft)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]/70 dark:ring-white/10";
