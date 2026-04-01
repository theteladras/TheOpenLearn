"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { humanizeSkillKeyForAchievement } from "@/lib/achievement-humanize";
import {
  isTaskAchievementKey,
  isValidSkillAchievementKeyPart,
} from "@/lib/task-achievement-keys";

type Props = {
  keys: string[];
  /** Optional section label (e.g. roadmap card). */
  label?: string;
  className?: string;
};

export function TaskAchievementChips({ keys, label, className }: Props) {
  const t = useTranslations("TaskAchievementKeys");
  const filtered = keys.filter(isValidSkillAchievementKeyPart);
  if (!filtered.length) return null;

  return (
    <div className={className}>
      {label ? (
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
          {label}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-1.5" aria-label={label}>
        {filtered.map((k) => (
          <li key={k}>
            <Badge
              variant="muted"
              className="border-[var(--border)]/80 bg-[var(--accent-soft)]/40 px-2 py-0 text-[10px] font-medium text-[var(--foreground)]"
            >
              {isTaskAchievementKey(k) ? t(k) : humanizeSkillKeyForAchievement(k)}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
