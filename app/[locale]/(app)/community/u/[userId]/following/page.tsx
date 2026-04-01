import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  getFollowingList,
  getFollowSocialContext,
} from "@/lib/community-follow";
import {
  getPublicProfileOrNull,
  getPublicCommunityCohort,
} from "@/lib/community-data";

type Props = { params: Promise<{ locale: string; userId: string }> };

export default async function ProfileFollowingPage({ params }: Props) {
  const { locale, userId } = await params;
  const t = await getTranslations({ locale, namespace: "Community" });

  const profile = await getPublicProfileOrNull(userId);
  if (!profile) notFound();

  const list = await getFollowingList(userId);
  const cohort = await getPublicCommunityCohort();
  const cohortIds = new Set(cohort.map((m) => m.userId));

  const display = profile.displayName ?? t("anon");
  const social = await getFollowSocialContext(userId, null);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">
        <Link
          href={`/community/u/${userId}`}
          className="font-medium text-violet-600 hover:underline dark:text-violet-300"
        >
          ← {t("backToProfile", { name: display })}
        </Link>
      </p>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("followingListTitle", { name: display })}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t("followingListSubtitle", { count: social.followingCount })}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-[var(--muted)]">{t("emptyFollowing")}</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card)]/90">
          {list.map((u) => (
            <li key={u.userId} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium">
                {u.displayName ?? t("anon")}
              </span>
              {u.profilePublic && cohortIds.has(u.userId) ? (
                <Link
                  href={`/community/u/${u.userId}`}
                  className="shrink-0 text-sm text-violet-600 hover:underline dark:text-violet-300"
                >
                  {t("profile")}
                </Link>
              ) : (
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {t("privateProfileBadge")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
