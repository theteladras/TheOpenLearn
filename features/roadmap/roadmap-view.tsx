"use client";

import { motion } from "framer-motion";
import { Check, Circle, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
type TaskProgressState = "LOCKED" | "AVAILABLE" | "COMPLETED";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ContinuedFromBanner,
  RoadmapContinuationPanel,
} from "./roadmap-continuation-panel";
import { RoadmapOverview } from "./roadmap-overview";

export type RoadmapViewTask = {
  id: string;
  title: string;
  status: TaskProgressState;
  order: number;
};

export type RoadmapViewPhase = {
  id: string;
  title: string;
  summary: string | null;
  order: number;
  tasks: RoadmapViewTask[];
};

type Props = {
  roadmapId: string;
  title: string;
  goal: string | null;
  description: string | null;
  estDurationLabel: string | null;
  phases: RoadmapViewPhase[];
  continuedFrom?: { id: string; title: string } | null;
};

export function RoadmapView({
  roadmapId,
  title,
  goal,
  description,
  estDurationLabel,
  phases,
  continuedFrom,
}: Props) {
  const t = useTranslations("Roadmap");

  let total = 0;
  let done = 0;
  for (const p of phases) {
    for (const task of p.tasks) {
      total++;
      if (task.status === "COMPLETED") done++;
    }
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const journeyComplete = total > 0 && done === total;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {estDurationLabel && (
          <p className="mt-1 text-sm text-[var(--muted)]">{estDurationLabel}</p>
        )}
      </div>

      {continuedFrom ? <ContinuedFromBanner parent={continuedFrom} /> : null}

      <RoadmapOverview phases={phases} />

      {description && (
        <p className="text-[var(--muted)] leading-relaxed">{description}</p>
      )}

      {goal && (
        <Card className="border-[var(--border)] bg-[var(--accent-soft)]/50">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-[var(--muted)]">
              {t("goal")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-base">{goal}</CardContent>
        </Card>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>{t("progress")}</span>
          <span className="text-[var(--muted)]">
            {done}/{total}
          </span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="space-y-10">
        {phases.map((phase, pi) => {
          const phaseTasks = phase.tasks.length;
          const phaseDone = phase.tasks.filter(
            (x) => x.status === "COMPLETED",
          ).length;
          const phaseComplete = phaseTasks > 0 && phaseDone === phaseTasks;
          return (
            <section
              key={phase.id}
              id={`phase-${phase.id}`}
              className="relative scroll-mt-28"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                  {pi + 1}
                </span>
                <div>
                  <h2 className="text-lg font-semibold">
                    {t("phase")}: {phase.title}
                  </h2>
                  {phase.summary && (
                    <p className="text-sm text-[var(--muted)]">
                      {phase.summary}
                    </p>
                  )}
                </div>
                {phaseComplete && (
                  <motion.span
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="ml-auto text-sm font-medium text-emerald-600 dark:text-emerald-400"
                  >
                    {t("phaseComplete")}
                  </motion.span>
                )}
              </div>
              <div className="grid gap-3 pl-11">
                {phase.tasks.map((task, ti) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ti * 0.04 }}
                  >
                    <Card
                      className={
                        task.status === "COMPLETED"
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : task.status === "AVAILABLE"
                            ? "border-[var(--accent)]/30"
                            : "opacity-75"
                      }
                    >
                      <CardHeader className="flex-row items-center justify-between gap-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {task.status === "COMPLETED" ? (
                              <Check className="h-5 w-5 text-emerald-500" />
                            ) : task.status === "AVAILABLE" ? (
                              <Circle className="h-5 w-5 text-[var(--accent)]" />
                            ) : (
                              <Lock className="h-4 w-4 text-[var(--muted)]" />
                            )}
                          </div>
                          <CardTitle className="text-base font-medium leading-snug">
                            {task.title}
                          </CardTitle>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            variant={
                              task.status === "COMPLETED"
                                ? "success"
                                : task.status === "AVAILABLE"
                                  ? "default"
                                  : "outline"
                            }
                          >
                            {task.status === "COMPLETED"
                              ? t("done")
                              : task.status === "AVAILABLE"
                                ? t("available")
                                : t("locked")}
                          </Badge>
                          {task.status !== "LOCKED" && (
                            <Link
                              href={`/roadmap/${roadmapId}/task/${task.id}`}
                              className="text-sm font-medium text-[var(--accent)] hover:underline"
                            >
                              {t("openTask")}
                            </Link>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {journeyComplete ? (
        <RoadmapContinuationPanel roadmapId={roadmapId} />
      ) : null}
    </div>
  );
}
