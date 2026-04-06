import { redirect } from "@/i18n/navigation";

/**
 * Legacy `/feed` URLs (bookmarks, external links). Old `?view=rank` opens rankings.
 */
export default async function LegacyFeedRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === "string") q.set(key, val);
    else if (Array.isArray(val)) {
      const v = val[0];
      if (typeof v === "string") q.set(key, v);
    }
  }

  if (q.get("view") === "rank") {
    q.delete("view");
    const s = q.toString();
    redirect({ href: `/rankings${s ? `?${s}` : ""}`, locale });
  }

  q.delete("view");
  const s = q.toString();
  redirect({ href: `/activities${s ? `?${s}` : ""}`, locale });
}
