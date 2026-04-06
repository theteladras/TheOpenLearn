/**
 * Build one markdown stream for the task page: conversational segments + hands-on block.
 */
export function buildCombinedTopicMarkdown(
  mentorPerspective: string | null | undefined,
  instructions: string | null | undefined,
  handsOnHeading: string,
): string {
  const m = mentorPerspective?.trim() ?? "";
  const ins = instructions?.trim() ?? "";
  if (!m && !ins) return "";
  if (!ins) return m;
  if (!m) {
    return ins.startsWith("##") ? ins : `## ${handsOnHeading}\n\n${ins}`;
  }
  const instBlock = ins.startsWith("##") ? ins : `## ${handsOnHeading}\n\n${ins}`;
  return `${m}\n\n${instBlock}`;
}

export type TopicPathSegment = {
  title: string;
  body: string;
};

/**
 * Split markdown on at-line-start ## headings (h2). If there are no headings,
 * returns a single segment with empty title and the full body.
 */
export function splitMarkdownIntoH2Segments(md: string): TopicPathSegment[] {
  const trimmed = md.trim();
  if (!trimmed) return [];

  const lines = trimmed.split("\n");
  const segments: TopicPathSegment[] = [];
  let title = "";
  const bodyLines: string[] = [];

  const flush = () => {
    const body = bodyLines.join("\n").trim();
    if (title || body) {
      segments.push({ title, body });
    }
    title = "";
    bodyLines.length = 0;
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      flush();
      title = h2[1].trim();
    } else {
      bodyLines.push(line);
    }
  }
  flush();
  return segments;
}
