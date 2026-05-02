/**
 * Event kinds that can appear on the activity timeline and be filtered via `?act=`.
 * Add new kinds here and extend `getCommunityActivityFeed` / UI filters together.
 */
export type ActivityTimelineEventTypeId = "task" | "badge" | "coach";

export const ACTIVITY_TIMELINE_EVENT_TYPES: readonly {
  readonly id: ActivityTimelineEventTypeId;
}[] = [{ id: "task" }, { id: "badge" }, { id: "coach" }] as const;
