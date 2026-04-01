"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const locked = status === "LOCKED";

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
    <Card className="border-[var(--border)]/80">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4 shrink-0 text-[var(--accent)]" aria-hidden />
          {t("coachTitle")}
        </CardTitle>
        <p className="text-xs font-normal text-[var(--muted)]">
          {locked ?
            t("coachLockedHint")
          : chargePerMessage ?
            t("coachCostHint", { n: COIN_TASK_AI_MESSAGE })
          : t("coachProHint")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={scrollRef}
          className={cn(
            "max-h-[min(22rem,50vh)] space-y-3 overflow-y-auto rounded-lg border border-[var(--border)]/60 bg-[var(--muted)]/5 p-3",
            turns.length === 0 && "min-h-[4.5rem]",
          )}
        >
          {turns.length === 0 && !locked && (
            <p className="text-sm text-[var(--muted)]">{t("coachEmpty")}</p>
          )}
          {locked && (
            <p className="text-sm text-[var(--muted)]">{t("coachLockedBody")}</p>
          )}
          {turns.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={cn(
                "rounded-md pr-2 text-sm",
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
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              locked ? t("coachPlaceholderLocked") : t("coachPlaceholder")
            }
            disabled={locked || sending}
            rows={3}
            maxLength={4000}
            className="min-h-[4.5rem] resize-y"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void onSend();
              }
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
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
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                  {t("coachSending")}
                </>
              : t("coachSend")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
