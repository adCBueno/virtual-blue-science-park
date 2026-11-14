import { z } from "zod/v4";

export const idSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const text = z.string().min(1);
const terms = z.array(text);
export const categorySchema = z.enum([
  "Funding",
  "Events",
  "Workshops",
  "Networking",
  "Testing",
  "Collaborations",
]);
export const sectorSchema = z.enum([
  "Marine technology",
  "Digital solutions",
  "Industry & engineering",
]);

export const companySchema = z.strictObject({
  id: idSchema,
  industry: text,
  sector: sectorSchema,
});

export const profileFieldSchema = z.enum([
  "name",
  "description",
  "productsServices",
  "technologies",
  "markets",
  "customerGroups",
  "geographicalFocus",
  "developmentPriorities",
  "projectsCollaborations",
  "opportunityInterests",
]);

export const evidenceSchema = z.strictObject({
  classification: z.enum(["fact", "inference", "companyProvided", "missing"]),
  sourceLabel: text.optional(),
  sourceUrl: z.url().optional(),
  retrievedOn: z.iso.date().optional(),
  uncertainty: text.optional(),
});

const profileFields = {
  companyId: idSchema,
  name: text,
  description: text.optional(),
  productsServices: text.optional(),
  technologies: terms,
  markets: text.optional(),
  customerGroups: text.optional(),
  geographicalFocus: text.optional(),
  developmentPriorities: text.optional(),
  projectsCollaborations: text.optional(),
  opportunityInterests: z.array(categorySchema),
  evidence: z.partialRecord(profileFieldSchema, evidenceSchema),
};

export const companyProfileSchema = z.strictObject({
  ...profileFields,
  visibility: z.literal("published"),
});
export const privateCompanyProfileSchema = z.strictObject({
  ...profileFields,
  visibility: z.literal("private"),
  privateNotes: z.string().optional(),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
});

export const opportunitySchema = z.strictObject({
  id: idSchema,
  title: text,
  description: text,
  category: categorySchema,
  technologies: terms,
  industries: terms,
  sourceLabel: text,
  sourceUrl: z.url(),
  publishedOn: z.iso.date().optional(),
  retrievedOn: z.iso.date().optional(),
  eventOn: z.iso.date().optional(),
  deadlineOn: z.iso.date().optional(),
  schedulingLabel: text.optional(),
  eligibility: text,
  uncertainty: text.optional(),
});

export const recommendationSchema = z.strictObject({
  companyId: idSchema,
  target: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("opportunity"), opportunityId: idSchema }),
    z.strictObject({ kind: z.literal("collaboration"), targetCompanyId: idSchema }),
  ]),
  explanation: text,
  factors: z.array(
    z.strictObject({
      kind: z.enum(["sharedTechnology", "preferredCategory", "industryFit"]),
      values: terms,
    }),
  ),
  score: z.number().min(0).max(100).optional(),
  status: z.literal("suggested"),
});

export const userSchema = z.discriminatedUnion("role", [
  z.strictObject({
    id: idSchema,
    name: text,
    role: z.literal("representative"),
    companyId: idSchema,
  }),
  z.strictObject({ id: idSchema, name: text, role: z.literal("staff"), companyId: z.null() }),
  z.strictObject({ id: idSchema, name: text, role: z.literal("unassigned"), companyId: z.null() }),
]);

export const profileReviewRequestSchema = z.strictObject({
  id: idSchema,
  companyId: idSchema,
  requesterId: idSchema,
  recipientId: idSchema,
  status: z.enum(["pending", "reviewed"]),
  createdAt: z.iso.datetime({ offset: true }),
});

export const chatMessageSchema = z.strictObject({
  role: z.enum(["user", "assistant"]),
  text: text.max(2000),
});
export const chatRequestSchema = z.strictObject({
  question: text.max(500),
  companyId: idSchema.nullable(),
  history: z.array(chatMessageSchema).max(12),
});
export const chatActionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({ kind: z.literal("focus"), companyId: idSchema }),
  z.strictObject({ kind: z.literal("filter"), category: categorySchema }),
  z.strictObject({
    kind: z.literal("highlight"),
    opportunityIds: z.array(idSchema),
    companyIds: z.array(idSchema),
  }),
]);
export const chatResponseSchema = z.strictObject({
  answer: text,
  action: chatActionSchema,
  sources: z.array(z.strictObject({ label: text, url: z.url().optional() })),
  simulated: z.boolean(),
});

export type Company = z.infer<typeof companySchema>;
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type PrivateCompanyProfile = z.infer<typeof privateCompanyProfileSchema>;
export type ProfileEvidence = z.infer<typeof evidenceSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type User = z.infer<typeof userSchema>;
export type ProfileReviewRequest = z.infer<typeof profileReviewRequestSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatAction = z.infer<typeof chatActionSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
