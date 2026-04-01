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
  /** 1–5 multiple-choice questions grounded in this task (see generation prompt). */
  quiz: TaskQuizQuestion[];
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
   * Markdown — the model's concrete guidance: what to open first, what to skim vs read,
   * named pitfalls, and what “done” looks like. Must not be only “visit the documentation”.
   */
  mentorPerspective: string;
  /** Markdown; steps read best with short paragraphs or bullet lists. */
  instructions: string;
  xpReward: number;
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
export type GeneratedTaskDraft = Omit<GeneratedTask, "mentorPerspective">;
export type GeneratedPhaseDraft = Omit<GeneratedPhase, "tasks"> & {
  tasks: GeneratedTaskDraft[];
};
export type GeneratedRoadmapDraft = Omit<GeneratedRoadmap, "phases"> & {
  phases: GeneratedPhaseDraft[];
};
