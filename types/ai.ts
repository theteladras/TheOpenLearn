import type { TopicClusterKey } from "@/lib/topic-cluster";

export type RoadmapDepth = "shallow" | "standard" | "deep";

export type SourceType = "LINK" | "PDF" | "TEXT";

/** Optional coach questions when the source is broad; user answers in follow-up round(s). */
export type AlignmentClarification = {
  preamble: string;
  questions: string[];
};

export type SourceScale = "narrow" | "moderate" | "broad" | "encyclopedic";

export type UnderstandingInput = {
  /** @deprecated Optional; AI derives titles from source. */
  topicTitle?: string;
  sourceType: SourceType;
  /** Normalized material passed to the model (URL + notes, file text, or paste). */
  sourceContent: string;
  userGoal?: string;
  targetLanguage: string;
  experienceLevel?: string;
  /**
   * Prior alignment Q&A (markdown). When set, the model refines proposals using the learner's answers
   * and may ask further questions if still ambiguous.
   */
  alignmentTranscript?: string;
};

export type UnderstandingResult = {
  interpretedSubject: string;
  intentSummary: string;
  targetOutcome: string;
  difficulty: string;
  scopeSuggestion: string;
  recommendedLanguage: string;
  readingLevel: string;
  roadmapDepth: RoadmapDepth;
};

/** One learnable thread extracted from the source (single- or multi-journey analysis). */
export type ProposedJourney = UnderstandingResult & {
  suggestedTitle: string;
  /** What part of the source this journey covers (for the user + model). */
  sourceFocus: string;
};

export type SourceAnalysisResult = {
  proposals: ProposedJourney[];
  /** Shown when multiple journeys are proposed (e.g. unrelated subjects mixed). */
  splitReason?: string;
  /** How large the source topic is; drives roadmap sizing hints. */
  sourceScale?: SourceScale;
  /**
   * When present with non-empty questions, the UI should collect answers before final confirmation.
   * Omit or empty questions when the model is aligned (including after refinement).
   */
  clarification?: AlignmentClarification | null;
};

/** Prior journey context passed into roadmap generation for follow-up paths. */
export type ContinuationFromContext = {
  parentRoadmapTitle: string;
  parentGoal: string | null;
  /** Bulleted or numbered summary of completed phases and tasks. */
  completedSummary: string;
  nextFocus: string;
  /** Which phase/task skills this path extends (shown to the model and learner). */
  buildsOn: string;
  rationale: string;
  /**
   * Lessons on the parent journey not yet passed (exam). The model must not assume mastery there;
   * new tasks should reference the prior chapter by name and deepen from completed work only.
   */
  notYetCompletedOnPrior?: string | null;
};

export type RoadmapGenerationInput = UnderstandingResult & {
  /** Stored on LearningIntent / duplicate checks; usually equals suggestedTitle. */
  topicTitle: string;
  sourceType: SourceType;
  sourceContent: string;
  userGoal?: string;
  /** When set, the roadmap explicitly continues a completed on-platform journey. */
  continuationFrom?: ContinuationFromContext;
};

/** One row from the post-completion “what’s next” table. */
export type ContinuationSuggestionRow = {
  nextFocus: string;
  buildsOn: string;
  rationale: string;
  roadmapDepth: RoadmapDepth;
  suggestedSourceHint?: string;
};

/** Row returned from the server with a stable `signature` for matching started journeys. */
export type ContinuationSuggestionRowWithSig = ContinuationSuggestionRow & {
  signature: string;
};

export type ContinuationStartedStatus = {
  childRoadmapId: string;
  childTitle: string;
  tasksDone: number;
  tasksTotal: number;
  progressPercent: number;
  status: "in_progress" | "completed";
};

export type GeneratedResource = {
  title: string;
  url?: string;
  type: string;
};

/** Stored on `TaskEvaluation.quizQuestions` and generated with each task. */
export type TaskQuizQuestion = {
  question: string;
  choices: string[];
  /** Zero-based index into `choices`. */
  correctIndex: number;
};

export type GeneratedEvaluation = {
  /** Markdown one-liner or short paragraph. */
  summary: string;
  /**
   * 2–4 interchangeable MCQ sets per task. After a failed attempt the app shows the next set
   * (same objectives, different stems/distractors). Stored as JSON `{ variants: [...] }`.
   */
  quizVariants: TaskQuizQuestion[][];
  /** Markdown; short hint for what to attach in notes. */
  checkpointDescription: string;
};

export type GeneratedTask = {
  title: string;
  /** Markdown (e.g. **bold** for key terms, lists, links) shown on the task page. */
  explanation: string;
  /** Markdown; emphasize *why* the step matters. */
  whyMatters: string;
  /**
   * Markdown — learner **deep dive**: descriptive ## sections with why/mechanism, how to think,
   * pitfalls, success criteria, and a memory-oriented segment. Not admin steps (those go in instructions).
   */
  mentorPerspective: string;
  /** Markdown; steps read best with short paragraphs or bullet lists. */
  instructions: string;
  /** 4–12 key phrases for this lesson; surfaced as Wikipedia/Google lookups in the UI. */
  keyTerms: string[];
  /** Markdown; short takeaways the learner should remember after this task. */
  recap: string;
  /** Plain-text “did you know” lines for the sidebar; 2–3 short sentences, no markdown. */
  funFacts: string[];
  /** One app topic-cluster bucket best describing this lesson’s primary focus. */
  lessonCategory: TopicClusterKey;
  /** 0–3 curated skill tags (snake_case slugs) for skill-track achievements; empty if not applicable. */
  achievementKeys: string[];
  xpReward: number;
  /** Active minutes for this lesson (reading, hands-on, quiz)—set at generation time. */
  estimatedMinutes: number;
  resources: GeneratedResource[];
  evaluation: GeneratedEvaluation;
};

export type GeneratedPhase = {
  title: string;
  summary: string;
  tasks: GeneratedTask[];
};

export type GeneratedRoadmap = {
  title: string;
  description: string;
  goal: string;
  estDurationLabel: string;
  language: string;
  phases: GeneratedPhase[];
};

/** Mock / template roadmaps before `mentorPerspective` is filled in. */
export type GeneratedTaskDraft = Omit<
  GeneratedTask,
  | "mentorPerspective"
  | "lessonCategory"
  | "achievementKeys"
  | "estimatedMinutes"
  | "keyTerms"
  | "recap"
  | "funFacts"
> & {
  lessonCategory?: TopicClusterKey;
  achievementKeys?: string[];
  estimatedMinutes?: number;
  keyTerms?: string[];
  recap?: string;
  funFacts?: string[];
};
export type GeneratedPhaseDraft = Omit<GeneratedPhase, "tasks"> & {
  tasks: GeneratedTaskDraft[];
};
export type GeneratedRoadmapDraft = Omit<GeneratedRoadmap, "phases"> & {
  phases: GeneratedPhaseDraft[];
};
