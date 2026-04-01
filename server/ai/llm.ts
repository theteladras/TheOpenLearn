import { z } from "zod";
import { resolveTaskEstimatedMinutes } from "@/lib/lesson-time-estimate";
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

function withResolvedLessonTimes(roadmap: ParsedGeneratedRoadmap): GeneratedRoadmap {
  return {
    ...roadmap,
    phases: roadmap.phases.map((ph) => ({
      ...ph,
      tasks: ph.tasks.map((t) => ({
        ...t,
        estimatedMinutes: resolveTaskEstimatedMinutes(
          t.estimatedMinutes,
          t.xpReward,
          t.evaluation.quiz.length,
        ),
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

const ANALYSIS_SYSTEM = `You are an expert learning designer. Given a learner's source material (link text, pasted notes, or upload summary), you propose one or more focused learning journeys.

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
`;

const ROADMAP_SYSTEM = `You are an expert learning designer. Build a structured roadmap as JSON for a single learning journey.

Return ONLY JSON with this exact structure:
{
  "title": "string",
  "description": "2–4 sentences markdown OK",
  "goal": "single outcome sentence",
  "estDurationLabel": "human estimate e.g. 2–3 weeks · ~5 hrs/week (must match task scope; see Rules)",
  "language": "BCP-47 code",
  "phases": [
    {
      "title": "phase name",
      "summary": "one sentence",
      "tasks": [
        {
          "title": "task title",
          "explanation": "markdown — the Overview mini-lesson (see Pedagogy rules below)",
          "whyMatters": "markdown",
          "mentorPerspective": "markdown — 2–4 short paragraphs as an expert coach: name specific doc areas/sections when the source is a well-known site (e.g. Vercel: Projects, env vars, deployments); what to skim vs read deeply; one common pitfall; what 'done' looks like. Never only say 'visit the link' without this substance.",
          "instructions": "markdown — concrete hands-on steps only; learners already have concepts and examples from explanation",
          "lessonCategory": "general | mathematics | life-sciences | physical-sciences | computing | technology | design | languages | business | arts-humanities | health-wellbeing",
          "achievementKeys": ["0–3 snake_case skill slugs, or []"],
          "xpReward": 30,
          "estimatedMinutes": 60,
          "resources": [ { "title": "string", "url": "https optional", "type": "link|doc|video|other" } ],
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
- estimatedMinutes (required on every task): integer **active learning minutes** for one focused sitting—reading the Overview, executing instructions (including typing/building), using resources as implied, and finishing the quiz. Judge pace using the learner’s **difficulty** and **readingLevel** from the input understanding. Bands (flexible): tight checkpoint **20–40**; typical lesson **40–95**; dense, multi-part, or capstone **95–200**. Minutes must rise with real heft: longer teaching in explanation, more instruction steps, more quiz items, and higher xpReward should all push the number up—not a flat constant across tasks.
- Cross-check: Sum all task **estimatedMinutes**. That total (total active minutes) should be broadly consistent with **estDurationLabel** when interpreted as committed learning time (e.g. “~5 hrs/week for 3 weeks” ≈ **900** active minutes—your per-task sums should land in the same order of magnitude unless the label deliberately emphasizes calendar spread over seat time; if so, say so in the label).
- estDurationLabel: Choose weeks and hrs/week so their product fits the real scope of THIS roadmap’s phases and tasks. Very small roadmaps (e.g. a few compact tasks) should use shorter timelines at typical weekly hours; deep roadmaps with many substantial tasks need proportionally more. Never reuse example numbers when they disagree with how large or small the task list is.
- Phase and task counts MUST follow roadmapDepth from the input understanding (not one-size-fits-all):
  - shallow: 2–3 phases, 2–4 tasks per phase.
  - standard: 4–6 phases, 3–5 tasks per phase.
  - deep: 6–10 phases, 4–7 tasks per phase when the subject is a large framework, language, or doc site; otherwise 5–8 phases, 3–6 tasks per phase.
- Each task must be actionable. Name specific doc pages, guides, or concepts where the source is a well-known site.
- xpReward: integers 20–70 typical; boss tasks up to 90.
- lessonCategory (required on every task): pick exactly ONE bucket for that task’s primary skill—general, mathematics, life-sciences, physical-sciences, computing, technology, design, languages, business, arts-humanities, health-wellbeing. Use the best fit for the lesson itself (tasks in the same roadmap may differ, e.g. one “setup IDE” → computing, one “study chord progressions” → arts-humanities).
- achievementKeys (required on every task): JSON array of **0 to 3** lowercase **snake_case** strings (letters, digits, underscore; must start with a letter), each naming one concrete skill practiced **in this task**. Prefer known tags when they fit: react, nextjs, vue, svelte, angular, javascript, typescript, html_css, tailwindcss, nodejs, python, rust, go, java, csharp, sql, graphql, docker, kubernetes, aws, figma, music_theory, writing, public_speaking, data_analysis, machine_learning. If the lesson centers on another stack (e.g. kotlin, swiftui, postgres), you may use a **new** slug matching that pattern (the app will register milestones automatically). Use [] when the lesson is broad or not tied to a specific track—do not add vague tags.
- Tie tasks to the supplied source and understanding; cite URLs from the source when present.
- Every task MUST include mentorPerspective with real navigational and conceptual guidance (not generic filler).
- evaluation.quiz: **1–5** question objects per task. **Vary the array length across tasks** in the roadmap—do not use the same count for every task (never “always two”). Use **1** for a narrow or warmup checkpoint; **2–3** for a typical lesson task; **4–5** when the task synthesizes several concepts or roadmapDepth is deep. Each question: one unambiguous correctIndex; at least two distinct choices; stems and distractors specific to this task—no generic literacy fluff.
- language must match the journey (from input).

Pedagogy — explanation field (Overview) for EVERY task, all subjects:
- This is the primary teaching block. Never replace it with a single sentence, a restatement of the title only, or vague filler.
- Define the core ideas, jargon, or constructs the task title and instructions depend on (e.g. if the task is about “components”, “entropy”, or “JOIN”, explain what that means in this context before expecting the learner to act).
- Depth floor: the Overview should read as a **real mini-lesson**—substantially more than two short paragraphs. For **standard** or **deep** roadmapDepth, prefer **4–8** short sections or well-developed blocks (headings, lists, example) so a newcomer can study only this field and grasp the task.
- Include at least one concrete illustration:
  - Programming / CLI / configs / data formats: add a minimal, correct example in a markdown fenced code block with a language tag (the learner should see working-shaped code or commands, not only prose).
  - Non-code domains: add a short worked example, numeric sketch, comparison table, or precise analogy—something the learner can anchor to, not platitudes.
- Add **Common misconceptions** or **Watch out** (short) when learners often get this wrong—skip only if the task is truly trivial.
- Use brief markdown structure when it helps: e.g. short headings (**What is X?**, **Example**, **How this ties to your task**).
- Aim for enough depth that someone new to this task could read only the Overview and understand what they are doing and why—without repeating the entire instructions section.
- **whyMatters**: minimum **two sentences** that tie this step to the journey outcome—no one-line platitudes.
- **instructions**: concrete procedural steps only. For **standard** or **deep** journeys, prefer **4–10** numbered or bulleted steps unless the task is an intentional micro-checkpoint (then fewer is OK, but state the quick win clearly).
- **mentorPerspective**: for **deep** roadmaps, be extra explicit—name doc sections, compare approaches, note tradeoffs, and spell out what “done” looks like.
- instructions should stay procedural (step list); do not move all teaching into instructions—keep conceptual teaching in explanation.
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
        "CONTINUATION (mandatory): The learner finished a prior journey in this app. You MUST:",
        "- Start description with one short sentence that names the prior journey and states this path continues from it.",
        "- Phase 1 should bridge from their completed work — reference buildsOn; do not re-teach what they already completed.",
        "- Increase depth appropriately; avoid duplicating task titles from the completion summary.",
        `Prior journey title: ${cont.parentRoadmapTitle}`,
        cont.parentGoal ? `Prior learning goal: ${cont.parentGoal}` : null,
        "They completed:",
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
      "Per task, set evaluation.quiz to 1–5 questions and vary the count across tasks (mix of 1s, 2s, 3s, and occasional 4–5 for dense or capstone steps). Avoid giving every task the same number of questions.",
      "Every task object MUST include estimatedMinutes (integer, see Rules).",
    ].join("\n"),
  );
  const parsed = parseJson(raw, generatedRoadmapSchema, "Roadmap generation");
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
