import type {
  ContinuationSuggestionRow,
  GeneratedRoadmap,
  RoadmapGenerationInput,
  SourceAnalysisResult,
  UnderstandingInput,
  UnderstandingResult,
} from "@/types/ai";
import {
  analyzeSourceWithProvider,
  generateContinuationSuggestionsWithProvider,
  generateRoadmapWithProvider,
} from "./llm";
import {
  analyzeSourceMock,
  mockContinuationSuggestions,
  pickMockTemplates,
} from "./mock-templates";

export type AIProviderId = "mock" | "openai" | "anthropic";

function getProvider(): AIProviderId {
  const v = (process.env.AI_PROVIDER || "mock").toLowerCase();
  if (v === "openai" || v === "anthropic") return v;
  return "mock";
}

/** Stage 1: one or more proposed journeys (titles + understanding per thread). */
export async function analyzeSource(
  input: UnderstandingInput,
): Promise<SourceAnalysisResult> {
  const provider = getProvider();
  if (provider === "openai" || provider === "anthropic") {
    return analyzeSourceWithProvider(provider, input);
  }
  return analyzeSourceMock(input);
}

/** @deprecated Prefer analyzeSource (supports multi-journey). */
export async function analyzeUnderstanding(
  input: UnderstandingInput,
): Promise<UnderstandingResult> {
  const { proposals } = await analyzeSource(input);
  const first = proposals[0];
  if (!first) {
    throw new Error("Analysis returned no proposals.");
  }
  const { suggestedTitle: _t, sourceFocus: _f, ...rest } = first;
  void _t;
  void _f;
  return rest;
}

/** Stage 2: roadmap — uses confirmed understanding + original source context. */
export async function generateRoadmap(
  input: RoadmapGenerationInput,
): Promise<GeneratedRoadmap> {
  const provider = getProvider();
  if (provider === "openai" || provider === "anthropic") {
    return generateRoadmapWithProvider(provider, input);
  }
  const { roadmap } = pickMockTemplates(input.topicTitle, input.sourceContent);
  const cont = input.continuationFrom;
  const descLead = cont
    ? `*Continues from “${cont.parentRoadmapTitle}.”*\n\n`
    : "";
  const scoped = input.scopeSuggestion
    ? `${roadmap.description}\n\nScope focus: ${input.scopeSuggestion}`
    : roadmap.description;
  // pickMockTemplates already finalizes mentorPerspective for mock tasks.
  return {
    ...roadmap,
    language: input.recommendedLanguage || roadmap.language,
    goal: input.targetOutcome || roadmap.goal,
    title:
      input.interpretedSubject !== roadmap.title
        ? `${input.interpretedSubject}: structured path`
        : roadmap.title,
    description: `${descLead}${scoped}`.trim(),
  };
}

/** After a roadmap is fully completed, suggest 3–5 follow-up learning paths. */
export async function generateContinuationSuggestions(input: {
  journeyTitle: string;
  journeyGoal: string | null;
  language: string;
  completedSummary: string;
}): Promise<ContinuationSuggestionRow[]> {
  const provider = getProvider();
  if (provider === "openai" || provider === "anthropic") {
    return generateContinuationSuggestionsWithProvider(provider, input);
  }
  return mockContinuationSuggestions(input);
}
