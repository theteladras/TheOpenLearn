import { createHash } from "node:crypto";
import type { ContinuationSuggestionRow } from "@/types/ai";

/** Stable id for a continuation suggestion row (same input → same signature). */
export function continuationRowSignature(
  row: Pick<
    ContinuationSuggestionRow,
    "nextFocus" | "buildsOn" | "rationale" | "roadmapDepth"
  >,
): string {
  const payload = [
    row.nextFocus.trim(),
    row.buildsOn.trim(),
    row.rationale.trim(),
    row.roadmapDepth,
  ].join("\x1e");
  return createHash("sha256").update(payload, "utf8").digest("base64url").slice(0, 32);
}
