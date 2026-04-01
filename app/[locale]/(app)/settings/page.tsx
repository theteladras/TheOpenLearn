import { getTranslations } from "next-intl/server";
import { AppLanguageSettings } from "@/features/settings/app-language-settings";
import { CommunitySettingsForm } from "@/features/community/community-settings-form";
import { getOrCreateAppUser } from "@/lib/auth-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsPage({ params }: Props) {
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
