import { z } from "zod";
import {
  lessonHandbookDocSchema,
  type LessonHandbookDoc,
  type LessonHandbookLLMInput,
} from "@/server/ai/lesson-handbook-schema";
import { resolveTaskLessonMinutes } from "@/lib/lesson-time-estimate";
import { normalizeTaskAchievementKeysExtended } from "@/lib/task-achievement-keys";
import { normalizeClusterKey } from "@/lib/topic-cluster";
import type {
  ContinuationSuggestionRow,
  GeneratedRoadmap,
  RoadmapGenerationInput,
  SourceAnalysisResult,
  UnderstandingInput,
} from "@/types/ai";

const roadmapDepthSchema = z.enum(["shallow", "standard", "deep"]);

const proposedJourneySchema = z.object({
  suggestedTitle: z.string(),
  sourceFocus: z.string(),
  interpretedSubject: z.string(),
  intentSummary: z.string(),
  targetOutcome: z.string(),
  difficulty: z.string(),
  scopeSuggestion: z.string(),
  recommendedLanguage: z.string(),
  readingLevel: z.string(),
  roadmapDepth: roadmapDepthSchema,
});

const sourceScaleSchema = z.enum([
  "narrow",
  "moderate",
  "broad",
  "encyclopedic",
]);

const clarificationSchema = z
  .object({
    preamble: z.string(),
    questions: z.array(z.string()).max(10),
  })
  .optional()
  .nullable();

const sourceAnalysisResultSchema = z.object({
  proposals: z.array(proposedJourneySchema).min(1),
  splitReason: z.string().optional(),
  sourceScale: sourceScaleSchema.optional(),
  clarification: clarificationSchema,
});

/**
 * Many chat models return multi-block text as `string[]`; our schema expects one markdown string.
 */
function normalizeModelString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    return val
      .map((x) => normalizeModelString(x))
      .filter((s) => s.length > 0)
      .join("\n\n");
  }
  return "";
}

/** z.string() after collapsing string | string[] | number from model JSON. */
const modelString = z.preprocess(
  (val) => normalizeModelString(val),
  z.string(),
);

const generatedResourceSchema = z.object({
  title: modelString,
  url: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === "") return undefined;
      if (Array.isArray(val)) {
        const s = val.find((x) => typeof x === "string" && x.trim().length > 0);
        return s ? String(s).trim() : undefined;
      }
      const s = normalizeModelString(val);
      return s || undefined;
    }, z.string().optional()),
  type: modelString,
});

/** Pad thin model output so MCQs always have ≥2 options (UI + grading expect that). */
function normalizeQuizChoices(choices: string[]): string[] {
  const trimmed = choices.map((c) => c.trim()).filter((c) => c.length > 0);
  if (trimmed.length >= 2) return trimmed.slice(0, 5);
  if (trimmed.length === 1) {
    return [trimmed[0], "None of the above / not applicable"];
  }
  return ["Keep studying this topic", "I'm ready to move on"];
}

const quizQuestionSchema = z
  .object({
    question: z.preprocess((v) => normalizeModelString(v), z.string().min(1)),
    choices: z
      .array(z.union([z.string(), z.array(z.string())]))
      .transform((raw) =>
        normalizeQuizChoices(
          raw.flatMap((c) => (Array.isArray(c) ? c : [c])).filter(
            (c): c is string => typeof c === "string",
          ),
        ),
      ),
    /** Models sometimes emit string indices; coerce before range check. */
    correctIndex: z.coerce.number().int().min(0),
  })
  .superRefine((q, ctx) => {
    if (q.correctIndex >= q.choices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "correctIndex out of range",
        path: ["correctIndex"],
      });
    }
  });

const generatedEvaluationSchema = z.object({
  summary: modelString,
  /** 1–5 MCQs per task; count is model-chosen (prompt asks for variety across tasks). */
  quiz: z.array(quizQuestionSchema).min(1).max(5),
  checkpointDescription: modelString,
});

const generatedTaskSchema = z.object({
  title: modelString,
  explanation: modelString,
  whyMatters: modelString,
  mentorPerspective: modelString,
  instructions: modelString,
  keyTerms: z
    .array(z.string())
    .max(12)
    .nullish()
    .transform((arr) =>
      (arr ?? [])
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean)
        .slice(0, 12),
    ),
  recap: z
    .preprocess(
      (val) =>
        val === undefined || val === null ? "" : normalizeModelString(val),
      z.string(),
    )
    .transform((s) => s.trim()),
  funFacts: z
    .preprocess((val) => {
      if (val === undefined || val === null) return [];
      if (Array.isArray(val)) {
        return val.flatMap((item) => {
          if (typeof item === "string") return [normalizeModelString(item)];
          if (Array.isArray(item))
            return item.map((x) => normalizeModelString(x));
          return [];
        });
      }
      const one = normalizeModelString(val);
      return one ? [one] : [];
    }, z.array(z.string()))
    .transform((arr) =>
      arr
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 3),
    ),
  lessonCategory: z
    .preprocess(
      (val) =>
        val === undefined || val === null ? undefined : normalizeModelString(val),
      z.string().optional(),
    )
    .transform((s) => normalizeClusterKey(s)),
  achievementKeys: z
    .array(z.string())
    .max(3)
    .optional()
    .transform((arr) =>
      normalizeTaskAchievementKeysExtended(arr ?? [], 3),
    ),
  xpReward: z.coerce.number(),
  /** Optional; string numerics allowed; invalid/absent → undefined (filled later). */
  estimatedMinutes: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const n = typeof v === "string" ? Number(v.trim()) : v;
      if (!Number.isFinite(n)) return undefined;
      const r = Math.round(n);
      if (r < 10 || r > 400) return undefined;
      return r;
    }),
  resources: z.array(generatedResourceSchema),
  evaluation: generatedEvaluationSchema,
});

const generatedPhaseSchema = z.object({
  title: modelString,
  summary: modelString,
  tasks: z.array(generatedTaskSchema),
});

const generatedRoadmapSchema = z.object({
  title: modelString,
  description: modelString,
  goal: modelString,
  estDurationLabel: modelString,
  language: modelString,
  phases: z.array(generatedPhaseSchema).min(1),
});

type ParsedGeneratedRoadmap = z.infer<typeof generatedRoadmapSchema>;

function dedupeTaskResources<
  R extends { url?: string | null; type: string; title: string },
>(resources: R[]): R[] {
  const seen = new Set<string>();
  return resources.filter((r) => {
    const u = (r.url ?? "").trim();
    if (!u) return true;
    const key = u.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** First generic link is labeled primary for the UI when the model omitted a role. */
function tagResourceRoles<
  R extends { url?: string | null; type: string; title: string },
>(resources: R[]): R[] {
  return resources.map((r, i) => {
    if (i !== 0) return r;
    const typ = (r.type ?? "").trim().toLowerCase();
    if (typ === "" || typ === "link" || typ === "other") {
      return { ...r, type: "primary" };
    }
    return r;
  });
}

function normalizeParsedRoadmap(r: ParsedGeneratedRoadmap): ParsedGeneratedRoadmap {
  return {
    ...r,
    phases: r.phases.map((ph) => ({
      ...ph,
      tasks: ph.tasks.map((t) => ({
        ...t,
        resources: tagResourceRoles(dedupeTaskResources(t.resources)),
      })),
    })),
  };
}

function withResolvedLessonTimes(roadmap: ParsedGeneratedRoadmap): GeneratedRoadmap {
  return {
    ...roadmap,
    phases: roadmap.phases.map((ph) => ({
      ...ph,
      tasks: ph.tasks.map((t) => ({
        ...t,
        estimatedMinutes: resolveTaskLessonMinutes({
          explanation: t.explanation,
          mentorPerspective: t.mentorPerspective,
          instructions: t.instructions,
          whyMatters: t.whyMatters,
          quizCount: t.evaluation.quiz.length,
          resourceCount: t.resources.length,
          storedEstimatedMinutes: t.estimatedMinutes,
          xpReward: t.xpReward,
        }),
      })),
    })),
  };
}

export const continuationSuggestionsSchema = z.object({
  rows: z
    .array(
      z.object({
        nextFocus: z.string().min(1),
        buildsOn: z.string().min(1),
        rationale: z.string().min(1),
        roadmapDepth: roadmapDepthSchema,
        suggestedSourceHint: z.string().optional(),
      }),
    )
    .min(3)
    .max(5),
});

function stripMarkdownJsonFence(raw: string): string {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  if (fence) return fence[1]!.trim();
  return t;
}

function parseJson<S extends z.ZodType>(
  raw: string,
  schema: S,
  label: string,
): z.infer<S> {
  const text = stripMarkdownJsonFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const tail = text.slice(-120).replace(/\s+/g, " ");
    throw new Error(
      `${label}: model did not return valid JSON (response may be truncated — try a smaller roadmap depth or raise OPENAI_MAX_OUTPUT_TOKENS). End of payload: …${tail}`,
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join("; ");
    throw new Error(`${label}: ${msg}`);
  }
  return result.data;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function openaiComplete(
  messages: ChatMessage[],
  jsonObject: boolean,
): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env or set AI_PROVIDER=mock.",
    );
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.35,
  };
  if (jsonObject) {
    body.response_format = { type: "json_object" };
    /**
     * Roadmaps can be large (many phases × long lesson text). Without an explicit
     * budget, the API default may truncate mid-JSON and break parsing.
     * Override with OPENAI_MAX_OUTPUT_TOKENS if your model caps lower.
     */
    const cap = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS?.trim());
    body.max_tokens = Number.isFinite(cap) && cap > 0 ? Math.min(cap, 16_384) : 16_384;
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(process.env.OPENAI_ORG_ID?.trim()
        ? { "OpenAI-Organization": process.env.OPENAI_ORG_ID.trim() }
        : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${t.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }
  return content;
}

async function anthropicComplete(
  system: string,
  user: string,
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env or set AI_PROVIDER=mock.",
    );
  }
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 16_384,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `Anthropic API error (${res.status}): ${t.slice(0, 400)}`,
    );
  }
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const parts = data.content?.filter((b) => b.type === "text") ?? [];
  const text = parts.map((b) => b.text ?? "").join("");
  if (!text.trim()) {
    throw new Error("Anthropic returned an empty response.");
  }
  return text;
}

async function completeJson(
  provider: "openai" | "anthropic",
  system: string,
  user: string,
): Promise<string> {
  if (provider === "openai") {
    return openaiComplete(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      true,
    );
  }
  return anthropicComplete(
    `${system}\n\nReply with ONLY one JSON object. No markdown fences or commentary.`,
    user,
  );
}

async function completePlainOpenAI(messages: ChatMessage[]): Promise<string> {
  return openaiComplete(messages, false);
}

async function anthropicCompleteChat(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env or set AI_PROVIDER=mock.",
    );
  }
  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(
      `Anthropic API error (${res.status}): ${t.slice(0, 400)}`,
    );
  }
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const parts = data.content?.filter((b) => b.type === "text") ?? [];
  const text = parts.map((b) => b.text ?? "").join("");
  if (!text.trim()) {
    throw new Error("Anthropic returned an empty response.");
  }
  return text;
}

const TASK_COACH_SYSTEM = `You are a patient, practical learning coach for ONE lesson inside a larger roadmap. Use only the task context provided. If something is not in context, say so briefly and give a sensible general learning tip.

Rules:
- Answer concisely (about 2–6 short paragraphs or a tight bullet list) unless the learner asks for more depth.
- Do not quote or reveal multiple-choice quiz questions or correct answers—help them understand ideas so they can answer themselves.
- Markdown is fine when useful (**bold**, short lists, \`code\` for identifiers).
- If they are stuck on steps, tie guidance to the instructions and resources named in context.
- Tone: clear, encouraging, not preachy.`;

export type TaskCoachLLMInput = {
  roadmapTitle: string;
  /** Normalized topic-cluster key for this lesson (or journey fallback). */
  lessonCategory: string;
  /** Skill-track tags shown on the lesson (e.g. react). */
  achievementKeys: string[];
  taskTitle: string;
  explanation: string | null;
  whyMatters: string | null;
  mentorPerspective: string | null;
  instructions: string | null;
  recap: string | null;
  resourcesLines: string;
  evaluationSummary: string | null;
  checkpointDescription: string | null;
  quizPassed: boolean;
  priorMessages: { role: "user" | "assistant"; content: string }[];
  newQuestion: string;
};

export async function coachTaskWithProvider(
  provider: "openai" | "anthropic",
  input: TaskCoachLLMInput,
): Promise<string> {
  const skillLine =
    input.achievementKeys.length > 0 ?
      input.achievementKeys.join(", ")
    : "(none — generic lesson)";
  const ctxParts = [
    `Roadmap: ${input.roadmapTitle}`,
    `Lesson category (subject bucket): ${input.lessonCategory}`,
    `Skill / stack tags (achievement tracks): ${skillLine}`,
    `Task: ${input.taskTitle}`,
    input.quizPassed ?
      "Learner has passed this task's self-check quiz."
    : "Learner has not passed the self-check yet (do not give quiz answers).",
    "",
    "## Overview",
    input.explanation?.trim() || "(none)",
    "",
    "## Why this matters",
    input.whyMatters?.trim() || "(none)",
    "",
    "## From your guide",
    input.mentorPerspective?.trim() || "(none)",
    "",
    "## Instructions",
    input.instructions?.trim() || "(none)",
    "",
    "## Recap (takeaways for this lesson)",
    input.recap?.trim() || "(none)",
    "",
    "## Resources",
    input.resourcesLines.trim() || "(none listed)",
    "",
    "## Self-check summary (not the questions)",
    input.evaluationSummary?.trim() || "(none)",
    "",
    "## Checkpoint / extra hints",
    input.checkpointDescription?.trim() || "(none)",
  ];
  const contextBlock = truncateMiddle(ctxParts.join("\n"), 14_000);
  const system = `${TASK_COACH_SYSTEM}\n\n---\nTASK CONTEXT:\n${contextBlock}`;

  const prior = input.priorMessages.map((m) => ({
    role: m.role,
    content: m.content.slice(0, 12_000),
  }));
  const userMsg = input.newQuestion.trim().slice(0, 4000);
  if (!userMsg) {
    throw new Error("Task coach: empty question.");
  }

  if (provider === "openai") {
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      ...prior.map(
        (m): ChatMessage => ({ role: m.role, content: m.content }),
      ),
      { role: "user", content: userMsg },
    ];
    return completePlainOpenAI(messages);
  }

  const anthMessages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...prior,
    { role: "user", content: userMsg },
  ];
  return anthropicCompleteChat(system, anthMessages);
}

const LESSON_HANDBOOK_SYSTEM = `You are a learning writer. The learner finished this lesson (including its self-check). Produce a **personal reference handbook** they can keep as a PDF: concise, accurate to the lesson context only.

Rules:
- Use ONLY the task context. Do not invent facts, URLs, or resources not implied by context.
- Do **not** include multiple-choice questions, answers, or quiz spoilers.
- **title**: a clear handbook title (may match or slightly extend the lesson title).
- **subtitle**: optional one-line scope (e.g. the journey / roadmap title).
- **sections**: 4–7 sections with **heading** + **body**. Bodies: plain language; short paragraphs or tight bullets; you may use markdown **bold** in body strings sparingly.
- Include: core ideas, how they fit together, common pitfalls, practical “when to use this”, and one **review** section with memory prompts (no answers spelled out if they duplicate quiz facts—use open prompts).
- **quickReference**: 5–10 ultra-short bullets (terms, checkpoints, or reminders) for a one-screen skim.

Return ONLY one JSON object with keys: title, optional subtitle, sections (array of {heading, body}), quickReference (array of strings).`;

export async function generateLessonHandbookWithProvider(
  provider: "openai" | "anthropic",
  input: LessonHandbookLLMInput,
): Promise<LessonHandbookDoc> {
  const skillLine =
    input.achievementKeys.length > 0 ?
      input.achievementKeys.join(", ")
    : "(none — generic lesson)";
  const ctxParts = [
    `Roadmap: ${input.roadmapTitle}`,
    `Lesson category (subject bucket): ${input.lessonCategory}`,
    `Skill / stack tags: ${skillLine}`,
    `Task: ${input.taskTitle}`,
    "The learner completed this lesson and passed the self-check.",
    "",
    "## Overview",
    input.explanation?.trim() || "(none)",
    "",
    "## Why this matters",
    input.whyMatters?.trim() || "(none)",
    "",
    "## From your guide",
    input.mentorPerspective?.trim() || "(none)",
    "",
    "## Instructions",
    input.instructions?.trim() || "(none)",
    "",
    "## Recap (takeaways)",
    input.recap?.trim() || "(none)",
    "",
    "## Resources",
    input.resourcesLines.trim() || "(none listed)",
    "",
    "## Self-check summary (concepts only — not questions)",
    input.evaluationSummary?.trim() || "(none)",
    "",
    "## Checkpoint / extra hints",
    input.checkpointDescription?.trim() || "(none)",
  ];
  const contextBlock = truncateMiddle(ctxParts.join("\n"), 14_000);
  const userMsg = [
    "Create the handbook JSON as specified.",
    "",
    "---",
    "TASK CONTEXT:",
    contextBlock,
  ].join("\n");
  const raw = await completeJson(provider, LESSON_HANDBOOK_SYSTEM, userMsg);
  return parseJson(raw, lessonHandbookDocSchema, "Lesson handbook");
}

const ANALYSIS_SYSTEM = `You are an expert learning designer. The product exists to help someone **reach real mastery**—understanding deep enough to **use the knowledge reliably** and **teach or explain it clearly** to someone else (Feynman-level clarity), not to tick boxes.

Given a learner's source material (link text, pasted notes, or upload summary), you propose one or more focused learning journeys.

Return a single JSON object with this shape:
{
  "proposals": [
    {
      "suggestedTitle": "short enticing journey title",
      "sourceFocus": "what part of the source this journey covers",
      "interpretedSubject": "clear subject line",
      "intentSummary": "2–4 sentences: what the learner seems to want",
      "targetOutcome": "concrete capability after finishing",
      "difficulty": "plain language level",
      "scopeSuggestion": "what to include / defer — be explicit about chapters, doc sections, or areas deferred",
      "recommendedLanguage": "BCP-47 code e.g. en",
      "readingLevel": "who this fits; mention experience if given",
      "roadmapDepth": "shallow" | "standard" | "deep"
    }
  ],
  "splitReason": "optional string if you output multiple proposals explaining why",
  "sourceScale": "narrow" | "moderate" | "broad" | "encyclopedic",
  "clarification": null | {
    "preamble": "1–3 sentences: why you need answers (plain, friendly)",
    "questions": ["2–6 specific questions", "..."]
  }
}

Rules:
- sourceScale: narrow = one article/chapter; moderate = one course unit; broad = full course or medium doc set; encyclopedic = official docs for a platform/language (react.dev, MDN entirety, language reference), multi-paradigm frameworks, or multiple major subsystems.
- If the material clearly mixes unrelated major topics, use multiple proposals and set splitReason.
- Otherwise one proposal is enough.
- For encyclopedic OR broad sources (especially official documentation homepages, react.dev, nextjs.org/docs, MDN): default roadmapDepth in proposals should be "deep" only if the stated learner goal clearly wants mastery; else start with "standard" but set sourceScale honestly. Always set sourceScale to encyclopedic when the URL or text clearly points at an entire documentation site or “learn X” umbrella.
- clarification: Use when you still need the learner’s help to narrow scope OR to choose a track (beginner app dev vs internals; hooks-only vs patterns; which stack; timeline). Set clarification to null when:
  (a) the learner already gave a precise goal that pins scope, OR
  (b) an "alignment transcript" section appears in the user message with Q&A — then incorporate those answers, re-issue proposals, and either set clarification to null OR ask only truly remaining questions (never repeat what was answered).
- When clarification is needed: write 2–6 concrete questions (not yes/no only — invite specifics). preamble must explain that this helps match a huge topic to their intent.
- If there is an alignment transcript, prefer raising roadmapDepth to "deep" and expanding sourceFocus when the learner asked for comprehensive / job-ready / full-framework coverage.
- recommendedLanguage should follow the learner's target language when implied; else use a sensible default.
- roadmapDepth in each proposal: shallow = quick overview; standard = typical course; deep = thorough mastery path (use for encyclopedic sources when goals warrant it).
- **targetOutcome** and **intentSummary** should imply **demonstrable skill**: what they can *do* or *teach* after the journey, not vague “awareness” unless shallow depth was explicitly chosen.
`;

const ROADMAP_SYSTEM = `You are an expert learning designer. **Purpose:** help the learner become **confidently capable** in this subject—able to apply it and **explain it effectively** (e.g. to a peer), not merely finish tasks. Every lesson you write should be **self-contained for its stated objective**: nothing required for the quiz or hands-on should be missing from the teaching blocks for that task.

Build a structured roadmap as JSON for a single learning journey.

Return ONLY JSON with this exact structure:
{
  "title": "string",
  "description": "2–4 sentences markdown OK — may briefly note that phases are **modules** in a **recommended** order, and when the topic allows **alternative entry or parallel tracks**, say so here (learner may adapt order at their own risk)",
  "goal": "single outcome sentence",
  "estDurationLabel": "human estimate e.g. 2–3 weeks · ~5 hrs/week (must match task scope; see Rules)",
  "language": "BCP-47 code",
  "phases": [
    {
      "title": "phase name",
      "summary": "one or two sentences: what this module achieves +, when natural for the subject, whether it can be **started out of sequence** or **in parallel** with another phase once named prerequisites are met (name those prerequisites explicitly)",
      "tasks": [
        {
          "title": "task title",
          "explanation": "markdown — the Overview mini-lesson (see Pedagogy rules below)",
          "whyMatters": "markdown",
          "mentorPerspective": "markdown — linear walkthrough ONLY: 3–6 segments, each starting with an h2 heading on its own line: ## First idea … ## Next idea … Write in a clear, conversational tone (like a patient tutor going step by step). Each segment connects to the next; use relatable framing and plain language. When sources are well-known sites, name concrete sections to open. Include one pitfall and what “done” looks like inside this flow—not as a separate meta lecture. Never output only “visit the link”.",
          "instructions": "markdown — concrete hands-on steps only (numbered or bullets). No repeating the conceptual walkthrough from mentorPerspective.",
          "keyTerms": ["4–10 short phrases (2–5 words each): vocabulary and proper nouns the learner will see in this task—no duplicates; no generic words like “important” or “chapter”"],
          "recap": "markdown — 3–6 tight bullets (or one short paragraph): what the learner should remember or be able to do after this task—durable takeaways only; not a repeat of the Overview",
          "funFacts": [ "plain text — memorable bonus fact about THIS task’s topic or a closely related curiosity", "plain text — second fact (history, industry pattern, learning angle, or counterintuitive detail—NOT a quiz spoiler)", "optional third plain-text fact" ],
          "lessonCategory": "general | mathematics | life-sciences | physical-sciences | computing | technology | design | languages | business | arts-humanities | health-wellbeing  (canonical slugs only; examples → biology/neuroscience/ecology → life-sciences; chemistry/physics/astronomy → physical-sciences; politics/civics/music/film/history/law/psychology → arts-humanities; marketing/finance/economics/entrepreneurship → business)",
          "achievementKeys": ["0–3 snake_case skill slugs, or []"],
          "xpReward": 30,
          "estimatedMinutes": 60,
          "resources": [
            { "title": "primary — best URL for this task", "url": "https required when you have one", "type": "primary" },
            { "title": "alternate — different angle (video, simpler explainer, official ref…)", "url": "https", "type": "alternate | video | article | doc | other" }
          ],
          "evaluation": {
            "summary": "markdown — one short line framing the self-check",
            "quiz": [
              {
                "question": "plain text — concrete MCQ stem grounded in THIS task (not generic)",
                "choices": [ "exactly 3–5 distinct options as strings; one is correct" ],
                "correctIndex": 0
              }
            ],
            "checkpointDescription": "markdown — optional notes hint if they struggle"
          }
        }
      ]
    }
  ]
}

The JSON skeleton shows one quiz item for brevity only; each real task’s evaluation.quiz array must contain **between 1 and 5** full question objects following the rules below (length varies per task).

Rules:
- **Mastery & completeness (every task):**
  - Treat each task as a **complete learning unit** for its title: every idea the learner must hold to pass the quiz and do the steps must appear in **explanation**, **mentorPerspective**, and/or **whyMatters**—not only in external links. Links deepen; they must not be the sole source of required understanding.
  - If something is assumed from **earlier in this same journey**, name it in **explanation** in one short line (e.g. “**Builds on:** … from the previous task”) so a learner who revisits or reorders has a hook.
  - **Quiz alignment:** each question must test **only** concepts or procedures **taught in this task** (or explicitly cited as build-on from earlier tasks). No “guess what I’m thinking”; no trivia not grounded in the lesson bodies.
  - **Teach-back:** in **recap**, include **one bullet** framed as what the learner could **explain to someone else in a sentence** (concrete, not “I understand X”).
- **Phases as modules:** The **array order** of phases is the **recommended** learning path. Design phases so each phase has a **coherent theme**; where the domain has **independent pillars** (e.g. separate toolchains, parallel topics), you may split them into phases that **could** be approached in a different order—**say so in that phase’s summary** and in **roadmap.description**, and cross-link in tasks (“If you skipped phase …, read … first”).
- **Deep journeys:** Prefer **misconceptions**, **edge cases**, and **“when this breaks”** in standard/deep depth so mastery is honest—not only happy paths.
- estimatedMinutes (required on every task): integer **active learning minutes** for ONE sitting with THIS task only. Do **not** reuse a default like 45 or 60 across lessons. Derive it as a tight sum (then round to the nearest integer):
  (a) **Read/teach**: combine word count of explanation + whyMatters + mentorPerspective; at **difficulty/readingLevel** from the understanding block, use roughly **110–160 words/min** for study-style reading (slower for dense or beginner text). Cap this term around **95** minutes.
  (b) **Hands-on**: count real instruction steps (numbered/bulleted items); **~3.5–5.5 minutes** per non-trivial step (typing, building, exercises). Cap around **110** minutes.
  (c) **Quiz**: **~2.5–3.5 minutes** per question.
  (d) **Resources**: add **~8–12 minutes** to skim/consult the **primary** link; **+4–7 minutes** per **additional** alternate link (partial overlap with reading is OK—keep the sum honest, not inflated).
  Add (a)+(b)+(c)+(d), clamp to **12–400**. Adjacent tasks with very different workloads MUST get visibly different totals—never round everything to the same multiple of 15 unless the sums truly match.
- resources (required on every task): **2–5** objects whenever you can justify it. **First** entry: **type** \`"primary"\` — the single best match from **sourceContent** (or the canonical doc you cite). **One or more further entries** with **type** \`"alternate"\` / \`"video"\` / \`"article"\` / \`"doc"\` — a **genuinely different** useful link (different modality, depth, audience, or official vs tutorial). Do **not** duplicate URLs; do **not** invent domains you are unsure about—prefer real URLs present in the source or well-known public docs. If the source truly supplies only one URL, still add a second entry when you know a standard reference (e.g. MDN, Wikipedia, official docs home) that fits; otherwise two entries may share relevance through title but omit url only as a last resort.
- Cross-check: Sum all task **estimatedMinutes**. That total (total active minutes) should be broadly consistent with **estDurationLabel** when interpreted as committed learning time (e.g. “~5 hrs/week for 3 weeks” ≈ **900** active minutes—your per-task sums should land in the same order of magnitude unless the label deliberately emphasizes calendar spread over seat time; if so, say so in the label).
- estDurationLabel: Choose weeks and hrs/week so their product fits the real scope of THIS roadmap’s phases and tasks. Very small roadmaps (e.g. a few compact tasks) should use shorter timelines at typical weekly hours; deep roadmaps with many substantial tasks need proportionally more. Never reuse example numbers when they disagree with how large or small the task list is.
- Phase and task counts MUST follow roadmapDepth from the input understanding (not one-size-fits-all):
  - shallow: 2–3 phases, 2–4 tasks per phase.
  - standard: 4–6 phases, 3–5 tasks per phase.
  - deep: 6–10 phases, 4–7 tasks per phase when the subject is a large framework, language, or doc site; otherwise 5–8 phases, 3–6 tasks per phase.
- Each task must be actionable. Name specific doc pages, guides, or concepts where the source is a well-known site.
- xpReward: integers 20–70 typical; boss tasks up to 90.
- lessonCategory (required on every task): pick exactly ONE **canonical** slug from: general, mathematics, life-sciences, physical-sciences, computing, technology, design, languages, business, arts-humanities, health-wellbeing. Map the lesson’s real subject into these buckets (never invent new category names): e.g. biology/botany/genetics/neuroscience/medicine basics → **life-sciences**; chemistry/physics/astronomy → **physical-sciences**; programming/software → **computing**; cloud/security/ML platforms → **technology**; UX/UI/figma/visual product → **design**; languages/linguistics → **languages**; marketing/sales/finance/business strategy → **business**; politics/civics/music/film/history/philosophy/journalism/law (non-corporate)/sociology → **arts-humanities**; clinical health/nutrition/fitness therapy focus → **health-wellbeing**. Tasks in one roadmap may use different buckets when subjects differ.
- achievementKeys (required on every task): JSON array of **0 to 3** lowercase **snake_case** strings (letters, digits, underscore; must start with a letter), each naming one concrete skill practiced **in this task**. Prefer known tags when they fit: react, nextjs, vue, svelte, angular, javascript, typescript, html_css, tailwindcss, nodejs, python, rust, go, java, csharp, sql, graphql, docker, kubernetes, aws, figma, music_theory, writing, public_speaking, data_analysis, machine_learning. If the lesson centers on another stack (e.g. kotlin, swiftui, postgres), you may use a **new** slug matching that pattern (the app will register milestones automatically). Use [] when the lesson is broad or not tied to a specific track—do not add vague tags.
- Tie tasks to the supplied source and understanding; cite URLs from the source when present.
- Every task MUST include mentorPerspective as a segmented walkthrough (see JSON shape) with real substance—not generic filler. Every task MUST include keyTerms with 4–10 distinct, task-specific phrases. Every task MUST include **recap** with **3–6** substantive bullets (or one short paragraph)—see Pedagogy; never empty or filler.
- **funFacts** (required on every task): JSON array of **2–3** short **plain-text** strings (no markdown). Each is a memorable “did you know” tied to this task’s domain—history, real-world use, a sharp analogy, or a learning-science tidbit **relevant to the subject**. Must **not** reveal quiz answers, restate recap bullets verbatim, or contradict the lesson. Language must match the journey.
- evaluation.quiz: **1–5** question objects per task. **Vary the array length across tasks** in the roadmap—do not use the same count for every task (never “always two”). Use **1** for a narrow or warmup checkpoint; **2–3** for a typical lesson task; **4–5** when the task synthesizes several concepts or roadmapDepth is deep. Each question: one unambiguous correctIndex; at least two distinct choices; stems and distractors specific to this task—no generic literacy fluff.
- language must match the journey (from input).

Pedagogy — explanation field (Overview) for EVERY task, all subjects:
- This is the primary teaching block. Never replace it with a single sentence, a restatement of the title only, or vague filler.
- Write so the learner could **re-teach** the core idea: plain language, precise terms, and a clear **because / therefore** chain—not slogan summaries.
- Define the core ideas, jargon, or constructs the task title and instructions depend on (e.g. if the task is about “components”, “entropy”, or “JOIN”, explain what that means in this context before expecting the learner to act).
- Depth floor: the Overview should read as a **real mini-lesson**—substantially more than two short paragraphs. For **standard** or **deep** roadmapDepth, prefer **4–8** short sections or well-developed blocks (headings, lists, example) so a newcomer can study only this field and grasp the task.
- Include at least one concrete illustration:
  - Programming / CLI / configs / data formats: add a minimal, correct example in a markdown fenced code block with a language tag (the learner should see working-shaped code or commands, not only prose).
  - Non-code domains: add a short worked example, numeric sketch, comparison table, or precise analogy—something the learner can anchor to, not platitudes.
- Add **Common misconceptions** or **Watch out** (short) when learners often get this wrong—skip only if the task is truly trivial.
- Use brief markdown structure when it helps: e.g. short headings (**What is X?**, **Example**, **How this ties to your task**).
- Aim for enough depth that someone new to this task could read only the Overview and understand what they are doing and why—without repeating the entire instructions section.
- **whyMatters**: minimum **two sentences** that tie this step to the journey outcome—no one-line platitudes.
- **instructions**: concrete procedural steps only—hands-on checklist style. For **standard** or **deep** journeys, prefer **4–10** numbered or bulleted steps unless the task is a micro-checkpoint (then fewer is OK; state the quick win). Do not restate the walkthrough from mentorPerspective here.
- **mentorPerspective**: the learner-facing “topic path”—not admin instructions. Use **##** headings for each segment; build ideas in order; for **deep** roadmaps, name doc sections, compare approaches, and note tradeoffs inside those segments.
- **keyTerms**: proper nouns, technical terms, and named models or ideologies that appear in this task—usable as encyclopedia search queries.
- **recap**: end-of-lesson memory anchor—**3–6** bullets (preferred) or one tight paragraph. Each point should be **specific** to this task: ideas, distinctions, or skills to retain—not generic study tips, not a copy of the Overview, not “you learned about X”. Start bullets with strong verbs or crisp noun phrases when possible. **Include exactly one teach-back bullet** (see Rules: mastery & completeness).
- instructions should stay procedural (step list); conceptual teaching stays in explanation; the walkthrough bridges explanation → action without duplicating the Overview essay.
`;

const CONTINUATION_SUGGESTIONS_SYSTEM = `You suggest logical next learning paths after a learner completed an entire roadmap on a learning app.

Return ONLY JSON:
{
  "rows": [
    {
      "nextFocus": "short name of the next topic or capability (title case)",
      "buildsOn": "explicit reference: cite phase and/or task titles from the completed journey this extends (use verbatim names from the input when possible)",
      "rationale": "1–2 sentences: why this is a natural next step",
      "roadmapDepth": "shallow" | "standard" | "deep",
      "suggestedSourceHint": "optional — doc site section, book chapter, or search phrase"
    }
  ]
}

Rules:
- Output exactly 3–5 rows, ascending in sophistication or breadth.
- buildsOn must name concrete items from the completion summary — not vague "basics".
- Do not suggest repeating milestones they already finished; extend or deepen.
- roadmapDepth: shallow = tight follow-up; standard = solid module; deep = thorough track.
- Variety: mix practical build skills, patterns, tooling, or theory as fits the subject.
`;

function truncateMiddle(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = Math.floor(max * 0.55);
  const tail = max - head - 20;
  return `${s.slice(0, head)}\n\n[...truncated…]\n\n${s.slice(-Math.max(0, tail))}`;
}

function normalizeSourceAnalysis(
  raw: z.infer<typeof sourceAnalysisResultSchema>,
): SourceAnalysisResult {
  const qc = raw.clarification?.questions?.map((q) => q.trim()).filter(Boolean) ?? [];
  const clarification =
    raw.clarification && qc.length > 0 ?
      {
        preamble: raw.clarification.preamble.trim(),
        questions: qc.slice(0, 8),
      }
    : undefined;

  return {
    proposals: raw.proposals,
    splitReason: raw.splitReason,
    sourceScale: raw.sourceScale,
    clarification: clarification ?? null,
  };
}

export async function analyzeSourceWithProvider(
  provider: "openai" | "anthropic",
  input: UnderstandingInput,
): Promise<SourceAnalysisResult> {
  const userBits = [
    `sourceType: ${input.sourceType}`,
    input.userGoal ? `statedGoal: ${input.userGoal}` : null,
    `targetLanguage: ${input.targetLanguage}`,
    input.experienceLevel ? `experienceLevel: ${input.experienceLevel}` : null,
    input.alignmentTranscript?.trim() ?
      `\nalignment transcript (questions we asked and learner answers — use this; do not re-ask resolved points):\n${truncateMiddle(input.alignmentTranscript.trim(), 24_000)}`
    : null,
    "",
    "sourceContent:",
    truncateMiddle(input.sourceContent, 32_000),
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await completeJson(
    provider,
    ANALYSIS_SYSTEM,
    `Analyze and output JSON.\n\n${userBits}`,
  );
  const parsed = parseJson(raw, sourceAnalysisResultSchema, "Source analysis");
  return normalizeSourceAnalysis(parsed);
}

export async function generateRoadmapWithProvider(
  provider: "openai" | "anthropic",
  input: RoadmapGenerationInput,
): Promise<GeneratedRoadmap> {
  const understandingLines = [
    `interpretedSubject: ${input.interpretedSubject}`,
    `intentSummary: ${input.intentSummary}`,
    `targetOutcome: ${input.targetOutcome}`,
    `difficulty: ${input.difficulty}`,
    `scopeSuggestion: ${input.scopeSuggestion}`,
    `recommendedLanguage: ${input.recommendedLanguage}`,
    `readingLevel: ${input.readingLevel}`,
    `roadmapDepth: ${input.roadmapDepth}`,
  ].join("\n");

  const cont = input.continuationFrom;
  const continuationBlock = cont
    ? [
        "---",
        "CONTINUATION (mandatory): The learner has a prior journey in this app. You MUST:",
        "- Start **description** with one short sentence naming the **prior journey title** and stating this path is the **next chapter** (linked learning), not a restart.",
        "- Across **phases** and **tasks**: reference the prior journey by title in **at least two** natural places (e.g. phase summary + one task overview), so chapters feel explicitly linked.",
        "- In each task **explanation** (Overview): when useful, add one line **Prior chapter:** what they should already know from the completed summary below (do not repeat long teaching—point to the idea).",
        "- Phase 1 must bridge from **completedSummary** (mastered lessons only). Do not re-teach those topics unless a one-line reminder is needed for the new depth.",
        "- Increase depth, edge cases, and integration vs the prior chapter; **avoid duplicating task titles** from the completion summary.",
        cont.notYetCompletedOnPrior ?
          [
            "They have NOT yet finished everything on the prior journey. **notYetCompleted** lists open lessons—treat these as **not mastered**; you may optionally position a task as preparation for those gaps, but do not assume they did them.",
            "notYetCompleted:",
            cont.notYetCompletedOnPrior,
          ].join("\n")
        : null,
        `Prior journey title: ${cont.parentRoadmapTitle}`,
        cont.parentGoal ? `Prior learning goal: ${cont.parentGoal}` : null,
        "They have completed (exam-passed) at least:",
        cont.completedSummary,
        `Learner-chosen next focus: ${cont.nextFocus}`,
        `Builds on (must inform sequencing): ${cont.buildsOn}`,
        `Designer rationale: ${cont.rationale}`,
        "---",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const userBits = [
    `storageTopicTitle: ${input.topicTitle}`,
    `sourceType: ${input.sourceType}`,
    input.userGoal ? `statedGoal: ${input.userGoal}` : null,
    "",
    understandingLines,
    "",
    "sourceContent (for grounding tasks and resources):",
    truncateMiddle(input.sourceContent, 40_000),
    continuationBlock ? `\n${continuationBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const extraInstruction = cont
    ? " This is a CONTINUATION roadmap — honor the CONTINUATION block above in structure and difficulty."
    : "";

  const raw = await completeJson(
    provider,
    ROADMAP_SYSTEM,
    [
      `Produce the roadmap JSON.${extraInstruction}`,
      "",
      userBits,
      "",
      "Design for **mastery and teach-back** (see system Rules): no quiz-only gaps; each task’s teaching blocks carry the understanding required for that task.",
      "Phases: recommended order = JSON array order; use **phase summaries** and **description** to note **reorder / parallel** options only when the subject truly supports it.",
      "Per task, set evaluation.quiz to 1–5 questions and vary the count across tasks (mix of 1s, 2s, 3s, and occasional 4–5 for dense or capstone steps). Avoid giving every task the same number of questions.",
      "Every task object MUST include estimatedMinutes (integer) computed from THAT task’s explanation, walkthrough, instruction steps, quiz length, and resource count—see Rules (no generic round numbers shared across tasks).",
      "Every task MUST include at least two resources when possible: primary + alternate URLs (see Rules).",
      "Every task MUST include a non-empty recap (see Pedagogy), including the **teach-back** bullet.",
      "Every task MUST include funFacts: **2–3** plain-text strings—sidebar bonus facts; not quiz spoilers (see Rules).",
    ].join("\n"),
  );
  const parsed = normalizeParsedRoadmap(
    parseJson(raw, generatedRoadmapSchema, "Roadmap generation"),
  );
  const descLead = cont
    ? `*Continues from “${cont.parentRoadmapTitle}.”*\n\n`
    : "";
  const scoped = input.scopeSuggestion
    ? `${parsed.description}\n\nScope focus: ${input.scopeSuggestion}`
    : parsed.description;
  const resolved = withResolvedLessonTimes(parsed);
  return {
    ...resolved,
    language: input.recommendedLanguage || resolved.language,
    goal: input.targetOutcome || resolved.goal,
    title:
      input.interpretedSubject !== resolved.title
        ? `${input.interpretedSubject}: structured path`
        : resolved.title,
    description: `${descLead}${scoped}`.trim(),
  };
}

export async function generateContinuationSuggestionsWithProvider(
  provider: "openai" | "anthropic",
  input: {
    journeyTitle: string;
    journeyGoal: string | null;
    language: string;
    completedSummary: string;
  },
): Promise<ContinuationSuggestionRow[]> {
  const userBits = [
    `journeyTitle: ${input.journeyTitle}`,
    input.journeyGoal ? `journeyGoal: ${input.journeyGoal}` : null,
    `contentLanguage: ${input.language}`,
    "",
    "completedPhasesAndTasks (verbatim structure — use these names in buildsOn):",
    truncateMiddle(input.completedSummary, 12_000),
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await completeJson(
    provider,
    CONTINUATION_SUGGESTIONS_SYSTEM,
    [`Suggest next steps JSON.\n\n${userBits}`].join("\n"),
  );
  const parsed = parseJson(
    raw,
    continuationSuggestionsSchema,
    "Continuation suggestions",
  );
  return parsed.rows;
}
