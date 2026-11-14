import { z } from "zod/v4";
import {
  chatRequestSchema,
  chatResponseSchema,
  companyProfileSchema,
  privateCompanyProfileSchema,
  profileReviewRequestSchema,
  userSchema,
} from "@/contracts/ecosystem";
import { catalogue } from "./catalogue";
import usersJson from "./fixtures/users.json";
import type {
  CompanyProfile,
  PrivateCompanyProfile,
  ProfileReviewRequest,
} from "@/contracts/ecosystem";
import { canEditCompany, type ProfileDraft } from "@/lib/account";
import { profileSections, type PublishField } from "@/lib/profile-sections";
import { recommendations, collaborators, companies, opportunities } from "@/lib/ecosystem";
import {
  detectIntent,
  ruleBasedReply,
  validateAction,
  type AssistantContext,
} from "@/lib/assistant";

const users = z
  .array(z.object({ email: z.email(), account: userSchema }))
  .parse(usersJson.map(({ email, ...account }) => ({ email, account })));
const storageKey = "bsp-demo-workspace";
const stateSchema = z.object({
  userId: z.string().nullable(),
  preview: z.boolean().default(false),
  published: z.array(companyProfileSchema),
  drafts: z.array(privateCompanyProfileSchema),
  requests: z.array(profileReviewRequestSchema),
});
type State = z.infer<typeof stateSchema>;
const initial = (): State => ({
  userId: null,
  preview: false,
  published: [],
  drafts: [],
  requests: [],
});
let memory = initial();
function read(): State {
  if (typeof window === "undefined") return initial();
  try {
    const value = window.sessionStorage.getItem(storageKey);
    if (value) {
      const state = stateSchema.parse(JSON.parse(value));
      return state.preview ? { ...state, userId: null } : state;
    }
  } catch {
    /* Continue with in-memory demo state. */
  }
  return memory;
}
function write(state: State) {
  memory = state;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    /* Storage is optional. */
  }
}
const actor = (state: State) =>
  users.find(({ account }) => account.id === state.userId)?.account ?? null;
const published = (state: State, id: string) =>
  state.published.find((profile) => profile.companyId === id) ??
  catalogue.profiles.find((profile) => profile.companyId === id);
const upsert = <T extends { companyId: string }>(rows: T[], row: T) => [
  ...rows.filter((item) => item.companyId !== row.companyId),
  row,
];

export function profileRecord(profile: CompanyProfile | PrivateCompanyProfile) {
  const classifications = {
    fact: "source",
    inference: "inferred",
    companyProvided: "company",
    missing: "missing",
  };
  const keys = {
    description: "about",
    productsServices: "products",
    technologies: "technologies",
    markets: "markets",
    geographicalFocus: "geography",
    developmentPriorities: "priorities",
    projectsCollaborations: "projects",
    opportunityInterests: "interests",
  } as const;
  return {
    company_id: profile.companyId,
    name: profile.name,
    description: profile.description ?? "",
    technologies: profile.technologies,
    interests: profile.opportunityInterests,
    products_services: profile.productsServices ?? "",
    markets: profile.markets ?? "",
    geographical_focus: profile.geographicalFocus ?? "",
    priorities: profile.developmentPriorities ?? "",
    projects: profile.projectsCollaborations ?? "",
    sections: Object.fromEntries(
      Object.entries(keys).flatMap(([field, key]) => {
        const evidence = profile.evidence[field as keyof typeof keys];
        return evidence
          ? [
              [
                key,
                {
                  status: classifications[evidence.classification],
                  source: evidence.sourceLabel,
                  url: evidence.sourceUrl,
                  retrieved_at: evidence.retrievedOn,
                },
              ],
            ]
          : [];
      }),
    ),
  };
}

const publishKeys = {
  name: "name",
  description: "description",
  products_services: "productsServices",
  technologies: "technologies",
  markets: "markets",
  geographical_focus: "geographicalFocus",
  priorities: "developmentPriorities",
  projects: "projectsCollaborations",
  interests: "opportunityInterests",
} as const;

export const companyRepository = {
  list: () => companies,
  baselineProfiles: () => catalogue.profiles,
  get(id: string) {
    return companies.find((company) => company.id === id);
  },
  publicProfiles() {
    const state = read();
    return catalogue.profiles.map((profile) => published(state, profile.companyId) ?? profile);
  },
  privateProfiles() {
    const state = read();
    return state.drafts.filter((profile) => canEditCompany(actor(state), profile.companyId));
  },
  save(id: string, draft: ProfileDraft, fields: PublishField[]) {
    const state = read();
    if (!canEditCompany(actor(state), id)) throw new Error("You cannot edit this profile.");
    const current = published(state, id);
    if (!current) throw new Error("Company not found.");
    const previous = state.drafts.find((profile) => profile.companyId === id) ?? current;
    const values = {
      name: draft.name.trim(),
      description: draft.description || undefined,
      productsServices: draft.products_services || undefined,
      technologies: draft.technologies.filter(Boolean),
      markets: draft.markets || undefined,
      geographicalFocus: draft.geographical_focus || undefined,
      developmentPriorities: draft.priorities || undefined,
      projectsCollaborations: draft.projects || undefined,
      opportunityInterests: draft.interests,
    };
    const evidence = { ...previous.evidence };
    for (const key of Object.values(publishKeys)) {
      if (JSON.stringify(values[key]) !== JSON.stringify(previous[key])) {
        evidence[key] = {
          classification: "companyProvided",
          sourceLabel: "Company-provided information",
        };
      }
    }
    const next = privateCompanyProfileSchema.parse({
      ...previous,
      ...values,
      evidence,
      visibility: "private",
      privateNotes: draft.private_notes,
      updatedAt: new Date().toISOString(),
    });
    const released = Object.fromEntries(
      fields.map((field) => [publishKeys[field], next[publishKeys[field]]]),
    );
    const releasedEvidence = Object.fromEntries(
      fields.map((field) => [
        publishKeys[field],
        {
          classification: "companyProvided",
          sourceLabel: "Company-provided information",
        },
      ]),
    );
    const updated = companyProfileSchema.parse({
      ...current,
      ...released,
      evidence: { ...current.evidence, ...releasedEvidence },
    });
    write({
      ...state,
      drafts: upsert(state.drafts, next),
      published: fields.length ? upsert(state.published, updated) : state.published,
    });
  },
};

export const opportunityRepository = {
  list: () => catalogue.opportunities,
  get: (id: string) => catalogue.opportunities.find((item) => item.id === id),
};
export const recommendationService = { recommendations, collaborators };

export const authService = {
  accountEmails: () => users.map(({ email }) => email),
  currentUser: () => actor(read()),
  signIn(email: string) {
    const user = users.find((entry) => email.trim().toLowerCase() === entry.email)?.account;
    if (!user) throw new Error("This email does not match an available account.");
    write({ ...read(), preview: false, userId: user.id });
  },
  signOut() {
    write({ ...read(), preview: false, userId: null });
  },
  reset() {
    write(initial());
  },
};

export const reviewService = {
  list() {
    const state = read();
    const user = actor(state);
    return state.requests.filter((item) => user?.role === "staff" || item.recipientId === user?.id);
  },
  resolveRecipient(id: string) {
    if (actor(read())?.role !== "staff") throw new Error("Only staff can send reviews.");
    return users.find(
      ({ account }) => account.role === "representative" && account.companyId === id,
    )?.account;
  },
  request(id: string) {
    const state = read();
    const user = actor(state);
    const recipient = reviewService.resolveRecipient(id);
    if (!user || !recipient)
      throw new Error(
        "No registered company account yet. A representative account must be assigned first.",
      );
    if (!state.drafts.some((profile) => profile.companyId === id))
      throw new Error("Save your draft privately before sending.");
    if (
      state.requests.some((request) => request.companyId === id && request.status === "pending")
    ) {
      throw new Error("A review request is already pending.");
    }
    const request = profileReviewRequestSchema.parse({
      id: crypto.randomUUID(),
      companyId: id,
      requesterId: user.id,
      recipientId: recipient.id,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    write({ ...state, requests: [...state.requests, request] });
    return request;
  },
};

export const assistantService = {
  async reply(input: unknown) {
    const { question, companyId, history } = chatRequestSchema.parse(input);
    const state = read();
    const directory = companies.map((company) => {
      const profile = published(state, company.id);
      return profile
        ? {
            ...company,
            name: profile.name,
            description: profile.description ?? "",
            tags: profile.technologies,
            interests: profile.opportunityInterests,
          }
        : company;
    });
    const base = directory.find((company) => company.id === companyId);
    const draft = companyRepository
      .privateProfiles()
      .find((profile) => profile.companyId === companyId);
    const profile = draft ?? (companyId ? published(state, companyId) : undefined);
    const company =
      base && profile
        ? {
            ...base,
            ...profileRecord(profile),
            tags: profile.technologies,
            interests: profile.opportunityInterests,
          }
        : base;
    const context: AssistantContext = {
      visibility: actor(state) ? "member" : "public",
      company: company ?? null,
      sections: profile
        ? profileSections(profileRecord(profile)).map((section) => ({
            key: section.key,
            label: section.label,
            body: section.body,
            status: section.meta.status,
            source: section.meta.source,
            ...(section.meta.url ? { url: section.meta.url } : {}),
          }))
        : [],
      opportunities: company
        ? recommendations(company, company.interests).slice(0, 8)
        : opportunities.slice(0, 10).map((item) => ({ ...item, score: 0 })),
      collaborators: company
        ? collaborators(company, directory)
        : directory.map((item) => ({ ...item, shared: item.tags })),
      ...(draft?.privateNotes ? { privateNotes: draft.privateNotes } : {}),
    };
    const previous = history
      .slice()
      .reverse()
      .find((message) => message.role === "user");
    const prompt =
      /^(?:tell me more|what else)[.!?]?$/i.test(question) && previous ? previous.text : question;
    const action = /^(?:focus|open|explore|show me) (.+?)[.!?]?$/i.exec(question)?.[1];
    const target =
      action && directory.find((item) => item.name.toLowerCase() === action.toLowerCase());
    const reply = target
      ? {
          answer: `Here is ${target.name} in the universe.`,
          action: { kind: "focus", companyId: target.id },
          sources: [],
          simulated: true,
        }
      : ruleBasedReply(prompt, context);
    const category = /^filter\b/i.test(question) ? detectIntent(question) : null;
    const actionResult =
      category && category !== "collaborators" ? { kind: "filter", category } : reply.action;
    const allowedContext = {
      ...context,
      collaborators: target
        ? [...context.collaborators, { ...target, shared: [] }]
        : context.collaborators,
    };
    return chatResponseSchema.parse({
      ...reply,
      action: validateAction(actionResult, allowedContext),
    });
  },
};

export type CompanyRepository = typeof companyRepository;
export type OpportunityRepository = typeof opportunityRepository;
export type RecommendationService = typeof recommendationService;
export type AuthService = typeof authService;
export type ReviewService = typeof reviewService;
export type AssistantService = typeof assistantService;
