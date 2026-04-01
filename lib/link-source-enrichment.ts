/**
 * Fetches a user-provided documentation URL and appends same-site links + a text excerpt
 * for AI analysis. Includes basic SSRF protections for server-side fetch.
 */

const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_LINKS = 55;
const EXCERPT_CHARS = 12_000;

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".localhost")) return true;
  if (h === "0.0.0.0") return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (ipv4) {
    const [a0, b0] = ipv4.slice(1, 3).map(Number);
    if (a0 === 127) return true;
    if (a0 === 10) return true;
    if (a0 === 172 && b0 >= 16 && b0 <= 31) return true;
    if (a0 === 192 && b0 === 168) return true;
    if (a0 === 169 && b0 === 254) return true;
    if (a0 === 0) return true;
  }

  if (h === "[::1]" || h === "::1") return true;
  if (h.endsWith(".internal")) return true;
  return false;
}

function safeParsePublicHttpUrl(urlString: string): URL | null {
  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (isBlockedHostname(u.hostname)) return null;
  return u;
}

function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const re =
    /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = (m[1] ?? m[2] ?? m[3])?.trim();
    if (href) out.push(href);
  }
  return out;
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function docLinkScore(pathname: string): number {
  const p = pathname.toLowerCase();
  let s = 0;
  if (/\/docs?(\/|$)/.test(p)) s += 6;
  if (/\/guide/.test(p)) s += 4;
  if (/\/learn|tutorial|reference|\/api(\/|$)/.test(p)) s += 3;
  if (/\/getting-started|quickstart|installation/.test(p)) s += 2;
  if (/\/blog|\/changelog|\/news/.test(p)) s -= 2;
  return s;
}

function sameSiteDocLinks(baseUrl: URL, hrefs: string[]): string[] {
  const baseHost = normalizeHost(baseUrl.hostname);
  const scored: { url: string; score: number; key: string }[] = [];
  const seen = new Set<string>();

  for (const href of hrefs) {
    const trimmed = href.trim();
    if (!trimmed || trimmed === "#" || trimmed.startsWith("#")) continue;
    if (/^(mailto:|tel:|javascript:|data:)/i.test(trimmed)) continue;

    let u: URL;
    try {
      u = new URL(trimmed, baseUrl);
    } catch {
      continue;
    }
    if (!safeParsePublicHttpUrl(u.toString())) continue;
    if (normalizeHost(u.hostname) !== baseHost) continue;

    const path = u.pathname;
    if (
      /\.(png|jpe?g|gif|webp|svg|ico|css|js|mjs|map|woff2?|ttf|eot|mp4|webm|zip|gz)(\?|$)/i.test(
        path,
      )
    ) {
      continue;
    }

    const key = `${path}${u.search}`;
    if (seen.has(key)) continue;
    seen.add(key);

    scored.push({
      url: u.href.split("#")[0] ?? u.href,
      score: docLinkScore(path),
      key,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return scored.slice(0, MAX_LINKS).map((x) => x.url);
}

function extractTitle(html: string): string | undefined {
  const m = /<title[^>]*>\s*([^<]*?)\s*<\/title>/is.exec(html);
  const t = m?.[1]?.replace(/\s+/g, " ").trim();
  return t || undefined;
}

function htmlToPlainExcerpt(html: string, maxLen: number): string {
  let t = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  t = t.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t;
}

async function fetchHtmlFollowingRedirects(
  startUrl: string,
): Promise<
  | { ok: true; html: string; finalUrl: URL }
  | { ok: false; reason: string }
> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = safeParsePublicHttpUrl(current);
    if (!parsed) {
      return { ok: false, reason: "URL blocked or invalid for fetch." };
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(parsed.href, {
        method: "GET",
        redirect: "manual",
        signal: ac.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "TheOpenLearn/1.0 (documentation link enrichment; +https://openlearn.app)",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) {
          return { ok: false, reason: `Redirect ${res.status} without Location.` };
        }
        current = new URL(loc, parsed).href;
        continue;
      }

      if (!res.ok) {
        return {
          ok: false,
          reason: `HTTP ${res.status} when fetching page.`,
        };
      }

      const ct = res.headers.get("content-type") ?? "";
      if (!/\btext\/html\b/i.test(ct) && !/\bapplication\/xhtml\+xml\b/i.test(ct)) {
        return {
          ok: false,
          reason: "Response is not HTML (cannot extract documentation links).",
        };
      }

      const buf = await res.arrayBuffer();
      const slice =
        buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
      const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
      return { ok: true, html, finalUrl: parsed };
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.name === "AbortError"
            ? "Request timed out."
            : e.message
          : "Fetch failed.";
      return { ok: false, reason: msg };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, reason: "Too many redirects." };
}

const PACKED_SOURCE_MAX = 120_000;

/**
 * Builds an appendix to append after the primary link + user notes: same-host
 * documentation links from the HTML plus a plain-text excerpt. Never throws.
 * Truncate with `truncatePackedSource` before persisting if needed.
 */
export async function buildLinkSourceAppendix(primaryUrl: string): Promise<string> {
  const initial = safeParsePublicHttpUrl(primaryUrl.trim());
  if (!initial) {
    return "\n[Link enrichment skipped: URL is not an allowed public http(s) address.]";
  }

  const fetched = await fetchHtmlFollowingRedirects(initial.href);
  if (!fetched.ok) {
    return `\n[Could not fetch page for related documentation links: ${fetched.reason}]`;
  }

  const { html, finalUrl } = fetched;
  const title = extractTitle(html);
  const hrefs = extractHrefs(html);
  const links = sameSiteDocLinks(finalUrl, hrefs);
  const excerpt = htmlToPlainExcerpt(html, EXCERPT_CHARS);

  const lines: string[] = [
    "",
    "--- Fetched page (for related documentation on the same site) ---",
  ];
  if (title) lines.push(`Page title: ${title}`);
  lines.push(`Fetched URL: ${finalUrl.href}`);
  lines.push(
    `Same-site pages linked from this document (${links.length} of ${hrefs.length} raw hrefs, navigation/heuristic filter):`,
  );
  if (links.length) {
    for (const u of links) lines.push(`- ${u}`);
  } else {
    lines.push(
      "(none — page may use client-side routing, strict CSP, or links point off-domain.)",
    );
  }
  lines.push("");
  lines.push("--- Plain-text excerpt from the page (trimmed) ---");
  lines.push(excerpt);

  return lines.join("\n");
}

export function truncatePackedSource(content: string, max = PACKED_SOURCE_MAX): string {
  if (content.length <= max) return content;
  return `${content.slice(0, max)}\n\n[…truncated; content exceeded ${max} characters]`;
}
