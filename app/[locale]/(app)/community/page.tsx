import { redirect } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CommunityRedirectPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === "string") {
      q.set(key, val);
    } else if (Array.isArray(val)) {
      const v = val[0];
      if (typeof v === "string") q.set(key, v);
    }
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect({ href: `/feed${suffix}`, locale });
}
