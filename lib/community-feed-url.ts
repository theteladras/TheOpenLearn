import type { CommunityFeedKind, CommunityFeedScope } from "@/lib/community-data";
import type { SortMode } from "@/lib/community-sort";

export type CommunityViewTab = "feed" | "rank";

export function parseCommunityView(raw: string | undefined): CommunityViewTab {
  return raw === "rank" ? "rank" : "feed";
}

export function parseFeedScope(raw: string | undefined): CommunityFeedScope {
  return raw === "following" ? "following" : "all";
}

export function parseFeedKind(raw: string | undefined): CommunityFeedKind {
  if (raw === "task" || raw === "badge") return raw;
  return "all";
}

/** Builds `/feed` URLs (social feed + rankings tabs). */
export function feedHref(opts: {
  view: CommunityViewTab;
  sort?: SortMode;
  cluster?: string | null;
  feedScope?: CommunityFeedScope;
  act?: CommunityFeedKind;
}): string {
  const p = new URLSearchParams();
  if (opts.view === "rank") {
    p.set("view", "rank");
    const sort = opts.sort ?? "lessons";
    if (sort !== "lessons") p.set("sort", sort);
    if (opts.cluster) p.set("cluster", opts.cluster);
  } else {
    if (opts.feedScope === "following") p.set("feed", "following");
    const act = opts.act ?? "all";
    if (act !== "all") p.set("act", act);
  }
  const q = p.toString();
  return `/feed${q ? `?${q}` : ""}`;
}
