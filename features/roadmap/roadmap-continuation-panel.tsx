"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link, useRouter } from "@/i18n/navigation";
import type {
  ContinuationStartedStatus,
  ContinuationSuggestionRowWithSig,
} from "@/types/ai";
import {
  fetchRoadmapContinuationSuggestions,
  startContinuationFromRoadmap,
} from "@/server/actions/learning-actions";

export function RoadmapContinuationPanel({ roadmapId }: { roadmapId: string }) {
  const t = useTranslations("Roadmap");
  const router = useRouter();
  const [rows, setRows] = useState<ContinuationSuggestionRowWithSig[] | null>(
    null,
  );
  const [startedBySignature, setStartedBySignature] = useState<
    Record<string, ContinuationStartedStatus>
  >({});
  const [suggestionsFromCache, setSuggestionsFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startingSignature, setStartingSignature] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await fetchRoadmapContinuationSuggestions(roadmapId);
    if (!res.ok) {
      if (res.error === "JOURNEY_NOT_COMPLETE") {
        setRows(null);
        setStartedBySignature({});
        setLoading(false);
        return;
      }
      setLoadError(res.error);
      setRows(null);
      setStartedBySignature({});
      setLoading(false);
      toast.error(t("continuationError"));
      return;
    }
    setRows(res.rows);
    setStartedBySignature(res.startedBySignature);
    setSuggestionsFromCache(res.suggestionsFromCache);
    setLoading(false);
  }, [roadmapId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  async function onStart(row: ContinuationSuggestionRowWithSig) {
    setStartingSignature(row.signature);
    const res = await startContinuationFromRoadmap({
      parentRoadmapId: roadmapId,
      nextFocus: row.nextFocus,
      buildsOn: row.buildsOn,
      rationale: row.rationale,
      roadmapDepth: row.roadmapDepth,
    });
    setStartingSignature(null);
    if (!res.ok) {
      if (res.error === "INSUFFICIENT_COINS") {
        toast.error(t("continuationInsufficientCoins"));
        return;
      }
      if (res.error === "CONTINUATION_ALREADY_FINISHED" && res.roadmapId) {
        toast.info(t("continuationAlreadyFinished"));
        router.push(`/roadmap/${res.roadmapId}`);
        return;
      }
      toast.error(res.error);
      return;
    }
    toast.success(
      res.reused ? t("continuationReused") : t("continuationStarted"),
    );
    router.push(`/roadmap/${res.roadmapId}`);
  }

  if (loading) {
    return (
      <Card
        className="border-[var(--border)] bg-[var(--accent-soft)]/25"
        role="status"
        aria-busy="true"
        aria-label={t("continuationTitle")}
      >
        <CardHeader className="py-4">
          <CardTitle className="text-base">{t("continuationTitle")}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 text-[var(--foreground)]">
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]"
              aria-hidden
            />
            <span>{t("continuationLoading")}</span>
          </CardDescription>
          <p className="text-xs text-[var(--muted)]">{t("continuationLoadingHint")}</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]/60 p-3">
            <div className="mb-3 h-8 animate-pulse rounded-md bg-[var(--border)]/80" />
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="mb-2 flex gap-3 border-b border-[var(--border)]/60 py-3 last:mb-0 last:border-0"
              >
                <div className="h-10 flex-1 animate-pulse rounded bg-[var(--border)]/60" />
                <div className="hidden h-10 w-24 animate-pulse rounded bg-[var(--border)]/60 sm:block" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="border-rose-500/35 bg-rose-500/[0.06] dark:border-rose-400/30 dark:bg-rose-400/[0.08]">
        <CardHeader className="py-4">
          <CardTitle className="text-base">{t("continuationTitle")}</CardTitle>
          <CardDescription className="font-medium text-rose-700 dark:text-rose-300">
            {t("continuationError")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="break-words font-mono text-xs text-[var(--muted)]">
            {loadError.length > 400 ? `${loadError.slice(0, 400)}…` : loadError}
          </p>
          <p className="text-xs text-[var(--muted)]">{t("continuationErrorHint")}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            {t("continuationRetry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!rows || rows.length === 0) return null;

  const depthLabel = (d: ContinuationSuggestionRowWithSig["roadmapDepth"]) => {
    if (d === "shallow") return t("depthShallow");
    if (d === "deep") return t("depthDeep");
    return t("depthStandard");
  };

  return (
    <Card className="border-[var(--border)] bg-[var(--accent-soft)]/25">
      <CardHeader className="py-4">
        <CardTitle className="text-base">{t("continuationTitle")}</CardTitle>
        <CardDescription>
          {suggestionsFromCache ?
            t("continuationIntroCached")
          : t("continuationIntro")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">{t("continuationColNext")}</TableHead>
              <TableHead className="w-[18%]">
                {t("continuationColBuildsOn")}
              </TableHead>
              <TableHead>{t("continuationColWhy")}</TableHead>
              <TableHead className="w-20">{t("continuationColDepth")}</TableHead>
              <TableHead className="min-w-[9rem]">
                {t("continuationColStatus")}
              </TableHead>
              <TableHead className="w-36 text-right">
                {t("continuationColAction")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const started = startedBySignature[row.signature];
              const busy = startingSignature === row.signature;
              return (
                <TableRow key={row.signature}>
                  <TableCell className="align-top font-medium">
                    <span>{row.nextFocus}</span>
                    {row.suggestedSourceHint ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {row.suggestedSourceHint}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top text-sm text-[var(--muted)]">
                    {row.buildsOn}
                  </TableCell>
                  <TableCell className="align-top text-sm">{row.rationale}</TableCell>
                  <TableCell className="align-top text-sm">
                    {depthLabel(row.roadmapDepth)}
                  </TableCell>
                  <TableCell className="align-top">
                    {!started ? (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    ) : (
                      <div className="space-y-2">
                        <Badge
                          variant={
                            started.status === "completed" ? "success" : "default"
                          }
                        >
                          {started.status === "completed" ?
                            t("continuationStatusComplete")
                          : t("continuationStatusProgress")}
                        </Badge>
                        <p className="text-xs text-[var(--muted)]">
                          {t("continuationTasksProgress", {
                            done: started.tasksDone,
                            total: started.tasksTotal,
                          })}
                        </p>
                        <Progress
                          value={started.progressPercent}
                          className="h-1.5 max-w-[8rem]"
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right">
                    {started?.status === "completed" ?
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/roadmap/${started.childRoadmapId}`}>
                          {t("continuationViewJourney")}
                        </Link>
                      </Button>
                    : started ?
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          router.push(
                            `/roadmap/${started.childRoadmapId}`,
                          )
                        }
                      >
                        {t("continuationContinue")}
                      </Button>
                    : <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => onStart(row)}
                      >
                        {busy ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("continuationStarting")}
                          </>
                        ) : (
                          t("continuationStart")
                        )}
                      </Button>
                    }
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="mt-4 text-xs text-[var(--muted)]">
          {t("continuationFootnote")}
        </p>
      </CardContent>
    </Card>
  );
}

type ContinuedProps = {
  parent: { id: string; title: string };
};

export function ContinuedFromBanner({ parent }: ContinuedProps) {
  const t = useTranslations("Roadmap");
  return (
    <Card className="border-[var(--border)] border-dashed bg-[var(--background)]/80">
      <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
        <span className="text-[var(--muted)]">{t("continuedFromLabel")}</span>
        <Link
          href={`/roadmap/${parent.id}`}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          {parent.title}
        </Link>
      </CardContent>
    </Card>
  );
}
