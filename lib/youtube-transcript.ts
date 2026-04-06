import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  fetchTranscript,
} from "youtube-transcript";

const MAX_TRANSCRIPT_CHARS = 95_000;
const TRANSCRIPT_FETCH_MS = 20_000;

const VIDEO_ID_RE = /^[\w-]{11}$/;

function isAllowedYouTubeHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "youtu.be") return true;
  if (
    h === "youtube.com" ||
    h === "www.youtube.com" ||
    h === "m.youtube.com" ||
    h === "music.youtube.com"
  ) {
    return true;
  }
  return false;
}

function normalizeVideoId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const id = raw.trim();
  if (!VIDEO_ID_RE.test(id)) return null;
  return id;
}

/**
 * Returns the video id if `url` is a supported YouTube watch / shorts / embed URL
 * on an allowed public hostname. Caller should already have validated http(s) + SSRF rules.
 */
export function parseYouTubeVideoIdFromUrl(url: URL): string | null {
  if (!isAllowedYouTubeHost(url.hostname)) return null;

  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") {
    const seg = url.pathname.replace(/^\//, "").split("/")[0];
    return normalizeVideoId(seg);
  }

  const path = url.pathname;

  if (path === "/watch" || path === "") {
    const v = url.searchParams.get("v");
    if (normalizeVideoId(v)) return v!.trim();
  }

  if (path.startsWith("/watch/")) {
    const seg = path.slice("/watch/".length).split("/")[0];
    return normalizeVideoId(seg);
  }

  for (const prefix of ["/embed/", "/shorts/", "/live/"]) {
    if (path.startsWith(prefix)) {
      const seg = path.slice(prefix.length).split("/")[0];
      const id = normalizeVideoId(seg);
      if (id) return id;
    }
  }

  return null;
}

function transcriptToPlainText(
  segments: Awaited<ReturnType<typeof fetchTranscript>>,
): string {
  const parts = segments.map((s) => s.text.replace(/\s+/g, " ").trim()).filter(Boolean);
  return parts.join(" ");
}

function mapTranscriptError(err: unknown): string {
  if (err instanceof YoutubeTranscriptDisabledError) {
    return "Captions are turned off or unavailable for this video.";
  }
  if (err instanceof YoutubeTranscriptVideoUnavailableError) {
    return "Video is unavailable or private.";
  }
  if (err instanceof YoutubeTranscriptNotAvailableError) {
    return "No transcript could be retrieved (no caption track).";
  }
  if (err instanceof YoutubeTranscriptNotAvailableLanguageError) {
    return `No transcript in the requested language (try another video or paste text).`;
  }
  if (err instanceof YoutubeTranscriptTooManyRequestError) {
    return "YouTube rate-limited the request; try again shortly or paste the transcript.";
  }
  if (err instanceof Error && err.message === "TRANSCRIPT_TIMEOUT") {
    return "Transcript fetch timed out.";
  }
  if (err instanceof Error && err.name === "AbortError") {
    return "Transcript fetch was aborted (timeout).";
  }
  return err instanceof Error ? err.message : "Transcript fetch failed.";
}

async function fetchWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("TRANSCRIPT_TIMEOUT")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export type YouTubeTranscriptAppendixResult =
  | { ok: true; appendix: string }
  | { ok: false; failureNote: string };

/**
 * Fetches captions for a YouTube video and formats an appendix for AI analysis.
 * Never throws.
 */
export async function tryBuildYouTubeTranscriptAppendix(
  pageUrl: string,
  videoId: string,
): Promise<YouTubeTranscriptAppendixResult> {
  try {
    const segments = await fetchWithTimeout(fetchTranscript(videoId), TRANSCRIPT_FETCH_MS);
    let text = transcriptToPlainText(segments);
    if (!text.trim()) {
      return {
        ok: false,
        failureNote: `\n[YouTube transcript: empty after fetch for ${pageUrl}]`,
      };
    }
    if (text.length > MAX_TRANSCRIPT_CHARS) {
      text = `${text.slice(0, MAX_TRANSCRIPT_CHARS)}…`;
    }
    const lines = [
      "",
      "--- YouTube video transcript (from captions) ---",
      `Video URL: ${pageUrl}`,
      `Video ID: ${videoId}`,
      "",
      text,
    ];
    return {
      ok: true,
      appendix: lines.join("\n"),
    };
  } catch (e) {
    const reason = mapTranscriptError(e);
    return {
      ok: false,
      failureNote: `\n[YouTube transcript could not be loaded: ${reason}]`,
    };
  }
}
