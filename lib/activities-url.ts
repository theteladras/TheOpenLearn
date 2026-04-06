import type { CommunityFeedKind, CommunityFeedScope } from "@/lib/community-data";
import type { SortMode } from "@/lib/community-sort";

export function parseActivityScope(raw: string | undefined): CommunityFeedScope {
  return raw === "following" ? "following" : "all";
}

export function parseActivityKind(raw: string | undefined): CommunityFeedKind {
  if (raw === "task" || raw === "badge") return raw;
  return "all";
}

/** Timeline: `/activities` — scope via legacy `?feed=following`, kind via `?act=`. */
export function activitiesHref(opts: {
  feedScope?: CommunityFeedScope;
  act?: CommunityFeedKind;
}): string {
  const p = new URLSearchParams();
  if (opts.feedScope === "following") p.set("feed", "following");
  const act = opts.act ?? "all";
  if (act !== "all") p.set("act", act);
  const q = p.toString();
  return `/activities${q ? `?${q}` : ""}`;
}

/** Learner rankings: `/rankings`. */
export function rankingsHref(opts: {
  sort?: SortMode;
  cluster?: string | null;
}): string {
  const p = new URLSearchParams();
  const sort = opts.sort ?? "lessons";
  if (sort !== "lessons") p.set("sort", sort);
  if (opts.cluster) p.set("cluster", opts.cluster);
  const q = p.toString();
  return `/rankings${q ? `?${q}` : ""}`;
}
