"use client";

import { useTranslations } from "next-intl";
import { LearningRichText } from "@/components/learning/learning-rich-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildCombinedTopicMarkdown,
  splitMarkdownIntoH2Segments,
} from "@/lib/task-topic-path";

type Props = {
  mentorPerspective: string | null;
  instructions: string | null;
};

export function TaskTopicWalkthrough({
  mentorPerspective,
  instructions,
}: Props) {
  const t = useTranslations("Task");
  const combined = buildCombinedTopicMarkdown(
    mentorPerspective,
    instructions,
    t("topicPathHandsOnHeading"),
  );

  if (!combined.trim()) return null;

  const segments = splitMarkdownIntoH2Segments(combined);
  const hasStructure = segments.some((s) => s.title.trim().length > 0);

  return (
    <Card className="border-[var(--accent)]/20 bg-[var(--accent-soft)]/15">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
          {t("topicPathTitle")}
        </CardTitle>
        <p className="text-sm font-normal leading-relaxed text-[var(--muted)]">
          {t("topicPathHint")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        {!hasStructure ? (
          <div className="text-[var(--foreground)] leading-relaxed">
            <LearningRichText content={segments[0]?.body ?? combined} />
          </div>
        ) : (
          <div className="space-y-8">
            {segments.map((seg, i) => (
              <div key={`${seg.title}-${i}`} className="flex gap-3 sm:gap-4">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--card)] text-xs font-semibold tabular-nums text-[var(--accent)] shadow-sm"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  {seg.title ? (
                    <h2 className="text-[1.0625rem] font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
                      {seg.title}
                    </h2>
                  ) : null}
                  {seg.body ? (
                    <div className="text-[var(--foreground)] leading-relaxed">
                      <LearningRichText content={seg.body} />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
