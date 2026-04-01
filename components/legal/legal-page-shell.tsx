import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteBrand, SiteHeaderShell } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export async function LegalPageShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "Legal" });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SiteHeaderShell>
        <SiteBrand href="/" />
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 rounded-full text-[var(--muted)] hover:text-[var(--foreground)]"
          asChild
        >
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </SiteHeaderShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </div>
    </div>
  );
}
