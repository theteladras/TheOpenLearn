import type { TaskAchievementKey } from "@/lib/task-achievement-keys";
import { resolveTaskLessonMinutes } from "@/lib/lesson-time-estimate";
import { pickLearningSideFacts } from "@/lib/task-side-facts";
import { inferTopicCluster } from "@/lib/topic-cluster";
import type {
  LessonHandbookDoc,
  LessonHandbookLLMInput,
} from "@/server/ai/lesson-handbook-schema";
import type {
  ContinuationSuggestionRow,
  GeneratedRoadmap,
  GeneratedRoadmapDraft,
  GeneratedResource,
  ProposedJourney,
  SourceAnalysisResult,
  TaskQuizQuestion,
  UnderstandingInput,
  UnderstandingResult,
} from "@/types/ai";

function twinQuizVariants(quiz: TaskQuizQuestion[]): TaskQuizQuestion[][] {
  return [
    quiz,
    quiz.map((q) => ({
      ...q,
      question: `${q.question} (alternate form)`,
    })),
  ];
}

function inferAchievementKeysFromTask(t: {
  title: string;
  instructions: string;
  resources: { url?: string; title: string }[];
}): string[] {
  const blob = `${t.title} ${t.instructions} ${t.resources.map((r) => `${r.url ?? ""} ${r.title}`).join(" ")}`.toLowerCase();
  const out: string[] = [];
  const add = (k: TaskAchievementKey) => {
    if (!out.includes(k) && out.length < 3) out.push(k);
  };
  const has = (re: RegExp) => re.test(blob);

  if (has(/\breact\b|react\.dev|\bjsx\b/) && !has(/\breactive\b/)) add("react");
  if (has(/next\.js|nextjs|nextjs\.org/)) add("nextjs");
  if (has(/\bvue\b|vuejs/)) add("vue");
  if (has(/\bsvelte\b|sveltekit/)) add("svelte");
  if (has(/\bangular\b/)) add("angular");
  if (has(/\bjavascript\b|\bjs\b|ecmascript|mdn.*js/)) add("javascript");
  if (has(/\btypescript\b|\bts\b|\.tsx\b/)) add("typescript");
  if (has(/\bhtml\b|\bcss\b|web fundamentals/)) add("html_css");
  if (has(/\btailwind\b/)) add("tailwindcss");
  if (has(/\bnode\.?js\b|\bnode\b.*npm/)) add("nodejs");
  if (has(/\bpython\b|pypi|django|fastapi|flask/)) add("python");
  if (has(/\brust\b|cargo\b|crates\.io/)) add("rust");
  if (has(/\bgo\b|golang\.org/)) add("go");
  if (has(/java(?!script)/) || has(/spring\.io/)) add("java");
  if (has(/\bc#\b|\.net\b|csharp/)) add("csharp");
  if (has(/\bsql\b|postgres|mysql|sqlite/) && !has(/graphql/)) add("sql");
  if (has(/graphql/)) add("graphql");
  if (has(/\bdocker\b|dockerfile/)) add("docker");
  if (has(/kubernetes|\bk8s\b|helm\b/)) add("kubernetes");
  if (has(/\baws\b|amazon web services|s3\b|lambda\b/)) add("aws");
  if (has(/\bfigma\b/)) add("figma");
  if (has(/\bmusic\b|chord|scale|harmony\b/) && !has(/\breact\b/))
    add("music_theory");
  if (has(/\bwriting\b|essay|prose\b/)) add("writing");
  if (has(/\bspeak\b|presentation|public speak/)) add("public_speaking");
  if (has(/\bdata\b.*analy|pandas|notebook|spreadsheet/)) add("data_analysis");
  if (has(/machine learning|\bml\b|neural|pytorch|tensorflow\b/))
    add("machine_learning");

  return out;
}

function defaultTaskRecap(title: string): string {
  return [
    `- You focused on **${title}** using the path and links for this lesson.`,
    `- Jot down one sentence in your notes about what you will use from this step next.`,
  ].join("\n");
}

function defaultMentorPerspective(
  title: string,
  resources: GeneratedResource[],
): string {
  const named = resources.find((r) => r.title)?.title;
  const start = named
    ? `Open **${named}** and read any intro or “Getting started” section first—avoid jumping into random deep pages.`
    : `Skim headings until you find the part that matches “${title}”, then read that section fully.`;
  return [
    "## Why one anchor page first\n\n" + start,
    "## How much depth is enough\n\nYou do not need the whole reference in one sitting—one focused subsection for this task is enough.",
    "## What to extract (and why it sticks)\n\nDefinitions, one worked example, and any “common mistakes” or FAQ—these are what you’ll actually remember.",
    "## A common trap\n\nEndless scrolling without a question. Pick one concrete question before you read and stop when you can answer it in one sentence.",
    "## Remember this\n\n**One sentence:** you’re done when you can name one idea from the source you could explain to a friend without reopening the tab.",
  ].join("\n\n");
}

export function finalizeMockRoadmap(
  draft: GeneratedRoadmapDraft,
): GeneratedRoadmap {
  return {
    ...draft,
    phases: draft.phases.map((ph) => ({
      ...ph,
      tasks: ph.tasks.map((t) => {
        const mentorPerspective = defaultMentorPerspective(
          t.title,
          t.resources,
        );
        return {
          ...t,
          lessonCategory:
            t.lessonCategory ??
            inferTopicCluster(`${ph.title} ${draft.title}`, t.title),
          achievementKeys:
            t.achievementKeys ??
            inferAchievementKeysFromTask({
              title: t.title,
              instructions: t.instructions,
              resources: t.resources,
            }),
          mentorPerspective,
          keyTerms: t.keyTerms ?? [],
          recap: t.recap?.trim() ? t.recap : defaultTaskRecap(t.title),
          funFacts:
            t.funFacts && t.funFacts.filter((s) => s?.trim()).length >= 2
              ? t.funFacts
                  .map((s) => (typeof s === "string" ? s.trim() : ""))
                  .filter(Boolean)
                  .slice(0, 3)
              : pickLearningSideFacts(`${ph.title}::${t.title}`, 2),
          estimatedMinutes: resolveTaskLessonMinutes({
            explanation: t.explanation,
            mentorPerspective,
            instructions: t.instructions,
            whyMatters: t.whyMatters,
            quizCount: Math.max(
              ...t.evaluation.quizVariants.map((v) => v.length),
              0,
            ),
            resourceCount: t.resources.length,
            storedEstimatedMinutes: t.estimatedMinutes,
            xpReward: t.xpReward,
          }),
        };
      }),
    })),
  };
}

function reactUnderstanding(): UnderstandingResult {
  return {
    interpretedSubject: "React — modern UI development",
    intentSummary:
      "You want to learn React well enough to read docs confidently and build interactive interfaces with components, state, and hooks.",
    targetOutcome:
      "Ship a small SPA feature using function components, hooks, and sensible data flow.",
    difficulty: "Intermediate foundations",
    scopeSuggestion:
      "Cover JSX, components, state, effects, and routing — skip advanced internals until later.",
    recommendedLanguage: "en",
    readingLevel: "Clear technical writing; assumes basic JavaScript",
    roadmapDepth: "standard",
  };
}

function reactUnderstandingDeep(
  lang: string,
  experienceLevel?: string,
): UnderstandingResult {
  const levelNote = experienceLevel
    ? ` Stated level: ${experienceLevel}.`
    : "";
  return {
    interpretedSubject: "React — documentation-scale curriculum",
    intentSummary:
      `After scope alignment, this path mirrors a broad react.dev-style journey: UI as a function of state, hooks, effects, context, data and performance, toward production patterns.${levelNote}`,
    targetOutcome:
      "Ship non-trivial React features with sound hook usage, data flow, and awareness of docs on concurrent features and server components where relevant.",
    difficulty: "Structured progression from core UI to advanced patterns",
    scopeSuggestion:
      "Spans major Learn React sections plus selected deep dives — exact emphasis follows your alignment answers.",
    recommendedLanguage: lang,
    readingLevel:
      "Assumes solid JavaScript; ramps into intermediate and advanced React",
    roadmapDepth: "deep",
  };
}

function reactRoadmap(): GeneratedRoadmapDraft {
  return {
    title: "React fundamentals from real-world sources",
    description:
      "A phased path from JavaScript comfort to building coherent UIs with React 19 patterns.",
    goal: "Build and explain a small React UI using hooks and composable components.",
    estDurationLabel: "3–4 weeks · ~6–8 hrs/week",
    language: "en",
    phases: [
      {
        title: "Orientation",
        summary: "Map the mental model before touching tooling.",
        tasks: [
          {
            title: "Why React exists",
            explanation:
              "Understand declarative UI: describe state, React reconciles the DOM.",
            whyMatters:
              "Saves you from imperative spaghetti when apps grow past a few screens.",
            instructions:
              "Skim your source for “component” and “state” mentions. Write 5 bullets: what problem React solves.",
            xpReward: 30,
            resources: [
              {
                title: "React docs — Describing the UI",
                url: "https://react.dev/learn/describing-the-ui",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Quick check: declarative UI vs manual DOM updates.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "In React’s declarative model, you mostly describe ___ and the library reconciles output.",
                  choices: [
                    "UI from component state and props",
                    "Every DOM mutation by hand in nested callbacks",
                    "Only CSS class names, never structure",
                    "Server HTML with zero JavaScript",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription:
                "Record a 60s voice note or short paragraph summarizing declarative UI.",
            },
          },
          {
            title: "Build your first component",
            explanation: `### What is a component?

In React, a **component** is a reusable piece of UI, usually written as a **function** that returns **JSX** (HTML-like syntax). React calls your function, takes the elements you return, and updates the screen. Big screens are trees of small components.

**JSX** is syntax sugar: the compiler turns tags like \`<h1>Hi</h1>\` into \`React.createElement\` calls.

### Minimal example

\`\`\`jsx
function Welcome() {
  return <h1>Hello, world!</h1>;
}
\`\`\`

\`<Welcome />\` is used like a custom HTML tag; React renders the returned tree.

### What you’ll do next

You’ll create a small file that defines your own component and render it from the app root—the same pattern as the docs, with your own message.`,
            whyMatters:
              "Components are how you structure every React app; getting the file + export + import flow solid early prevents hours of confusion later.",
            instructions: `1. Create a new file \`Message.js\` (or \`.jsx\` if your setup uses that extension).
2. Write a **function component** that returns a \`<div>\` containing the text you want to show (your “message”).
3. In \`App.js\`, **import** your component and render it inside the app (e.g. \`<Message />\`) so it appears on screen.`,
            xpReward: 35,
            resources: [
              {
                title: "React docs — Your first component",
                url: "https://react.dev/learn/your-first-component",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Check that you can describe components, JSX, and how files connect.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "JSX is best described as syntax sugar for which underlying call?",
                  choices: [
                    "React.createElement",
                    "document.querySelector",
                    "addEventListener",
                    "fetch()",
                  ],
                  correctIndex: 0,
                },
                {
                  question:
                    "In React, a simple UI component is usually:",
                  choices: [
                    "A function that returns elements (JSX) for React to render",
                    "A CSS file with no JavaScript",
                    "A database table definition",
                    "Only an HTML file with no imports",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription:
                "If your component doesn’t render, check for syntax errors in JSX (every tag closed, one root element) and that the import path in `App.js` matches your filename.",
            },
          },
        ],
      },
      {
        title: "Interactivity",
        summary: "State, events, and effects — the daily bread of React apps.",
        tasks: [
          {
            title: "State and events",
            explanation:
              "Local state with `useState`; events update state and re-render.",
            whyMatters: "Most bugs come from unclear ownership of state.",
            instructions:
              "Design a counter + toggle using one piece of state each. Note derived vs source state.",
            xpReward: 40,
            resources: [
              {
                title: "React docs — State",
                url: "https://react.dev/learn/state-a-components-memory",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Separate source state from derived values.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "useState is typically used for:",
                  choices: [
                    "Local component state that changes over time",
                    "Styling only, never data",
                    "Replacing the need for any props",
                    "Fetching data without effects",
                  ],
                  correctIndex: 0,
                },
                {
                  question:
                    "Derived state (e.g. filtered list from search term) should usually be:",
                  choices: [
                    "Computed during render from source state—not cloned into a second useState",
                    "Duplicated in a second useState always",
                    "Stored only in global variables",
                    "Ignored in favor of console.log",
                  ],
                  correctIndex: 0,
                },
                {
                  question:
                    "After calling a state setter, the new state value is available:",
                  choices: [
                    "On the next render—not immediately in the same synchronous block",
                    "Instantly on the next line in the same function always",
                    "Only after a full page reload",
                    "Never; setState is cosmetic only",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Add diagram or bullet list in notes.",
            },
          },
          {
            title: "Effects and data",
            explanation:
              "`useEffect` syncs components with external systems; dependency arrays matter.",
            whyMatters: "Misused effects cause stale data and infinite loops.",
            instructions:
              "List two legit effect use cases from your material vs list two things better done elsewhere.",
            xpReward: 45,
            resources: [
              {
                title: "React docs — You Might Not Need an Effect",
                url: "https://react.dev/learn/you-might-not-need-an-effect",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Show you know when effects are warranted.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "useEffect is primarily for:",
                  choices: [
                    "Synchronizing the component with an external system",
                    "Replacing useState for all variables",
                    "Making renders faster automatically",
                    "Avoiding JSX entirely",
                  ],
                  correctIndex: 0,
                },
                {
                  question:
                    "The dependency array’s main purpose is to:",
                  choices: [
                    "Tell React when to re-run the effect after relevant values change",
                    "List all CSS classes used",
                    "Replace props entirely",
                    "Disable TypeScript checking",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Short write-up in task notes.",
            },
          },
        ],
      },
      {
        title: "Integration",
        summary: "Tie skills into a coherent mini-feature.",
        tasks: [
          {
            title: "Mini feature plan",
            explanation:
              "Pick one UI flow (e.g. filtered list) using components + hooks only.",
            whyMatters: "Integration proves the roadmap stuck — not just isolated tutorials.",
            instructions:
              "Break the flow into 3 components, define state per component, sketch data flow.",
            xpReward: 50,
            resources: [
              {
                title: "React docs — Passing data deep with context",
                url: "https://react.dev/learn/passing-data-deeply-with-context",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Coherent component boundaries.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "When planning a mini UI flow, you should usually:",
                  choices: [
                    "Split into components with clear state ownership",
                    "Use one giant component for the whole app always",
                    "Avoid props and use only globals",
                    "Skip data flow planning",
                  ],
                  correctIndex: 0,
                },
                {
                  question:
                    "React Context is most justified when:",
                  choices: [
                    "Many components need the same data and prop-drilling hurts",
                    "You want to replace all useState hooks",
                    "You only pass data one level down",
                    "You never share state",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Upload sketch or notes in the task panel.",
            },
          },
        ],
      },
    ],
  };
}

function musicUnderstanding(): UnderstandingResult {
  return {
    interpretedSubject: "Music theory — fundamentals",
    intentSummary:
      "Build literacy in pitch, scales, intervals, and chords so you can analyse simple pieces and communicate with other musicians.",
    targetOutcome:
      "Spell intervals, build a major scale in any key, and name triads in a lead sheet context.",
    difficulty: "Beginner-friendly with steady practice",
    scopeSuggestion:
      "Pitch & rhythm first, then diatonic harmony — defer modulation and jazz extensions.",
    recommendedLanguage: "en",
    readingLevel: "Accessible explanations with light terminology",
    roadmapDepth: "standard",
  };
}

function musicRoadmap(): GeneratedRoadmapDraft {
  return {
    title: "Music theory essentials",
    description:
      "From notes on the staff to functional harmony — paced for learners with a PDF or text backbone.",
    goal: "Read basic notation and explain why common chord progressions “work.”",
    estDurationLabel: "4–6 weeks · flexible pace",
    language: "en",
    phases: [
      {
        title: "Building blocks",
        summary: "Notes, rhythm, and the major scale fingerprint.",
        tasks: [
          {
            title: "The chromatic canvas",
            explanation:
              "Twelve pitch classes, accidentals, and how notation maps to the keyboard.",
            whyMatters: "Everything later assumes you can navigate pitch space quickly.",
            instructions:
              "From your PDF/text excerpt: list note names in order for one octave. Mark half vs whole steps between neighbors.",
            xpReward: 25,
            resources: [
              {
                title: "Open Music Theory — Pitch",
                url: "https://viva.pressbooks.pub/openmusictheory/chapter/pitch/",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Accurate step pattern within an octave.",
              quizVariants: twinQuizVariants([
                {
                  question: "In C major, the pattern of steps between scale degrees 1–8 is:",
                  choices: [
                    "W W H W W W H (whole and half steps)",
                    "All half steps only",
                    "W H W W H W W",
                    "No fixed pattern",
                  ],
                  correctIndex: 0,
                },
                {
                  question: "The seven natural letter names used in Western notation are:",
                  choices: [
                    "A B C D E F G (each appears once per octave cycle)",
                    "Only C and G",
                    "Do Re Mi exclusively (no letters)",
                    "H I J K L M N",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Complete table in notes or photo of handwritten sketch.",
            },
          },
          {
            title: "Major scale formula",
            explanation: "WWHWWWH — the template behind “bright” diatonic melodies.",
            whyMatters: "Scales are the grammar of melody and harmony.",
            instructions:
              "Build G major and F major using the template. Notate or tab the scale degrees 1–8.",
            xpReward: 35,
            resources: [
              {
                title: "Teoria — Scales",
                url: "https://www.teoria.com/en/music/js/scale/exercises.htm",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Clean major scales with correct accidentals.",
              quizVariants: twinQuizVariants([
                {
                  question: "G major typically raises which pitch with a sharp?",
                  choices: ["F♯", "C♯", "B♭", "E♭"],
                  correctIndex: 0,
                },
                {
                  question: "F major typically adds which flat to the key signature?",
                  choices: ["B♭", "F♭", "E♭", "A♭"],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Audio hum or keyboard recording optional in notes link.",
            },
          },
        ],
      },
      {
        title: "Harmony basics",
        summary: "Intervals and triads — hearing and spelling.",
        tasks: [
          {
            title: "Interval spelling",
            explanation:
              "Quantity + quality: thirds and fifths underpin triads.",
            whyMatters: "Chord spellings are interval recipes.",
            instructions:
              "Given C, spell major third, minor third, perfect fifth above. Repeat from G.",
            xpReward: 40,
            resources: [
              {
                title: "musictheory.net — Intervals",
                url: "https://www.musictheory.net/lessons/31",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Consistent interval arithmetic.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "From C up to E is most accurately called a:",
                  choices: [
                    "Major third (M3)",
                    "Perfect fifth",
                    "Minor second",
                    "Tritone",
                  ],
                  correctIndex: 0,
                },
                {
                  question:
                    "C to F♯ is best described as (letter-wise) a:",
                  choices: [
                    "Fourth / augmented fourth type interval, not a diatonic third C–E",
                    "Major third",
                    "Minor third",
                    "Perfect octave",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Write answers in task notes.",
            },
          },
          {
            title: "Triads in close position",
            explanation: "Stacked thirds: major, minor, diminished, augmented.",
            whyMatters: "Lead sheets and analysis pivot on chord quality.",
            instructions:
              "Notate I–IV–V in C major as triads. Label quality per chord.",
            xpReward: 45,
            resources: [
              {
                title: "Open Music Theory — Triads",
                url: "https://viva.pressbooks.pub/openmusictheory/chapter/triads/",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Roman numerals match chord spellings.",
              quizVariants: twinQuizVariants([
                {
                  question: "In C major, the I chord as a triad is spelled:",
                  choices: ["C–E–G (major triad)", "C–E♭–G", "C–F–A", "B–D♯–F♯"],
                  correctIndex: 0,
                },
                {
                  question: "A minor triad stacked in thirds has which quality above the root?",
                  choices: [
                    "Minor third then perfect fifth",
                    "Major third then diminished fifth",
                    "Only a single fifth",
                    "Two major thirds stacked",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Photo or notation export in notes.",
            },
          },
        ],
      },
      {
        title: "Context",
        summary: "Apply the lens to real material.",
        tasks: [
          {
            title: "Analyse a snippet",
            explanation:
              "Pick 4–8 bars from your PDF; mark scale degree of melody peaks and name chords if given.",
            whyMatters: "Theory sticks when tethered to music you chose.",
            instructions:
              "Annotate PDF screenshot or rewrite skeleton lead sheet with labels.",
            xpReward: 60,
            resources: [
              {
                title: "Hooktheory — Trends (inspiration)",
                url: "https://www.hooktheory.com/trends",
                type: "link",
              },
            ],
            evaluation: {
              summary: "Coherent mini analysis tied to vocabulary from earlier tasks.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "Labeling a melodic peak with a scale degree helps you:",
                  choices: [
                    "Relate the note to the key’s collection",
                    "Avoid hearing pitch entirely",
                    "Skip harmonic context",
                    "Remove the need for rhythm",
                  ],
                  correctIndex: 0,
                },
                {
                  question: "Identifying chords or harmonic regions is useful because:",
                  choices: [
                    "It connects sound to the progression’s function",
                    "It replaces listening",
                    "It removes the need for notation",
                    "It proves tempo is irrelevant",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Attach commentary in notes (what surprised you?).",
            },
          },
        ],
      },
    ],
  };
}

function genericUnderstanding(
  topicTitle: string,
  lang: string,
): UnderstandingResult {
  return {
    interpretedSubject: topicTitle || "Your learning topic",
    intentSummary:
      "Structured mastery of the topic using the materials you supplied, with checkpoints along the way.",
    targetOutcome: "Explain core ideas and complete guided exercises confidently.",
    difficulty: "Adaptive — paced by your inputs",
    scopeSuggestion: "Break into fundamentals, practice, then application.",
    recommendedLanguage: lang || "en",
    readingLevel: "Matched to your stated experience",
    roadmapDepth: "standard",
  };
}

function genericRoadmap(
  topicTitle: string,
  lang: string,
): GeneratedRoadmapDraft {
  return {
    title: topicTitle || "Personal learning roadmap",
    description: "A balanced path generated from your source material and goals.",
    goal: "Solid foundations plus one applied capstone aligned to your notes.",
    estDurationLabel: "2–3 weeks (adjust as needed)",
    language: lang || "en",
    phases: [
      {
        title: "Foundations",
        summary: "Vocabulary and mental model.",
        tasks: [
          {
            title: "Map key concepts",
            explanation:
              "Extract **8–12 terms** or *key ideas* from your material, then cluster them. Give each cluster a **short label** you can reuse later.",
            whyMatters:
              "Shared **vocabulary** unlocks deeper sections of the source—you recognize names before you understand mechanics.",
            instructions: `Create a **concept map** (digital or paper).

Link **prerequisites** with arrows so relationships stay obvious when you review.`,
            xpReward: 30,
            resources: [
              { title: "Your source (review)", type: "doc" },
            ],
            evaluation: {
              summary: "**Coverage** and sensible grouping—not perfect polish.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "A concept map primarily helps by:",
                  choices: [
                    "Making relationships between ideas explicit",
                    "Replacing all reading",
                    "Guaranteeing memorization without review",
                    "Removing the need for sources",
                  ],
                  correctIndex: 0,
                },
                {
                  question:
                    "Prerequisite arrows between concepts should show:",
                  choices: [
                    "What you should grasp first before another idea clicks",
                    "Random decorative links",
                    "Only alphabetical order",
                    "Only fonts and colors",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Add a **snapshot or link** in task notes when done.",
            },
          },
        ],
      },
      {
        title: "Guided practice",
        summary: "Apply concepts with feedback loops.",
        tasks: [
          {
            title: "Worked examples",
            explanation: "Repeat two examples from the material without peeking, then compare.",
            whyMatters: "Active recall beats passive re-reading.",
            instructions:
              "Track mistakes in a short table: error → correction → rule.",
            xpReward: 40,
            resources: [
              { title: "Primary source sections", type: "doc" },
            ],
            evaluation: {
              summary: "Honest error log with corrections.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "After a worked example, comparing your attempt without peeking mainly:",
                  choices: [
                    "Strengthens recall and error awareness",
                    "Proves you should never retry",
                    "Replaces understanding with luck",
                    "Makes mistakes irrelevant",
                  ],
                  correctIndex: 0,
                },
                {
                  question: "Each row in an error log should ideally link to:",
                  choices: [
                    "A concrete rule or principle you will reuse",
                    "Only emotional venting",
                    "Unrelated trivia",
                    "Blank cells only",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Paste table in task notes.",
            },
          },
        ],
      },
      {
        title: "Synthesis",
        summary: "Teach-it-back checkpoint.",
        tasks: [
          {
            title: "Capstone explanation",
            explanation:
              "Record or write a 3-minute lesson covering the big idea to a curious beginner.",
            whyMatters: "Teaching exposes gaps instantly.",
            instructions:
              "Use analogy + one concrete example from your domain.",
            xpReward: 55,
            resources: [],
            evaluation: {
              summary: "Clear narrative arc.",
              quizVariants: twinQuizVariants([
                {
                  question:
                    "A 3-minute teach-back should center on:",
                  choices: [
                    "One clear thesis the beginner can repeat",
                    "Every detail you ever read",
                    "Jargon with no definitions",
                    "Apologizing for the topic",
                  ],
                  correctIndex: 0,
                },
                {
                  question: "Your example should:",
                  choices: [
                    "Illuminate the thesis, not wander off-topic",
                    "Contradict the thesis on purpose",
                    "Avoid any concrete situation",
                    "Replace the thesis entirely",
                  ],
                  correctIndex: 0,
                },
              ]),
              checkpointDescription: "Link or transcript in notes.",
            },
          },
        ],
      },
    ],
  };
}

function toProposal(
  u: UnderstandingResult,
  suggestedTitle: string,
  sourceFocus: string,
): ProposedJourney {
  return { ...u, suggestedTitle, sourceFocus };
}

function mathUnderstanding(): UnderstandingResult {
  return {
    interpretedSubject: "Mathematics — skills from your material",
    intentSummary:
      "Build procedural fluency and proof-reading from the math-related parts of what you shared.",
    targetOutcome: "Solve representative problems and explain one concept in your own words.",
    difficulty: "Varies with prerequisites in your notes",
    scopeSuggestion:
      "Isolate definitions → worked examples → short problem sets; skip topics with no material.",
    recommendedLanguage: "en",
    readingLevel: "Technical where needed; plain language for intuition",
    roadmapDepth: "standard",
  };
}

function biologyUnderstanding(): UnderstandingResult {
  return {
    interpretedSubject: "Biology — concepts from your material",
    intentSummary:
      "Connect vocabulary, mechanisms, and systems using the life-science thread in your upload.",
    targetOutcome: "Diagram or narrate one system (e.g. cell, ecosystem) with correct terminology.",
    difficulty: "Intro–intermediate depending on depth in source",
    scopeSuggestion:
      "Terminology → core processes → synthesis; omit threads with almost no coverage.",
    recommendedLanguage: "en",
    readingLevel: "Accessible with precise terms where the field requires them",
    roadmapDepth: "standard",
  };
}

function detectsMathBioSplit(blob: string): boolean {
  const math =
    /\b(math|mathematics|calculus|algebra|geometry|equation|theorem|proof|matrix)\b/i.test(
      blob,
    );
  const bio =
    /\b(biology|cell|dna|rna|ecology|evolution|organism|photosynthesis|mitosis)\b/i.test(
      blob,
    );
  return math && bio;
}

/** Stage-1 mock: 1+ proposed journeys with AI-suggested titles. */
export function analyzeSourceMock(input: UnderstandingInput): SourceAnalysisResult {
  const blob = input.sourceContent.toLowerCase();
  const hint = input.topicTitle?.trim() || "";
  const lang = input.targetLanguage || "en";

  if (detectsMathBioSplit(blob)) {
    return {
      splitReason:
        "Your material mixes mathematics and biology. We suggest **two separate journeys** so each roadmap stays coherent. Toggle either off if you only want one.",
      proposals: [
        toProposal(
          {
            ...mathUnderstanding(),
            recommendedLanguage: lang,
            readingLevel: input.experienceLevel
              ? `${mathUnderstanding().readingLevel} (level: ${input.experienceLevel})`
              : mathUnderstanding().readingLevel,
          },
          "Mathematics from your source",
          "The quantitative / proof / equations thread in what you provided.",
        ),
        toProposal(
          {
            ...biologyUnderstanding(),
            recommendedLanguage: lang,
            readingLevel: input.experienceLevel
              ? `${biologyUnderstanding().readingLevel} (level: ${input.experienceLevel})`
              : biologyUnderstanding().readingLevel,
          },
          "Biology from your source",
          "The living-systems / life-science thread in what you provided.",
        ),
      ],
    };
  }

  const merged = `${hint} ${input.sourceContent}`;
  if (merged.toLowerCase().includes("react") || merged.toLowerCase().includes("jsx")) {
    const aligned = Boolean(input.alignmentTranscript?.trim());
    if (!aligned) {
      const u = reactUnderstanding();
      return {
        sourceScale: "encyclopedic",
        clarification: {
          preamble:
            "React’s official docs cover beginners through advanced patterns. Answering the questions helps us size the roadmap so it matches your goal instead of defaulting to a tiny slice.",
          questions: [
            "What’s your main goal: shipping app UI, interview prep, or deep understanding of React internals?",
            "Should we stick to modern function components and hooks only, or include class components / legacy notes?",
            "Any must-have topics (e.g. Server Components, data fetching, forms, testing, performance)?",
            "Timeline: quick ramp over a few weeks vs slower mastery over months?",
          ],
        },
        proposals: [
          toProposal(
            {
              ...u,
              recommendedLanguage: lang,
              readingLevel: input.experienceLevel
                ? `${u.readingLevel} (level: ${input.experienceLevel})`
                : u.readingLevel,
            },
            "React — draft scope (confirm below)",
            "Preliminary scope for encyclopedic docs like react.dev — refine with your answers.",
          ),
        ],
      };
    }
    const u = reactUnderstandingDeep(lang, input.experienceLevel);
    return {
      sourceScale: "encyclopedic",
      proposals: [
        toProposal(
          {
            ...u,
            recommendedLanguage: lang,
            readingLevel: input.experienceLevel
              ? `${u.readingLevel} (level: ${input.experienceLevel})`
              : u.readingLevel,
          },
          "React — aligned path from your answers",
          "Full-curriculum style journey grounded in your alignment replies.",
        ),
      ],
    };
  }

  if (
    blob.includes("music") ||
    blob.includes("scale") ||
    blob.includes("chord") ||
    blob.includes("theory")
  ) {
    const u = musicUnderstanding();
    return {
      proposals: [
        toProposal(
          {
            ...u,
            recommendedLanguage: lang,
            readingLevel: input.experienceLevel
              ? `${u.readingLevel} (level: ${input.experienceLevel})`
              : u.readingLevel,
          },
          "Music theory from your materials",
          "Pitch, harmony, and practice threads in your text or score notes.",
        ),
      ],
    };
  }

  const excerpt =
    input.sourceContent.trim().slice(0, 120).replace(/\s+/g, " ") || "your materials";
  const u = genericUnderstanding(excerpt, lang);
  return {
    proposals: [
      toProposal(
        {
          ...u,
          recommendedLanguage: lang,
          readingLevel: input.experienceLevel
            ? `${u.readingLevel} (level: ${input.experienceLevel})`
            : u.readingLevel,
        },
        `Learning path: ${excerpt.slice(0, 60)}${excerpt.length > 60 ? "…" : ""}`,
        "Everything in the source is treated as one topic unless patterns suggest a split.",
      ),
    ],
  };
}

export function mockContinuationSuggestions(input: {
  journeyTitle: string;
  journeyGoal: string | null;
  language: string;
  completedSummary: string;
}): ContinuationSuggestionRow[] {
  const lines = input.completedSummary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? "completed foundation phases";
  const blob =
    `${input.journeyTitle} ${input.completedSummary}`.toLowerCase();
  const isReact =
    blob.includes("react") ||
    blob.includes("component") ||
    blob.includes("jsx");

  if (isReact) {
    return [
      {
        nextFocus: "Effects, data fetching, and custom hooks",
        buildsOn: firstLine,
        rationale:
          "You can build interactive components; next is coordinating async work and reusable hook logic.",
        roadmapDepth: "standard",
        suggestedSourceHint: "react.dev — Escape Hatches, hooks reference",
      },
      {
        nextFocus: "Composition, context, and performance basics",
        buildsOn: firstLine,
        rationale:
          "Grow from single components to predictable structure for larger UI trees.",
        roadmapDepth: "standard",
        suggestedSourceHint: "react.dev — Thinking in React, useContext",
      },
      {
        nextFocus: "Routing, testing, and TypeScript with React",
        buildsOn: firstLine,
        rationale:
          "Move toward maintainable apps: navigation, automated checks, and typed components.",
        roadmapDepth: "deep",
        suggestedSourceHint: "Framework docs + Vitest or React Testing Library",
      },
    ];
  }

  return [
    {
      nextFocus: `Applied projects: ${input.journeyTitle}`,
      buildsOn: firstLine,
      rationale:
        "Reinforce what you finished with a focused build before new topics.",
      roadmapDepth: "standard",
    },
    {
      nextFocus: "Patterns, tooling, and workflow",
      buildsOn: firstLine,
      rationale:
        "Turn lessons into repeatable habits and professional defaults.",
      roadmapDepth: "standard",
    },
    {
      nextFocus: "Deeper concepts and edge cases",
      buildsOn: firstLine,
      rationale:
        "Explore tradeoffs and exceptions once the basics feel automatic.",
      roadmapDepth: "deep",
    },
  ];
}

/** Placeholder coach reply when AI_PROVIDER is mock. */
export function mockLessonHandbook(
  input: LessonHandbookLLMInput,
): LessonHandbookDoc {
  const journey = input.roadmapTitle.trim() || "Your journey";
  return {
    title: `${input.taskTitle.trim()} — learner handbook`,
    subtitle: journey,
    sections: [
      {
        heading: "What you covered",
        body:
          input.explanation?.trim() ||
          `This lesson focused on **${input.taskTitle}** within “${journey}”. In live mode, this section summarizes the core ideas from your lesson notes.`,
      },
      {
        heading: "Why it matters",
        body:
          input.whyMatters?.trim() ||
          "Connect this step to the next time you need the skill—this mock handbook reminds you to tie each lesson to a real situation you'll face.",
      },
      {
        heading: "How to apply it",
        body:
          input.instructions?.trim() ||
          input.mentorPerspective?.trim() ||
          "Follow the hands-on path from the lesson: work in small loops—read one chunk, try one thing, note one takeaway.",
      },
      {
        heading: "Pitfalls to avoid",
        body:
          "Rushing without a concrete question; collecting tabs without practicing; assuming you remember without a one-line written recap. Slow is smooth when you are building durable skill.",
      },
      {
        heading: "Spaced review (memory prompts)",
        body:
          "Without scrolling up: what was the main idea in one sentence? What would you teach a friend in two minutes? What is still fuzzy—and which resource name would you reopen first?",
      },
    ],
    quickReference: [
      `Journey: ${journey}`,
      `Lesson: ${input.taskTitle.trim()}`,
      input.recap?.trim() ?
        `Recap cue: ${input.recap.trim().slice(0, 160)}${input.recap.trim().length > 160 ? "…" : ""}`
      : "Add your own scratch terms here after you finish the lesson.",
      "Mock PDF — set AI_PROVIDER to openai or anthropic for a real handbook from your content.",
    ],
  };
}

export function mockTaskCoachReply(input: {
  taskTitle: string;
  newQuestion: string;
}): string {
  const preview = input.newQuestion.trim().slice(0, 220);
  const ell =
    input.newQuestion.trim().length > 220 ? "…" : "";
  return [
    `Thanks for asking about **${input.taskTitle}**.`,
    "",
    `_This is a **mock** coach response._ Set \`AI_PROVIDER\` to \`openai\` or \`anthropic\` in your environment for live answers.`,
    "",
    `**Your question:** “${preview}${ell}”`,
    "",
    "**Quick nudge:** Skim the lesson overview and “From your guide” again—often the next step is which resource to open first. If something specific is unclear (an error message, a definition, or one step), name it in your next message so the coach can go deeper.",
  ].join("\n");
}

export function pickMockTemplates(topicTitle: string, sourceContent: string) {
  const blob = `${topicTitle} ${sourceContent}`.toLowerCase();
  if (blob.includes("react") || blob.includes("jsx")) {
    return {
      understanding: reactUnderstanding(),
      roadmap: finalizeMockRoadmap(reactRoadmap()),
    };
  }
  if (
    blob.includes("music") ||
    blob.includes("scale") ||
    blob.includes("chord") ||
    blob.includes("theory")
  ) {
    return {
      understanding: musicUnderstanding(),
      roadmap: finalizeMockRoadmap(musicRoadmap()),
    };
  }
  return {
    understanding: genericUnderstanding(topicTitle, "en"),
    roadmap: finalizeMockRoadmap(genericRoadmap(topicTitle, "en")),
  };
}
