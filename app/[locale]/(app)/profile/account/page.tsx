import { Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppLanguageSettings } from "@/features/settings/app-language-settings";
import { CommunitySettingsForm } from "@/features/community/community-settings-form";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = { params: Promise<{ locale: string }> };

export default async function ProfileAccountPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settings" });
  const user = await getOrCreateAppUser();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-[var(--muted)]">{t("intro")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("languageTitle")}</CardTitle>
          <CardDescription>{t("languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AppLanguageSettings />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[var(--border)]/80 bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--accent-soft)]/35 dark:to-[var(--accent-soft)]/15">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm ring-1 ring-[var(--border)]/60">
              <Trophy className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-lg">
                {t("achievementsTitle")}
              </CardTitle>
              <CardDescription>{t("achievementsDescription")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button variant="secondary" asChild className="w-full sm:w-auto">
            <Link href="/profile/achievements">{t("achievementsCta")}</Link>
          </Button>
        </CardContent>
      </Card>

      <section id="visibility" className="scroll-mt-28">
        <Card>
          <CardHeader>
            <CardTitle>{t("communityTitle")}</CardTitle>
            <CardDescription>{t("communityDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CommunitySettingsForm
              initialPublic={user.profilePublic}
              initialBio={user.publicBio ?? ""}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
