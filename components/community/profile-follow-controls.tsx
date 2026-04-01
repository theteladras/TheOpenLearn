"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/server/actions/follow-actions";

type Props = {
  targetUserId: string;
  initialFollowing: boolean;
  isSelf: boolean;
  isSignedIn: boolean;
  viewerIsFollowedBy: boolean;
};

export function ProfileFollowControls({
  targetUserId,
  initialFollowing,
  isSelf,
  isSignedIn,
  viewerIsFollowedBy,
}: Props) {
  const t = useTranslations("Community");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [following, setFollowing] = useState(initialFollowing);

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  if (isSelf) return null;

  if (!isSignedIn) {
    return (
      <Button variant="secondary" asChild className="shrink-0">
        <Link href="/sign-in">{t("signInToFollow")}</Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {viewerIsFollowedBy ? (
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-200">
          {t("followsYou")}
        </span>
      ) : null}
      <Button
        type="button"
        variant={following ? "secondary" : "default"}
        disabled={pending}
        className="shrink-0"
        onClick={() => {
          startTransition(async () => {
            const res = await toggleFollow({ targetUserId });
            if (res.ok) {
              setFollowing(res.following);
              router.refresh();
            }
          });
        }}
      >
        {following ? t("followingButton") : t("follow")}
      </Button>
    </div>
  );
}
