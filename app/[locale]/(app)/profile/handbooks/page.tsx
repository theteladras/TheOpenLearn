import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, BookMarked, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { handbookDisplayTitle } from "@/lib/handbook-display-title";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ locale: string }> };

export default async function HandbooksLibraryPage({ params }: Props) {
  const { locale } = await params;
  const user = await getOrCreateAppUser();
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const tProfile = await getTranslations({ locale, namespace: "Profile" });

  const rows = await prisma.lessonHandbook.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          phase: {
            select: {
              roadmapId: true,
              roadmap: { select: { title: true } },
            },
          },
        },
      },
    },
  });

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="mb-4 gap-2 px-0" asChild>
          <Link href="/profile">
            <ArrowLeft className="size-4" aria-hidden />
            {tProfile("backToOverview")}
          </Link>
        </Button>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
            <BookMarked className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("handbooksPageTitle")}
            </h1>
            <p className="text-pretty text-[var(--muted)]">
              {t("handbooksPageIntro")}
            </p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-[var(--muted)]">
            {t("handbooksEmpty")}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4" aria-label={t("handbooksPageTitle")}>
          {rows.map((row) => {
            const roadmapId = row.task.phase.roadmapId;
            const lessonHref = `/roadmap/${roadmapId}/task/${row.taskId}`;
            const pdfHref = `/api/lesson-handbook/${row.taskId}`;
            const displayTitle = handbookDisplayTitle(
              row.handbookJson,
              row.task.title,
            );

            return (
              <li key={row.id}>
                <Card className="overflow-hidden border-indigo-500/15 transition-shadow hover:shadow-md">
                  <CardHeader className="space-y-1 pb-3">
                    <CardTitle className="text-base leading-snug sm:text-lg">
                      {displayTitle}
                    </CardTitle>
                    <CardDescription className="space-y-0.5 text-sm">
                      <span className="block text-[var(--foreground)]/85">
                        {t("handbooksLessonLabel")}: {row.task.title}
                      </span>
                      <span className="block">
                        {t("handbooksJourneyLabel")}:{" "}
                        {row.task.phase.roadmap.title}
                      </span>
                      <span className="text-xs">
                        {t("handbooksAddedLabel")}:{" "}
                        {dateFmt.format(row.createdAt)}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 border-t border-[var(--border)]/60 bg-[var(--accent-soft)]/15 pt-4 pb-4">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2"
                      asChild
                    >
                      <a
                        href={pdfHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="size-4" aria-hidden />
                        {t("handbooksDownload")}
                      </a>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      asChild
                    >
                      <Link href={lessonHref}>
                        <ExternalLink className="size-4" aria-hidden />
                        {t("handbooksOpenLesson")}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
