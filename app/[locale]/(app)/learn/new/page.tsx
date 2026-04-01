import { getTranslations } from "next-intl/server";
import { CreateLearningWizard } from "@/features/learning/create-learning-wizard";

type Props = { params: Promise<{ locale: string }> };

export default async function NewLearnPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Learn" });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <CreateLearningWizard />
    </div>
  );
}
