"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  BookOpen,
  Brain,
  CalendarDays,
  Coins,
  Globe2,
  Map,
  Menu,
  Sparkles,
  Trophy,
  UserPlus,
  Wand2,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteBrand, SiteHeaderShell } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const springReveal = {
  type: "spring" as const,
  stiffness: 70,
  damping: 22,
  mass: 1.1,
};

function HeroBackdrop({
  scrollYProgress,
  heroRef,
}: {
  scrollYProgress: MotionValue<number>;
  heroRef: RefObject<HTMLElement | null>;
}) {
  const reduce = useReducedMotion();
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  /** Narrow viewports: pointer rarely moves, so run a slow ambient drift instead of cursor tracking. */
  const [mobileAmbient, setMobileAmbient] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobileAmbient(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduce || mobileAmbient) return;
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      mouseX.set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
      mouseY.set(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
    };
    const onLeave = () => {
      mouseX.set(0.5);
      mouseY.set(0.5);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [heroRef, mouseX, mouseY, reduce, mobileAmbient]);

  useEffect(() => {
    if (reduce || !mobileAmbient) return;
    const xCtrl = animate(mouseX, [0.3, 0.72, 0.4, 0.65, 0.3], {
      duration: 22,
      repeat: Infinity,
      ease: "easeInOut",
    });
    const yCtrl = animate(mouseY, [0.36, 0.62, 0.44, 0.68, 0.36], {
      duration: 26,
      repeat: Infinity,
      ease: "easeInOut",
    });
    return () => {
      xCtrl.stop();
      yCtrl.stop();
    };
  }, [reduce, mobileAmbient, mouseX, mouseY]);

  const gasFastX = useSpring(mouseX, {
    stiffness: 52,
    damping: 36,
    mass: 0.72,
  });
  const gasFastY = useSpring(mouseY, {
    stiffness: 52,
    damping: 36,
    mass: 0.72,
  });
  const gasMidX = useSpring(mouseX, { stiffness: 26, damping: 40, mass: 1 });
  const gasMidY = useSpring(mouseY, { stiffness: 26, damping: 40, mass: 1 });
  const gasSlowX = useSpring(mouseX, {
    stiffness: 14,
    damping: 44,
    mass: 1.25,
  });
  const gasSlowY = useSpring(mouseY, {
    stiffness: 14,
    damping: 44,
    mass: 1.25,
  });

  const g1x = useTransform(gasFastX, (v) => `${v * 100}%`);
  const g1y = useTransform(gasFastY, (v) => `${v * 100}%`);
  const g2x = useTransform(gasMidX, (v) => `${v * 100}%`);
  const g2y = useTransform(gasMidY, (v) => `${v * 100}%`);
  const g3x = useTransform(gasSlowX, (v) => `${v * 100}%`);
  const g3y = useTransform(gasSlowY, (v) => `${v * 100}%`);

  // Pixel values avoid %-transform bugs with absolute + Next/Image that can stall layout.
  const parallaxY = reduce ? 0 : mobileAmbient ? 72 : 160;
  const parallaxScale = reduce ? 1 : mobileAmbient ? 1.03 : 1.06;
  const y = useTransform(scrollYProgress, [0, 1], [0, parallaxY]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, parallaxScale]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.65],
    [1, mobileAmbient ? 0.62 : 0.45],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        style={{ y, scale, opacity }}
        className="absolute inset-[-8%] md:inset-[-12%]"
      >
        <Image
          src="/landing/hero-mesh.png"
          alt=""
          fill
          priority
          className="object-cover object-[50%_30%] mix-blend-multiply opacity-100 dark:mix-blend-soft-light dark:opacity-80 md:object-[50%_35%] md:opacity-90 md:dark:opacity-70"
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/10 via-[var(--background)]/48 to-[var(--background)] dark:from-[var(--background)]/38 dark:via-[var(--background)]/72 dark:to-[var(--background)] md:from-[var(--background)]/20 md:via-[var(--background)]/65 md:dark:from-[var(--background)]/50 md:dark:via-[var(--background)]/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,var(--accent-soft)_0%,transparent_58%)] opacity-90 max-md:opacity-100 md:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--accent-soft)_0%,transparent_55%)] md:opacity-80" />
      {!reduce && (
        <>
          <motion.div
            className="absolute -left-[12%] top-[14%] h-[min(110vw,560px)] w-[min(110vw,560px)] rounded-full bg-[var(--accent)]/35 blur-[72px] max-md:bg-[var(--accent)]/40 md:-left-[15%] md:top-[18%] md:h-[min(100vw,520px)] md:w-[min(100vw,520px)] md:bg-[var(--accent)]/25 md:blur-[120px]"
            animate={
              mobileAmbient
                ? { x: [0, 36, -18, 24, 0], y: [0, 28, 18, -12, 0] }
                : { x: [0, 55, 0], y: [0, 40, 0] }
            }
            transition={
              mobileAmbient
                ? { duration: 16, repeat: Infinity, ease: "easeInOut" }
                : { duration: 22, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <motion.div
            className="absolute -right-[8%] bottom-[2%] h-[min(100vw,520px)] w-[min(100vw,520px)] rounded-full bg-fuchsia-400/22 blur-[68px] dark:bg-fuchsia-400/16 max-md:bg-fuchsia-400/28 max-md:dark:bg-fuchsia-400/20 md:-right-[10%] md:bottom-[5%] md:h-[min(90vw,480px)] md:w-[min(90vw,480px)] md:bg-fuchsia-400/15 md:blur-[110px] md:dark:bg-fuchsia-400/10"
            animate={
              mobileAmbient
                ? { x: [0, -32, 20, -22, 0], y: [0, -26, -14, 20, 0] }
                : { x: [0, -45, 0], y: [0, -35, 0] }
            }
            transition={
              mobileAmbient
                ? { duration: 14, repeat: Infinity, ease: "easeInOut" }
                : { duration: 19, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <motion.div
            className="absolute left-1/3 top-[48%] h-[min(85vw,420px)] w-[min(85vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/16 blur-[64px] dark:bg-cyan-400/10 max-md:bg-cyan-300/22 max-md:dark:bg-cyan-400/14 md:top-1/2 md:h-[min(70vw,380px)] md:w-[min(70vw,380px)] md:bg-cyan-300/10 md:blur-[100px] md:dark:bg-cyan-400/5"
            animate={{
              scale: [1, 1.15, 1],
              opacity: mobileAmbient ? [0.55, 0.95, 0.55] : [0.5, 0.85, 0.5],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      {!reduce && (
        <div
          className="absolute inset-0 mix-blend-soft-light dark:mix-blend-screen"
          aria-hidden
        >
          <motion.div
            className="absolute h-[min(100vmin,620px)] w-[min(100vmin,620px)] rounded-full bg-[var(--accent)]/42 blur-[72px] dark:bg-[var(--accent)]/32 md:h-[min(92vmin,720px)] md:w-[min(92vmin,720px)] md:bg-[var(--accent)]/35 md:blur-[100px] lg:blur-[120px] md:dark:bg-[var(--accent)]/25"
            style={{ left: g1x, top: g1y, x: "-50%", y: "-50%" }}
          />
          <motion.div
            className="absolute h-[min(88vmin,520px)] w-[min(88vmin,520px)] rounded-full bg-fuchsia-400/38 blur-[60px] dark:bg-fuchsia-400/26 md:h-[min(76vmin,560px)] md:w-[min(76vmin,560px)] md:bg-fuchsia-400/30 md:blur-[88px] md:dark:bg-fuchsia-400/18"
            style={{ left: g2x, top: g2y, x: "-50%", y: "-50%" }}
          />
          <motion.div
            className="absolute h-[min(78vmin,440px)] w-[min(78vmin,440px)] rounded-full bg-cyan-300/32 blur-[52px] dark:bg-cyan-400/18 md:h-[min(62vmin,420px)] md:w-[min(62vmin,420px)] md:bg-cyan-300/25 md:blur-[72px] md:dark:bg-cyan-400/12"
            style={{ left: g3x, top: g3y, x: "-50%", y: "-50%" }}
          />
        </div>
      )}
      <div
        className="absolute inset-0 opacity-[0.42] dark:opacity-[0.28] md:opacity-[0.35] md:dark:opacity-[0.2]"
        style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: "max(48px, 12vw) max(48px, 12vw)",
          maskImage:
            "radial-gradient(ellipse 92% 72% at 50% 38%, black 8%, transparent 72%)",
        }}
      />
    </div>
  );
}

function SectionBackdrop({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className ?? ""}`}
    >
      <Image
        src={src}
        alt=""
        fill
        className="object-cover mix-blend-multiply opacity-[0.28] dark:mix-blend-soft-light dark:opacity-[0.18]"
        sizes="(max-width: 768px) 100vw, 896px"
      />
      <div className="absolute inset-0 bg-[var(--background)]/75 dark:bg-[var(--background)]/82" />
    </div>
  );
}

const mobileNavLinkClass =
  "block rounded-xl px-3 py-3.5 text-base font-medium text-[var(--foreground)] hover:bg-[var(--accent-soft)]";

/** Compact, single-line desktop pill — avoids wrap on md/lg viewports. */
const landingDesktopNavLinkClass =
  "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--accent-soft)]/80 hover:text-[var(--foreground)] active:scale-[0.98] sm:px-3 sm:text-[0.8125rem]";

export function LandingPage() {
  const t = useTranslations("Landing");
  const heroRef = useRef<HTMLElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const reduce = useReducedMotion();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--background)]">
      <SiteHeaderShell innerClassName="min-h-[3.25rem] gap-1.5 py-1.5 sm:min-h-14 sm:gap-2 sm:py-2">
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 touch-manipulation md:hidden"
                aria-label={t("nav.menu")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="left-4 right-4 top-[max(0.75rem,env(safe-area-inset-top))] max-h-[min(560px,calc(100dvh-1.5rem))] w-auto max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[90vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2">
              <DialogTitle className="sr-only">
                {t("nav.menuTitle")}
              </DialogTitle>
              <nav
                className="flex flex-col gap-0.5 pr-6"
                aria-label={t("nav.menuTitle")}
              >
                <DialogClose asChild>
                  <a href="#how" className={mobileNavLinkClass}>
                    {t("nav.how")}
                  </a>
                </DialogClose>
                <DialogClose asChild>
                  <a href="#features" className={mobileNavLinkClass}>
                    {t("nav.features")}
                  </a>
                </DialogClose>
                <DialogClose asChild>
                  <a href="#rewards" className={mobileNavLinkClass}>
                    {t("nav.rewards")}
                  </a>
                </DialogClose>
                <DialogClose asChild>
                  <a href="#gamification" className={mobileNavLinkClass}>
                    {t("nav.gamification")}
                  </a>
                </DialogClose>
                <DialogClose asChild>
                  <a href="#languages" className={mobileNavLinkClass}>
                    {t("nav.languages")}
                  </a>
                </DialogClose>
                <DialogClose asChild>
                  <Link href="/feed" className={mobileNavLinkClass}>
                    {t("nav.community")}
                  </Link>
                </DialogClose>
                <div className="mt-4 border-t border-[var(--border)] pt-2">
                  <DialogClose asChild>
                    <Link href="/sign-in" className={mobileNavLinkClass}>
                      {t("nav.signIn")}
                    </Link>
                  </DialogClose>
                  <DialogClose asChild>
                    <Link href="/sign-up" className={mobileNavLinkClass}>
                      {t("nav.getStarted")}
                    </Link>
                  </DialogClose>
                  <DialogClose asChild>
                    <Link href="/privacy" className={mobileNavLinkClass}>
                      {t("footer.privacy")}
                    </Link>
                  </DialogClose>
                  <DialogClose asChild>
                    <Link href="/terms" className={mobileNavLinkClass}>
                      {t("footer.terms")}
                    </Link>
                  </DialogClose>
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      {t("nav.languageHint")}
                    </p>
                    <div className="px-3">
                      <LocaleSwitcher className="h-10 w-full max-w-none justify-between" />
                    </div>
                  </div>
                </div>
              </nav>
            </DialogContent>
          </Dialog>
          <motion.div
            whileHover={reduce ? undefined : { scale: 1.02 }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
          >
            <SiteBrand href="/" />
          </motion.div>
        </div>
        <nav
          className="hidden min-w-0 flex-1 justify-center px-1 md:flex"
          aria-label={t("nav.menuTitle")}
        >
          <div className="inline-flex max-w-full flex-nowrap items-center gap-px rounded-full border border-[var(--border)]/70 bg-[var(--card)]/50 px-0.5 py-0.5 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-md dark:border-[var(--border)]/50 dark:bg-[var(--card)]/35 dark:ring-white/[0.06]">
            <motion.a
              href="#how"
              className={landingDesktopNavLinkClass}
              whileHover={reduce ? undefined : { y: -1 }}
            >
              {t("nav.howShort")}
            </motion.a>
            <motion.a
              href="#features"
              className={landingDesktopNavLinkClass}
              whileHover={reduce ? undefined : { y: -1 }}
            >
              {t("nav.features")}
            </motion.a>
            <motion.a
              href="#rewards"
              className={landingDesktopNavLinkClass}
              whileHover={reduce ? undefined : { y: -1 }}
            >
              {t("nav.rewards")}
            </motion.a>
            <motion.div whileHover={reduce ? undefined : { y: -1 }}>
              <Link href="/feed" className={landingDesktopNavLinkClass}>
                {t("nav.communityShort")}
              </Link>
            </motion.div>
          </div>
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2">
          <LocaleSwitcher />
          <Button
            variant="ghost"
            size="sm"
            className="hidden touch-manipulation rounded-full sm:inline-flex"
            asChild
          >
            <Link href="/sign-in">{t("nav.signIn")}</Link>
          </Button>
          <Button
            size="sm"
            className="touch-manipulation rounded-full shadow-md shadow-[var(--accent)]/25 sm:shrink-0"
            asChild
          >
            <Link href="/sign-up">{t("nav.getStarted")}</Link>
          </Button>
        </div>
      </SiteHeaderShell>
      <main className="flex-1">
        <section
          ref={heroRef}
          className="relative flex min-h-[calc(100dvh-env(safe-area-inset-top,0px)-3.5rem)] flex-col overflow-hidden touch-manipulation sm:min-h-[calc(100dvh-env(safe-area-inset-top,0px)-4rem)]"
        >
          <HeroBackdrop scrollYProgress={scrollYProgress} heroRef={heroRef} />

          <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 sm:px-4">
            <div className="flex min-h-0 flex-1 flex-col justify-center py-5 sm:py-7">
              <motion.div
                className="mx-auto max-w-3xl text-center"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: { staggerChildren: 0.1, delayChildren: 0.04 },
                  },
                }}
              >
                <motion.p
                  variants={{
                    hidden: { opacity: 0, letterSpacing: "0.35em", y: 12 },
                    show: {
                      opacity: 1,
                      letterSpacing: "0.2em",
                      y: 0,
                      transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
                    },
                  }}
                  className="mb-4 text-[0.65rem] font-semibold uppercase text-[var(--muted)] md:mb-5 md:text-xs"
                >
                  {t("hero.kicker")}
                </motion.p>
                <div className="text-balance" style={{ perspective: "1200px" }}>
                  <motion.h1
                    variants={{
                      hidden: { opacity: 0, y: 28, rotateX: -8 },
                      show: {
                        opacity: 1,
                        y: 0,
                        rotateX: 0,
                        transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
                      },
                    }}
                    className="text-3xl font-semibold leading-[1.1] tracking-tight text-[var(--foreground)] min-[380px]:text-[clamp(1.75rem,4.6vw,2.5rem)] sm:text-4xl md:text-[clamp(2.25rem,4vw,2.85rem)] md:leading-[1.06] lg:text-[3.1rem]"
                  >
                    <span className="text-gradient">{t("hero.title")}</span>
                  </motion.h1>
                </div>
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scaleX: 0 },
                    show: {
                      opacity: 1,
                      scaleX: 1,
                      transition: {
                        delay: 0.35,
                        duration: 0.85,
                        ease: [0.16, 1, 0.3, 1],
                      },
                    },
                  }}
                  className="mx-auto mt-6 h-px max-w-[min(100%,320px)] origin-center bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent md:mt-7"
                />
                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 28 },
                    show: {
                      opacity: 1,
                      y: 0,
                      transition: { ...springReveal, delay: 0.28 },
                    },
                  }}
                  className="mx-auto mt-6 max-w-2xl text-pretty border-l-2 border-[var(--accent)]/35 pl-5 text-left text-base leading-snug text-[var(--muted)] md:mt-7 md:border-l-0 md:pl-0 md:text-center md:text-lg md:leading-relaxed"
                >
                  {t("hero.subtitle")}
                </motion.p>
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 32 },
                    show: {
                      opacity: 1,
                      y: 0,
                      transition: { ...springReveal, delay: 0.42 },
                    },
                  }}
                  className="mt-6 flex w-full max-w-md flex-col items-stretch gap-2.5 min-[480px]:max-w-none min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center min-[480px]:justify-center min-[480px]:gap-3 sm:mt-8"
                >
                  <motion.div
                    className="w-full min-[480px]:w-auto"
                    whileHover={reduce ? undefined : { scale: 1.04, y: -3 }}
                    whileTap={reduce ? undefined : { scale: 0.97 }}
                  >
                    <Button
                      size="lg"
                      className="w-full shadow-lg shadow-[var(--accent)]/25 min-[480px]:w-auto"
                      asChild
                    >
                      <Link href="/sign-up">{t("hero.cta")}</Link>
                    </Button>
                  </motion.div>
                  <motion.div
                    className="w-full min-[480px]:w-auto"
                    whileHover={reduce ? undefined : { scale: 1.02, y: -2 }}
                    whileTap={reduce ? undefined : { scale: 0.98 }}
                  >
                    <Button
                      size="lg"
                      variant="secondary"
                      className="w-full min-[480px]:w-auto"
                      asChild
                    >
                      <a href="#how">{t("hero.secondary")}</a>
                    </Button>
                  </motion.div>
                </motion.div>
                <motion.p
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { delay: 0.55, duration: 0.6 },
                    },
                  }}
                  className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-snug text-[var(--muted)] md:mt-6 md:leading-relaxed"
                >
                  {t("hero.coinTeaser")}
                </motion.p>
              </motion.div>
            </div>

            <motion.div
              className="flex shrink-0 justify-center pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
            >
              <motion.div
                aria-hidden
                className="flex flex-col items-center gap-2 text-[var(--muted)] max-md:text-[var(--foreground)]/70"
                animate={reduce ? undefined : { y: [0, 8, 0] }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <span className="text-xs font-medium uppercase tracking-widest max-md:tracking-[0.22em]">
                  {t("hero.scrollCue")}
                </span>
                <motion.span
                  className="block h-12 w-[2px] max-md:h-14 rounded-full bg-gradient-to-b from-[var(--accent)] from-40% to-transparent max-md:from-50% max-md:shadow-[0_0_12px_var(--accent)]"
                  animate={reduce ? undefined : { scaleY: [0.55, 1, 0.55] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section
          id="how"
          className="relative border-t border-[var(--border)] py-16 md:py-20"
        >
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div
              className="absolute inset-0 bg-cover bg-[position:30%_50%]"
              style={{ backgroundImage: "url(/landing/section-soft.png)" }}
            />
            <div className="absolute inset-0 bg-[var(--background)]/88 dark:bg-[var(--background)]/92" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 sm:px-4">
            <motion.h2
              className="text-center text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={springReveal}
            >
              {t("how.title")}
            </motion.h2>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: BookOpen,
                  title: t("how.step1Title"),
                  body: t("how.step1Body"),
                  step: "01",
                },
                {
                  icon: Brain,
                  title: t("how.step2Title"),
                  body: t("how.step2Body"),
                  step: "02",
                },
                {
                  icon: Map,
                  title: t("how.step3Title"),
                  body: t("how.step3Body"),
                  step: "03",
                },
              ].map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40, rotateY: reduce ? 0 : -6 }}
                  whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ ...springReveal, delay: i * 0.12 }}
                  style={{ perspective: 1000 }}
                  whileHover={
                    reduce ? undefined : { y: -8, transition: springReveal }
                  }
                >
                  <Card className="relative h-full overflow-hidden border-[var(--border)] bg-[var(--card)]/90 shadow-xl shadow-black/[0.06] dark:shadow-black/30">
                    <span className="absolute right-4 top-4 font-mono text-4xl font-light tabular-nums text-[var(--accent)]/20">
                      {step.step}
                    </span>
                    <CardHeader>
                      <motion.div
                        className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)]"
                        whileHover={
                          reduce ? undefined : { rotate: [0, -8, 8, 0] }
                        }
                        transition={{ duration: 0.6 }}
                      >
                        <step.icon className="h-5 w-5 text-[var(--accent)]" />
                      </motion.div>
                      <CardTitle className="pr-12">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {step.body}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="relative py-16 md:py-24">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-4">
            <motion.h2
              className="text-center text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              {t("features.title")}
            </motion.h2>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Wand2,
                  title: t("features.cards.structured.title"),
                  body: t("features.cards.structured.body"),
                },
                {
                  icon: Brain,
                  title: t("features.cards.ai.title"),
                  body: t("features.cards.ai.body"),
                },
                {
                  icon: Sparkles,
                  title: t("features.cards.progress.title"),
                  body: t("features.cards.progress.body"),
                },
              ].map((c, i) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ ...springReveal, delay: i * 0.1 }}
                >
                  <Card className="group relative h-full overflow-hidden border-[var(--border)] transition-shadow duration-500 hover:shadow-xl hover:shadow-[var(--accent)]/10">
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--accent-soft)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                    <CardHeader className="relative">
                      <motion.span
                        whileHover={reduce ? undefined : { rotate: 360 }}
                        transition={{ duration: 0.65, ease: "easeInOut" }}
                      >
                        <c.icon className="mb-2 h-8 w-8 text-[var(--accent)]" />
                      </motion.span>
                      <CardTitle className="text-base">{c.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                      <p className="text-sm leading-relaxed text-[var(--muted)]">
                        {c.body}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="rewards"
          className="relative border-t border-[var(--border)] py-16 md:py-24"
        >
          <div className="relative mx-auto max-w-6xl px-4 sm:px-4">
            <motion.div
              className="mx-auto max-w-2xl text-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={springReveal}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
                <Coins className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                {t("rewards.title")}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
                {t("rewards.subtitle")}
              </p>
            </motion.div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Coins,
                  title: t("rewards.cards.starter.title"),
                  body: t("rewards.cards.starter.body"),
                },
                {
                  icon: Zap,
                  title: t("rewards.cards.spend.title"),
                  body: t("rewards.cards.spend.body"),
                },
                {
                  icon: Sparkles,
                  title: t("rewards.cards.earn.title"),
                  body: t("rewards.cards.earn.body"),
                },
                {
                  icon: CalendarDays,
                  title: t("rewards.cards.monthly.title"),
                  body: t("rewards.cards.monthly.body"),
                },
                {
                  icon: UserPlus,
                  title: t("rewards.cards.referrals.title"),
                  body: t("rewards.cards.referrals.body"),
                },
                {
                  icon: Trophy,
                  title: t("rewards.cards.moments.title"),
                  body: t("rewards.cards.moments.body"),
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ ...springReveal, delay: i * 0.06 }}
                >
                  <Card className="h-full border-[var(--border)] bg-[var(--card)]/90 shadow-lg shadow-black/[0.04] dark:shadow-black/25">
                    <CardHeader>
                      <item.icon className="mb-1 h-7 w-7 text-[var(--accent)]" />
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-[var(--muted)]">
                        {item.body}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="gamification"
          className="relative border-t border-[var(--border)] py-16 md:py-24"
        >
          <div className="relative mx-auto max-w-6xl px-4 sm:px-4">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <motion.div
                initial={{ opacity: 0, x: reduce ? 0 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={springReveal}
              >
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                  {t("gamification.title")}
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-[var(--muted)]">
                  {t("gamification.body")}
                </p>
                <motion.div
                  className="mt-8 flex flex-wrap gap-2"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={{
                    show: { transition: { staggerChildren: 0.08 } },
                  }}
                >
                  {[
                    t("gamification.chip1"),
                    t("gamification.chip2"),
                    t("gamification.chip3"),
                    t("gamification.chip4"),
                  ].map((label, i) => (
                    <motion.div
                      key={label}
                      variants={{
                        hidden: { opacity: 0, x: -12 },
                        show: { opacity: 1, x: 0 },
                      }}
                    >
                      <Badge
                        variant={
                          i === 0
                            ? "default"
                            : i === 1
                              ? "outline"
                              : i === 2
                                ? "muted"
                                : "outline"
                        }
                      >
                        {label}
                      </Badge>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
              <motion.div
                className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl shadow-[var(--accent)]/10"
                initial={{ opacity: 0, x: reduce ? 0 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ ...springReveal, delay: 0.1 }}
              >
                <SectionBackdrop src="/landing/section-soft.png" />
                <div className="relative z-10">
                  <motion.div
                    animate={
                      reduce
                        ? undefined
                        : { rotate: [0, 8, -6, 0], y: [0, -4, 0] }
                    }
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Trophy className="mb-4 h-10 w-10 text-amber-500 drop-shadow-md" />
                  </motion.div>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">
                    {t("gamification.panel")}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="languages"
          className="relative overflow-hidden py-16 md:py-24"
        >
          <div className="pointer-events-none absolute inset-0">
            <Image
              src="/landing/hero-mesh.png"
              alt=""
              fill
              className="object-cover object-[80%_50%] opacity-[0.12] mix-blend-multiply dark:mix-blend-soft-light dark:opacity-[0.1]"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-[var(--background)]/92" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <Globe2 className="mx-auto mb-5 h-11 w-11 text-[var(--accent)]" />
            </motion.div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              {t("i18n.title")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--muted)]">
              {t("i18n.body")}
            </p>
          </div>
        </section>

        <section className="relative border-t border-[var(--border)] py-16 md:py-24">
          <div className="relative mx-auto max-w-3xl px-4 sm:px-4">
            <motion.div
              className="relative overflow-hidden rounded-2xl bg-[var(--accent-soft)] p-6 text-center shadow-2xl sm:rounded-3xl sm:p-10"
              initial={{ opacity: 0, y: 56, rotateX: reduce ? 0 : 8 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ type: "spring", stiffness: 56, damping: 17 }}
              style={{ perspective: 1200 }}
            >
              <SectionBackdrop
                src="/landing/section-soft.png"
                className="opacity-90"
              />
              <div className="relative z-10">
                <h2 className="text-2xl font-semibold md:text-3xl">
                  {t("cta.title")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-[var(--muted)]">
                  {t("cta.body")}
                </p>
                <motion.div
                  className="mt-9 inline-block"
                  whileHover={reduce ? undefined : { scale: 1.05 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                >
                  <Button
                    size="lg"
                    className="shadow-lg shadow-[var(--accent)]/30"
                    asChild
                  >
                    <Link href="/sign-up">{t("cta.button")}</Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-sm text-[var(--muted)] sm:px-4">
          <div className="flex w-full flex-col items-center justify-between gap-4 md:flex-row md:items-start">
            <span className="text-center md:text-left">
              {t("footer.tagline")}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-6 md:justify-end">
              <Link
                href="/privacy"
                className="text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
              >
                {t("footer.privacy")}
              </Link>
              <Link
                href="/terms"
                className="text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline"
              >
                {t("footer.terms")}
              </Link>
            </div>
          </div>
          <p className="w-full border-t border-[var(--border)]/60 pt-6 text-center text-xs tracking-wide text-[var(--muted)] md:text-left">
            {t("footer.developedBy")}
          </p>
        </div>
      </footer>
    </div>
  );
}
