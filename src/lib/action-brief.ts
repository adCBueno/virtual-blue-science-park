import type { Category, Opportunity } from "@/lib/ecosystem";

/**
 * Action brief: the concrete next step for one opportunity, shaped by its type and linked
 * to the Blue Science Park service that can help. Browser-safe; reused by the detail panel,
 * the outreach emails and outcome tracking so they always describe the same next step.
 */

export type BspServiceId =
  "matchmaking" | "funding-guidance" | "digital-testbed" | "ai-lab" | "tech-concept-lab" | "mtc";
export type BspService = { id: BspServiceId; name: string; offer: string; ask: string };

export const bspServices: Record<BspServiceId, BspService> = {
  matchmaking: {
    id: "matchmaking",
    name: "Networking & matchmaking",
    offer: "BSP connects member companies with relevant partners, experts and other attendees.",
    ask: "Ask BSP to introduce you to the right people before or after the event.",
  },
  "funding-guidance": {
    id: "funding-guidance",
    name: "Funding guidance",
    offer: "BSP helps members find suitable calls and shape their applications.",
    ask: "Book a funding guidance session with BSP before you apply.",
  },
  "digital-testbed": {
    id: "digital-testbed",
    name: "Blue Digital Testbed",
    offer: "A test environment for IoT, VR/AR and cybersecurity solutions.",
    ask: "Ask BSP about a test slot in the Blue Digital Testbed.",
  },
  "ai-lab": {
    id: "ai-lab",
    name: "AI Lab Blekinge",
    offer: "Support for exploring and prototyping applied AI.",
    ask: "Book a session with AI Lab Blekinge to scope your AI challenge.",
  },
  "tech-concept-lab": {
    id: "tech-concept-lab",
    name: "Tech Concept Lab",
    offer: "BSP's innovation hub for digital solutions for small and medium-sized companies.",
    ask: "Join a Tech Concept Lab session to take the idea further.",
  },
  mtc: {
    id: "mtc",
    name: "Marine Technology Center of Sweden",
    offer: "BSP's marine technology hub for research, innovation and testing.",
    ask: "Contact the Marine Technology Center about marine partners and testing.",
  },
};
export const bspServiceIds = Object.keys(bspServices) as BspServiceId[];
export const servicesNote =
  "BSP service descriptions are summarised from public information — confirm details with Blue Science Park.";

export type ActionKind = "register" | "apply" | "book" | "rsvp" | "intro";
export type ActionBrief = {
  kind: ActionKind;
  verb: string;
  headline: string;
  cta: { label: string; url: string; direct: boolean };
  checklist: string[];
  service: BspService;
  /** What "success" means for this kind of opportunity, used in outcome tracking. */
  outcome: string;
  caveat: string;
};

export const outcomeLabels: Record<ActionKind, string> = {
  register: "Registered",
  apply: "Applied",
  book: "Test booked",
  rsvp: "Attending",
  intro: "Intro made",
};

/** Splits a requirements paragraph into checkable items. */
export function requirementItems(requirements: string): string[] {
  return requirements
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

function topicService(tags: string[], fallback: BspServiceId): BspService {
  if (tags.includes("marine")) return bspServices.mtc;
  if (tags.includes("ai")) return bspServices["ai-lab"];
  if (tags.some((t) => ["iot", "sensors", "automation"].includes(t)))
    return fallback === "tech-concept-lab"
      ? bspServices["tech-concept-lab"]
      : bspServices["digital-testbed"];
  return bspServices[fallback];
}

/** Testing opportunities come in four kinds, each with its own next step. */
export type TestingKind = "testbed" | "laboratory" | "demonstration" | "pilot";
export const testingKindLabels: Record<TestingKind, string> = {
  testbed: "Testbed",
  laboratory: "Laboratory",
  demonstration: "Demonstration environment",
  pilot: "Pilot opportunity",
};

export function testingKind(o: { title?: string; summary?: string; date?: string }): TestingKind {
  const text = `${o.title ?? ""} ${o.summary ?? ""} ${o.date ?? ""}`.toLowerCase();
  if (/\bpilot/.test(text)) return "pilot";
  if (/\blab\b|laborator|living lab/.test(text)) return "laboratory";
  if (/demonstrat|\bdemo\b|showroom|studio/.test(text)) return "demonstration";
  return "testbed";
}

const testingSteps: Record<
  TestingKind,
  { verb: string; cta: string; steps: string[]; caveat: string }
> = {
  testbed: {
    verb: "Request a test slot",
    cta: "Testbed information",
    steps: ["Describe the test you want to run and the result you need"],
    caveat: "Admission is decided by the testbed after scoping.",
  },
  laboratory: {
    verb: "Book lab time",
    cta: "Lab information",
    steps: [
      "Prepare a sample of the data or hardware you want to test",
      "Book a short scoping call with the lab",
    ],
    caveat: "Lab time is allocated after a scoping call.",
  },
  demonstration: {
    verb: "Book a demonstration slot",
    cta: "Demonstration environment",
    steps: [
      "Choose what you want to show and who you will invite (customers, investors, partners)",
    ],
    caveat: "Slots are confirmed by the host.",
  },
  pilot: {
    verb: "Apply for the pilot",
    cta: "Pilot information",
    steps: [
      "Agree on the pilot goal, duration and how success is measured",
      "Name a contact person for the pilot period",
    ],
    caveat: "Pilot partners are selected by the host; a potential match is not a confirmed place.",
  },
};

export function actionBrief(
  o: Pick<Opportunity, "category" | "url" | "requirements" | "date" | "tags" | "registrationUrl"> &
    Partial<Pick<Opportunity, "title" | "summary">>,
): ActionBrief {
  const reqs = requirementItems(o.requirements);
  const registration = {
    label: o.registrationUrl ? "Registration form" : "Registration on the organiser's page",
    url: o.registrationUrl ?? o.url,
    direct: Boolean(o.registrationUrl),
  };
  const byCategory: Record<Category, () => ActionBrief> = {
    Events: () => ({
      kind: "register",
      verb: "Register",
      headline: "Register for the event",
      cta: registration,
      checklist: [
        `Register in time — ${o.date}`,
        "Decide who from your team attends",
        "Check format (online / in person) and location at the source",
        ...reqs,
      ],
      service: bspServices.matchmaking,
      outcome: outcomeLabels.register,
      caveat: "Seats and dates are set by the organiser.",
    }),
    Workshops: () => ({
      kind: "register",
      verb: "Register",
      headline: "Save a seat at the workshop",
      cta: registration,
      checklist: [`Register in time — ${o.date}`, ...reqs],
      service: topicService(o.tags, "tech-concept-lab"),
      outcome: outcomeLabels.register,
      caveat: "Seats and dates are set by the organiser.",
    }),
    Networking: () => ({
      kind: "rsvp",
      verb: "RSVP",
      headline: "Confirm your attendance",
      cta: registration,
      checklist: [o.date, ...reqs],
      service: bspServices.matchmaking,
      outcome: outcomeLabels.rsvp,
      caveat: "Registration is handled by the organiser.",
    }),
    Funding: () => ({
      kind: "apply",
      verb: "Check requirements",
      headline: "Check the requirements and prepare an application",
      cta: { label: "Full call text", url: o.url, direct: false },
      checklist: [...reqs.map((r) => `Confirm: ${r}`), `Note the deadline — ${o.date}`],
      service: bspServices["funding-guidance"],
      outcome: outcomeLabels.apply,
      caveat: "Potential match only — eligibility is decided by the funder, not by this service.",
    }),
    Testing: () => {
      const t = testingSteps[testingKind(o)];
      return {
        kind: "book",
        verb: t.verb,
        headline: t.verb,
        cta: { label: t.cta, url: o.url, direct: false },
        checklist: [...reqs, ...t.steps],
        service: topicService(o.tags, "digital-testbed"),
        outcome: outcomeLabels.book,
        caveat: t.caveat,
      };
    },
    Collaborations: () => ({
      kind: "intro",
      verb: "Ask for an intro",
      headline: "Ask BSP for an introduction",
      cta: { label: "More about the partner", url: o.url, direct: false },
      checklist: ["Describe what you want to explore together", ...reqs],
      service: bspServices.matchmaking,
      outcome: outcomeLabels.intro,
      caveat: "A suggestion, not a confirmed partnership — both sides must agree.",
    }),
  };
  return byCategory[o.category]();
}

/** The action brief as plain email text: numbered next steps, then how BSP can help. */
export function briefEmailLines(o: Parameters<typeof actionBrief>[0]): string[] {
  const b = actionBrief(o);
  const steps = [`${b.headline}: ${b.cta.url}`, ...b.checklist];
  return [
    "NEXT STEPS",
    ...steps.map((step, i) => `${i + 1}. ${step}`),
    "",
    `HOW BLUE SCIENCE PARK CAN HELP — ${b.service.name}`,
    `${b.service.offer} ${b.service.ask} Just reply to this email.`,
  ];
}
