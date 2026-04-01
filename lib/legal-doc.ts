export type LegalSection = { title: string; body: string };

export type LegalDoc = {
  metaTitle: string;
  metaDescription: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export function getLegalDoc(
  messages: unknown,
  key: "privacy" | "terms",
): LegalDoc | null {
  const legal = (messages as { Legal?: Record<string, unknown> }).Legal;
  const raw = legal?.[key];
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<LegalDoc>;
  if (
    typeof d.metaTitle !== "string" ||
    typeof d.metaDescription !== "string" ||
    typeof d.title !== "string" ||
    typeof d.updated !== "string" ||
    typeof d.intro !== "string" ||
    !Array.isArray(d.sections)
  ) {
    return null;
  }
  const sections = d.sections.filter(
    (s): s is LegalSection =>
      typeof s === "object" &&
      s !== null &&
      typeof (s as LegalSection).title === "string" &&
      typeof (s as LegalSection).body === "string",
  );
  if (sections.length === 0) return null;
  return { ...d, sections } as LegalDoc;
}
