"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { applyReferralCode } from "@/server/actions/referral-actions";

type Props = {
  referredByUserId: string | null;
  myCode: string | null;
};

export function ReferralCard({ referredByUserId, myCode }: Props) {
  const t = useTranslations("Referral");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await applyReferralCode(code);
      if (!r.ok) {
        const key = r.error as "INVALID_CODE" | "ALREADY_REFERRED" | "UNKNOWN";
        toast.error(t(`errors.${key}`));
        return;
      }
      toast.success(t("success"));
      setCode("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription className="space-y-2">
          <span className="block">{t("body")}</span>
          <span className="block text-xs leading-relaxed text-[var(--muted)]">
            {t("joinHow")}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {myCode && (
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">
              {t("yourCode")}
            </p>
            <p className="mt-1 rounded-lg bg-[var(--accent-soft)] px-3 py-2 font-mono text-sm tracking-widest">
              {myCode}
            </p>
          </div>
        )}
        {referredByUserId ? (
          <p className="text-sm text-[var(--muted)]">{t("alreadyReferred")}</p>
        ) : (
          <>
            <Input
              placeholder={t("placeholder")}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              maxLength={16}
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={busy || code.trim().length < 4}
              onClick={() => void submit()}
            >
              {t("apply")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
