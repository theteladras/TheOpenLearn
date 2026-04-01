"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCommunityProfile } from "@/server/actions/community-settings-actions";

export function CommunitySettingsForm({
  initialPublic,
  initialBio,
}: {
  initialPublic: boolean;
  initialBio: string;
}) {
  const t = useTranslations("Community");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const profilePublic = fd.get("profilePublic") === "on";
    const publicBio = String(fd.get("publicBio") ?? "");
    const res = await updateCommunityProfile({ profilePublic, publicBio });
    setPending(false);
    if (!res.ok) {
      toast.error(t("toastError"));
      return;
    }
    toast.success(t("toastSaved"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <input
          id="profilePublic"
          name="profilePublic"
          type="checkbox"
          value="on"
          defaultChecked={initialPublic}
          className="mt-1 size-4 rounded border-[var(--border)]"
        />
        <div className="min-w-0 space-y-1">
          <Label htmlFor="profilePublic" className="cursor-pointer text-base">
            {t("formPublicLabel")}
          </Label>
          <p className="text-sm text-[var(--muted)]">{t("formPublicHelp")}</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="publicBio">{t("formBioLabel")}</Label>
        <Textarea
          id="publicBio"
          name="publicBio"
          rows={3}
          maxLength={280}
          defaultValue={initialBio}
          placeholder={t("formBioPlaceholder")}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? t("formSaving") : t("formSave")}
      </Button>
    </form>
  );
}
