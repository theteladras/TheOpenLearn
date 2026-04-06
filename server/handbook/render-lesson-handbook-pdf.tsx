import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { LessonHandbookDoc } from "@/server/ai/lesson-handbook-schema";

/** Extra bottom padding so flowing text does not sit under the fixed footer. */
const FOOTER_CLEARANCE_PT = 52;
const HEADER_BG = "#312e81";
const HEADER_TEXT = "#eef2ff";
const ACCENT = "#4f46e5";
const MUTED = "#64748b";
const PANEL_BG = "#f1f5f9";
const RULE = "#e2e8f0";

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingHorizontal: 44,
    paddingBottom: FOOTER_CLEARANCE_PT,
    fontSize: 10.2,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  /** Runs on every page when the Page has wrap */
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 34,
    backgroundColor: HEADER_BG,
    paddingHorizontal: 44,
    paddingTop: 10,
  },
  headerLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: HEADER_TEXT,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  coverBlock: {
    marginBottom: 22,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
  },
  title: {
    fontSize: 22,
    lineHeight: 1.25,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 10.5,
    color: MUTED,
    lineHeight: 1.4,
  },
  section: {
    marginBottom: 14,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  /** Keeps outline near following text (react-pdf wrapping hint). */
  sectionHeading: {
    fontSize: 11.5,
    marginBottom: 5,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  bodyParagraph: {
    lineHeight: 1.55,
    marginBottom: 5,
    textAlign: "justify",
    orphans: 2,
    widows: 2,
  },
  quickRefSection: {
    marginTop: 18,
    padding: 14,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 3,
  },
  quickRefTitle: {
    fontSize: 11.5,
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  bullet: {
    marginLeft: 4,
    marginBottom: 4,
    lineHeight: 1.45,
    color: "#334155",
    fontFamily: "Helvetica",
  },
  bulletPrefix: {
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 44,
    right: 44,
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 6,
    textAlign: "right",
  },
});

function stripMd(s: string): string {
  return s.replace(/\*\*/g, "").replace(/`/g, "");
}

/** Split model text into paragraphs for cleaner page breaks. */
function bodyParagraphs(body: string): string[] {
  const stripped = stripMd(body).trim();
  if (!stripped) return [];
  return stripped
    .split(/\n\s*\n|(?:\r?\n){2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function HandbookPdfInner({
  doc,
  footerLine,
}: {
  doc: LessonHandbookDoc;
  footerLine: string;
}) {
  const docTitle = stripMd(doc.title).slice(0, 200);

  return (
    <Document
      title={docTitle}
      author="The Open Learn"
      subject="Lesson handbook"
      keywords="learning, handbook, the open learn"
    >
      {/*
        Single <Page wrap> grows into multiple PDF pages. Fixed header/footer repeat on each.
      */}
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.headerLabel}>
            The Open Learn — lesson handbook
          </Text>
        </View>

        <View wrap={false} style={styles.coverBlock}>
          <Text bookmark={{ title: docTitle, fit: true }} style={styles.title}>
            {stripMd(doc.title)}
          </Text>
          {doc.subtitle ? (
            <Text style={styles.subtitle}>{stripMd(doc.subtitle)}</Text>
          ) : null}
        </View>

        {doc.sections.map((sec, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionHeading} minPresenceAhead={72}>
              {stripMd(sec.heading)}
            </Text>
            {bodyParagraphs(sec.body).map((para, pi) => (
              <Text key={pi} style={styles.bodyParagraph}>
                {para}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.quickRefSection}>
          <Text style={styles.quickRefTitle}>Quick reference</Text>
          {doc.quickReference.map((line, i) => (
            <Text key={i} style={styles.bullet}>
              <Text style={styles.bulletPrefix}>• </Text>
              <Text>{stripMd(line)}</Text>
            </Text>
          ))}
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${footerLine}    ·    Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export async function lessonHandbookToPdfBuffer(
  doc: LessonHandbookDoc,
  footerLine: string,
): Promise<Buffer> {
  const element = <HandbookPdfInner doc={doc} footerLine={footerLine} />;
  return renderToBuffer(element);
}
