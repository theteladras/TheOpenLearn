"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LearningRichText } from "@/components/learning/learning-rich-text";
import { COIN_TASK_AI_MESSAGE } from "@/lib/coin-economy";
import { askTaskCoach } from "@/server/actions/learning-actions";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };

type Props = {
  taskId: string;
  status: "LOCKED" | "AVAILABLE" | "COMPLETED";
  /** False for PRO — no coin charge */
  chargePerMessage: boolean;
};

export function TaskCoachChat({ taskId, status, chargePerMessage }: Props) {
  const t = useTranslations("Task");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const locked = status === "LOCKED";
  const hasThread = turns.length > 0;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollToBottom();
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || locked || sending) return;
    setSending(true);
    setDraft("");
    try {
      const r = await askTaskCoach({
        taskId,
        message: text,
        history: turns,
      });
      if (!r.ok) {
        if (r.error === "INSUFFICIENT_COINS") {
          toast.error(t("coachErrorCoins"));
        } else if (r.error === "NOT_AVAILABLE") {
          toast.error(t("coachErrorUnavailable"));
        } else if (r.error === "INVALID") {
          toast.error(t("coachErrorInvalid"));
        } else {
          toast.error(t("coachErrorFailed"));
        }
        setDraft(text);
        return;
      }
      setTurns((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: r.reply },
      ]);
      router.refresh();
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } finally {
      setSending(false);
    }
  }, [draft, locked, sending, taskId, turns, router, t]);

  return (
    <>
      <AnimatePresence>
        {open ?
          <>
            <motion.button
              key="coach-backdrop"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[1px] sm:bg-black/40"
              aria-label={t("coachCloseChat")}
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="coach-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-coach-heading"
              initial={{ y: "105%" }}
              animate={{ y: 0 }}
              exit={{ y: "105%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className={cn(
                "fixed z-[91] flex flex-col overflow-hidden border border-[var(--border)]/90 bg-[var(--card)] shadow-[0_-12px_48px_rgba(0,0,0,0.28)] dark:shadow-[0_-12px_48px_rgba(0,0,0,0.45)]",
                "bottom-0 left-0 right-0 max-h-[min(92dvh,44rem)] rounded-t-3xl",
                "sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:right-[max(1.25rem,env(safe-area-inset-right))] sm:left-auto sm:max-h-[min(34rem,calc(100vh-2rem))] sm:w-[min(26rem,calc(100vw-2rem))] sm:rounded-2xl",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)]/70 px-4 py-3">
                <div className="min-w-0">
                  <h2
                    id="task-coach-heading"
                    className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]"
                  >
                    <MessageCircle
                      className="size-4 shrink-0 text-[var(--accent)]"
                      aria-hidden
                    />
                    {t("coachTitle")}
                  </h2>
                  <p className="mt-1 text-xs leading-snug text-[var(--muted)]">
                    {locked ?
                      t("coachLockedHint")
                    : chargePerMessage ?
                      t("coachCostHint", { n: COIN_TASK_AI_MESSAGE })
                    : t("coachProHint")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 rounded-full"
                  onClick={() => setOpen(false)}
                  aria-label={t("coachCloseChat")}
                >
                  <X className="size-5" aria-hidden />
                </Button>
              </header>

              <div
                ref={scrollRef}
                className={cn(
                  "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3",
                  !hasThread && !locked && "flex flex-col",
                )}
              >
                {turns.length === 0 && !locked && (
                  <p className="text-sm text-[var(--muted)]">{t("coachEmpty")}</p>
                )}
                {locked && (
                  <p className="text-sm text-[var(--muted)]">
                    {t("coachLockedBody")}
                  </p>
                )}
                {turns.map((m, i) => (
                  <div
                    key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                    className={cn(
                      "rounded-lg pr-2 text-sm",
                      m.role === "user" ?
                        "border-l-2 border-[var(--accent)] pl-3"
                      : "border-l-2 border-[var(--border)] pl-3",
                    )}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {m.role === "user" ? t("coachYou") : t("coachAssistant")}
                    </p>
                    {m.role === "assistant" ?
                      <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--foreground)]">
                        <LearningRichText content={m.content} />
                      </div>
                    : <p className="whitespace-pre-wrap text-[var(--foreground)]">
                        {m.content}
                      </p>
                    }
                  </div>
                ))}
              </div>

              <footer className="shrink-0 border-t border-[var(--border)]/70 bg-[var(--card)]/95 p-3 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    locked ? t("coachPlaceholderLocked") : t("coachPlaceholder")
                  }
                  disabled={locked || sending}
                  rows={2}
                  maxLength={4000}
                  className="min-h-[3.25rem] resize-none sm:min-h-[3.5rem]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-[var(--muted)]">
                    {t("coachShortcut")}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={locked || sending || !draft.trim()}
                    onClick={() => void onSend()}
                  >
                    {sending ?
                      <>
                        <Loader2
                          className="mr-1.5 size-3.5 animate-spin"
                          aria-hidden
                        />
                        {t("coachSending")}
                      </>
                    : t("coachSend")}
                  </Button>
                </div>
              </footer>
            </motion.div>
          </>
        : null}
      </AnimatePresence>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "fixed z-[85] flex size-14 items-center justify-center rounded-full border border-white/20 bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 transition-[transform,box-shadow] hover:scale-[1.03] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.98]",
            "bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]",
          )}
          aria-label={t("coachOpenChatAria")}
          aria-haspopup="dialog"
        >
          <MessageCircle className="size-7" aria-hidden />
          {hasThread ?
            <span
              className="absolute right-1 top-1 size-2.5 rounded-full bg-emerald-400 ring-2 ring-[var(--accent)]"
              aria-hidden
            />
          : null}
        </button>
      )}
    </>
  );
}
