import { z } from "zod/v4";

/**
 * Shapes returned by the team backend (FastAPI, `contracts/models.py` in
 * shenziel/Virtual-Science-Park). Parsed loosely (extra fields allowed) so a
 * backend addition never breaks the UI; required fields are still checked.
 */
export const backendClaimSchema = z.object({
  id: z.string(),
  field: z.string(),
  value: z.string(),
  kind: z.enum(["stated", "inferred", "user_confirmed"]),
  evidence_url: z.string().nullish(),
  snippet: z.string().nullish(),
  retrieved_at: z.string(),
  confidence: z.number(),
  cached_snapshot: z.boolean().optional(),
});
export const backendCompanySummarySchema = z.object({
  company_id: z.string(),
  name: z.string(),
  visibility: z.enum(["private", "published"]),
  is_simulated: z.boolean().optional(),
});
export const backendProfileSchema = z.object({
  company_id: z.string(),
  name: z.string(),
  website: z.string(),
  visibility: z.enum(["private", "published"]),
  is_simulated: z.boolean().optional(),
  updated_at: z.string(),
  claims: z.array(backendClaimSchema),
  missing_fields: z.array(z.string()).optional(),
});
export const backendOpportunitySchema = z.object({
  id: z.string(),
  type: z.enum(["funding", "event", "testbed"]),
  title: z.string(),
  url: z.string(),
  source: z.string(),
  published: z.string().nullish(),
  deadline: z.string().nullish(),
  event_date: z.string().nullish(),
  format: z.enum(["online", "in_person"]).nullish(),
  audience: z.string().nullish(),
  eligibility_text: z.string().nullish(),
  topics: z.array(z.string()).optional(),
  retrieved_at: z.string(),
  is_simulated: z.boolean().optional(),
  cached_snapshot: z.boolean().optional(),
});
export const backendRecommendationSchema = z.object({
  company_id: z.string(),
  opportunity_id: z.string(),
  score: z.number(),
  why: z.string(),
  matched_claims: z.array(z.string()),
  caveats: z.string(),
});
export const backendUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(["company", "admin"]),
  company_id: z.string().nullish(),
});
export const backendLoginSchema = z.object({
  access_token: z.string(),
  token_type: z.string().optional(),
  expires_at: z.string(),
  user: backendUserSchema,
});

export type BackendClaim = z.infer<typeof backendClaimSchema>;
export type BackendProfile = z.infer<typeof backendProfileSchema>;
export type BackendOpportunity = z.infer<typeof backendOpportunitySchema>;
export type BackendRecommendation = z.infer<typeof backendRecommendationSchema>;
export type BackendUser = z.infer<typeof backendUserSchema>;
export type BackendLogin = z.infer<typeof backendLoginSchema>;

/** Everything the UI needs from the backend in one payload. */
export type BackendEcosystem = {
  profiles: BackendProfile[];
  opportunities: BackendOpportunity[];
  recommendations: BackendRecommendation[];
};
