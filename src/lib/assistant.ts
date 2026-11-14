import { categories, type Category } from "@/lib/ecosystem";
import type { SectionKey, SectionStatus } from "@/lib/profile-sections";

export type AssistantSource = { label: string; url?: string | undefined };
export type AssistantAction =
  | { kind: "none" }
  | { kind: "filter"; category: Category }
  | { kind: "focus"; companyId: string }
  | { kind: "highlight"; opportunityIds: string[]; companyIds: string[] };

/** Shown as a small tag so the guardrail's decision is visible (team-API mode). */
export type AssistantNotice = "redirect" | "clarify" | "refuse" | "login" | "expired";
export type AssistantReply = {
  answer: string;
  action: AssistantAction;
  sources: AssistantSource[];
  simulated: boolean;
  notice?: AssistantNotice;
};
export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  sources?: AssistantSource[];
  action?: AssistantAction;
  notice?: AssistantNotice;
};

export const assistantName = "Blue";

/** Blue's opening line, tuned to whatever the visitor is currently exploring. */
export function greeting(companyName: string | null): string {
  return companyName
    ? `Hi! I'm ${assistantName}, your innovation companion. Want to explore ${companyName}'s opportunities?`
    : `Hi! I'm ${assistantName}. Let's discover what's happening across the Science Park!`;
}

export type ContextSection = {
  key: SectionKey;
  label: string;
  body: string;
  status: SectionStatus;
  source: string;
  url?: string;
  retrieved_at?: string;
};
export type ContextOpportunity = {
  id: string;
  title: string;
  category: Category;
  summary: string;
  date: string;
  source: string;
  url: string;
  score: number;
};
export type ContextCollaborator = {
  id: string;
  name: string;
  industry: string;
  description: string;
  shared: string[];
};
export type ContextCompany = {
  id: string;
  name: string;
  industry: string;
  description: string;
  tags: string[];
  interests: string[];
};

export type AssistantContext = {
  visibility: "public" | "member";
  company: ContextCompany | null;
  sections: ContextSection[];
  opportunities: ContextOpportunity[];
  collaborators: ContextCollaborator[];
  privateNotes?: string;
};

const intentKeywords: { intent: Category | "collaborators"; words: string[] }[] = [
  {
    intent: "Funding",
    words: ["funding", "grant", "finance", "invest", "money", "capital", "call"],
  },
  { intent: "Events", words: ["event", "events", "meetup", "forum", "conference", "day"] },
  { intent: "Workshops", words: ["workshop", "training", "session", "course"] },
  {
    intent: "Testing",
    words: ["test", "testing", "testbed", "pilot", "validate", "living lab", "trial"],
  },
  { intent: "Networking", words: ["network", "networking", "meet people", "community"] },
  {
    intent: "collaborators",
    words: ["collaborat", "partner", "together", "who could", "companies could", "complement"],
  },
];

/** Detects which part of the ecosystem a question is about. Returns null when nothing matches. */
export function detectIntent(question: string): Category | "collaborators" | null {
  const text = question.toLowerCase();
  for (const { intent, words } of intentKeywords)
    if (words.some((word) => text.includes(word))) return intent;
  return null;
}

function knownCategory(value: unknown): Category | null {
  return categories.find((c) => c === value) ?? null;
}

type RawAction = {
  kind?: unknown;
  category?: unknown;
  companyId?: unknown;
  opportunityIds?: unknown;
  companyIds?: unknown;
};

/** Keeps only actions the interface can actually perform with the data the caller is allowed to see. */
export function validateAction(raw: unknown, context: AssistantContext): AssistantAction {
  if (!raw || typeof raw !== "object") return { kind: "none" };
  const action = raw as RawAction;
  if (action.kind === "filter") {
    const category = knownCategory(action.category);
    return category ? { kind: "filter", category } : { kind: "none" };
  }
  if (action.kind === "focus") {
    const id = typeof action.companyId === "string" ? action.companyId : "";
    return context.collaborators.some((c) => c.id === id) || context.company?.id === id
      ? { kind: "focus", companyId: id }
      : { kind: "none" };
  }
  if (action.kind === "highlight") {
    const list = (value: unknown) =>
      Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
    const opportunityIds = list(action.opportunityIds).filter((id) =>
      context.opportunities.some((o) => o.id === id),
    );
    const companyIds = list(action.companyIds).filter((id) =>
      context.collaborators.some((c) => c.id === id),
    );
    return opportunityIds.length || companyIds.length
      ? { kind: "highlight", opportunityIds, companyIds }
      : { kind: "none" };
  }
  return { kind: "none" };
}

/** Deterministic answer used when the model is unavailable, and the reference for the demo flow. */
export function ruleBasedReply(question: string, context: AssistantContext): AssistantReply {
  const intent = detectIntent(question);
  const company = context.company;
  const name = company?.name ?? "the park";

  if (intent === "collaborators") {
    const matches = context.collaborators.slice(0, 3);
    const first = matches[0];
    return {
      simulated: true,
      answer: first
        ? `Based on shared expertise, ${name} could explore work with ${matches.map((c) => c.name).join(", ")}. ${first.name} overlaps on ${first.shared.join(" and ")}. These are rule-based suggestions, not confirmed partnerships.`
        : `No collaboration matches are available for ${name} right now.`,
      action: { kind: "highlight", opportunityIds: [], companyIds: matches.map((c) => c.id) },
      sources: [{ label: "Matching · shared expertise" }],
    };
  }

  if (intent) {
    const matches = context.opportunities.filter((o) => o.category === intent).slice(0, 3);
    const first = matches[0];
    return {
      simulated: true,
      answer: first
        ? `For ${name}, the most relevant ${intent.toLowerCase()} options are ${matches.map((o) => o.title).join(", ")}. ${first.summary} I have highlighted them in the universe so you can open one.`
        : `There is no ${intent.toLowerCase()} option in the current listings for ${name}.`,
      action: { kind: "highlight", opportunityIds: matches.map((o) => o.id), companyIds: [] },
      sources: matches.map((o) => ({ label: `${o.source} · ${o.title}`, url: o.url })),
    };
  }

  const about = context.sections.find((s) => s.key === "about");
  return {
    simulated: true,
    answer: company
      ? `${about?.body ?? company.description} ${company.interests.length ? `Its current discovery interests are ${company.interests.join(", ")}.` : ""} You can ask me about funding, events, testing environments or potential collaborators.`
      : "I'm Blue. I can help you explore companies, innovation opportunities and collaborations within Blue Science Park. Try asking about funding, events or potential collaborators.",
    action: { kind: "none" },
    sources: [
      {
        label: company ? "Imported company profile" : "Blue Science Park ecosystem",
      },
    ],
  };
}

/** Sources are taken from the data the user is allowed to see, never invented by the model. */
export function sourcesFor(context: AssistantContext, action: AssistantAction): AssistantSource[] {
  const opportunitySource = (o: ContextOpportunity) => ({
    label: `${o.source} · ${o.title}`,
    url: o.url,
  });
  if (action.kind === "filter")
    return context.opportunities
      .filter((o) => o.category === action.category)
      .slice(0, 3)
      .map(opportunitySource);
  if (action.kind === "highlight") {
    const opportunities = context.opportunities
      .filter((o) => action.opportunityIds.includes(o.id))
      .map(opportunitySource);
    const companies = action.companyIds.map((id) => ({
      label: `Suggested collaborator · ${context.collaborators.find((c) => c.id === id)?.name ?? id}`,
    }));
    return [...opportunities, ...companies];
  }
  if (action.kind === "focus") {
    const company = context.collaborators.find((c) => c.id === action.companyId);
    return company ? [{ label: `Company profile · ${company.name}` }] : [];
  }
  const linked = context.sections
    .filter((s) => s.url)
    .slice(0, 3)
    .map((s) =>
      s.url
        ? { label: `${s.label} · ${s.source}`, url: s.url }
        : { label: `${s.label} · ${s.source}` },
    );
  return linked.length
    ? linked
    : [
        {
          label: context.company ? "Imported company profile" : "Blue Science Park ecosystem",
        },
      ];
}

/** Three starting points that fit whatever the user is currently exploring. */
export function suggestedQuestions(company: ContextCompany | null): string[] {
  if (!company)
    return [
      "Explore member companies",
      "Discover innovation opportunities",
      "Find potential collaborations",
    ];
  return [
    `What funding opportunities are relevant to ${company.name}?`,
    `Are there any upcoming events for ${company.name}?`,
    `Which companies could ${company.name} collaborate with?`,
  ];
}
