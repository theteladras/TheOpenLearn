import Image from "next/image";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Outer surface styles for sticky headers (use with a `relative` header). */
export const siteHeaderSurfaceClass =
  "sticky top-0 z-40 border-b border-[var(--border)]/45 bg-[var(--background)]/65 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_18px_50px_-28px_rgba(109,77,243,0.28)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[var(--background)]/42 dark:border-[var(--border)]/55 dark:bg-[var(--background)]/55 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_24px_64px_-32px_rgba(0,0,0,0.75)] dark:supports-[backdrop-filter]:bg-[var(--background)]/38";

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
        "group flex min-w-0 shrink-0 items-center rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="TheOpenLearn"
        width={325}
        height={253}
        className="h-11 max-h-11 object-contain object-left transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        priority={false}
      />
    </Link>
  );
}

export const siteNavLinkClass =
  "rounded-full px-3.5 py-2 text-sm font-medium text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--accent-soft)]/80 hover:text-[var(--foreground)] active:scale-[0.98]";

export const siteNavLinkActiveClass =
  "bg-[var(--accent-soft)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]/70 dark:ring-white/10";
