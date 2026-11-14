import { z } from "zod/v4";
import {
  backendCompanySummarySchema,
  backendLoginSchema,
  backendOpportunitySchema,
  backendProfileSchema,
  backendRecommendationSchema,
  backendClaimSchema,
  backendUserSchema,
  type BackendEcosystem,
} from "./contract";

/**
 * Server-only client for the team backend. The browser never calls the backend
 * directly: the Start server forwards each request to API_URL (for example
 * http://api:8000 inside Docker Compose), so no CORS setup or public API URL is needed.
 */

export class BackendError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function apiUrl() {
  const raw = process.env["API_URL"]?.trim();
  if (!raw) return null;
  const url = new URL(raw.endsWith("/") ? raw : raw + "/");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("API_URL must be an http(s) URL without credentials.");
  return url;
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | undefined;
  body?: unknown;
  token?: string | null | undefined;
};

export async function backend<T>(
  path: string,
  schema: z.ZodType<T> | null,
  options: Options = {},
): Promise<T> {
  const base = apiUrl();
  if (!base) throw new BackendError(503, "The backend is not configured (API_URL).");
  const url = new URL(path.replace(/^\//, ""), base);
  if (url.origin !== base.origin) throw new BackendError(400, "Invalid backend path.");
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new BackendError(502, "The backend is not reachable right now.");
  }
  if (!response.ok) {
    let detail = `Backend request failed (${response.status}).`;
    try {
      const json = (await response.json()) as { detail?: unknown };
      if (typeof json.detail === "string") detail = json.detail;
    } catch {
      /* keep the generic message */
    }
    throw new BackendError(response.status, detail);
  }
  if (response.status === 204 || !schema) return undefined as T;
  return schema.parse(await response.json());
}

const id = (value: string) => encodeURIComponent(value);

/** Companies (with full profiles), opportunities and each company's ranked recommendations. */
export async function loadEcosystem(token?: string | null): Promise<BackendEcosystem> {
  const [summaries, opportunities] = await Promise.all([
    backend("companies", z.array(backendCompanySummarySchema), { token }),
    backend("opportunities", z.array(backendOpportunitySchema), { token }),
  ]);
  const profiles = (
    await Promise.all(
      summaries.map((s) =>
        backend(`companies/${id(s.company_id)}/profile`, backendProfileSchema, { token }).catch(
          () => null,
        ),
      ),
    )
  ).filter((p) => p !== null);
  const recommendations = (
    await Promise.all(
      profiles.map((p) =>
        backend(
          `companies/${id(p.company_id)}/recommendations`,
          z.array(backendRecommendationSchema),
          { token },
        ).catch(() => []),
      ),
    )
  ).flat();
  return { profiles, opportunities, recommendations };
}

export const login = (email: string, password: string) =>
  backend("auth/login", backendLoginSchema, { method: "POST", body: { email, password } });
export const me = (token: string) => backend("auth/me", backendUserSchema, { token });
export const logout = (token: string) => backend("auth/logout", null, { method: "POST", token });

export type ClaimOp =
  { op: "patch"; claimId: string; value: string } | { op: "add"; field: string; value: string };

/** Applies profile edits as claims (each becomes user_confirmed on the backend), then publishes if asked. */
export async function saveProfile(
  token: string,
  companyId: string,
  ops: ClaimOp[],
  publish: boolean,
) {
  for (const op of ops) {
    if (op.op === "patch")
      await backend(`companies/${id(companyId)}/claims/${id(op.claimId)}`, backendClaimSchema, {
        method: "PATCH",
        token,
        body: { value: op.value },
      });
    else
      await backend(`companies/${id(companyId)}/claims`, backendClaimSchema, {
        method: "POST",
        token,
        body: { field: op.field, value: op.value },
      });
  }
  if (publish)
    await backend(`companies/${id(companyId)}/visibility`, backendProfileSchema, {
      method: "PATCH",
      token,
      body: { visibility: "published" },
    });
}

export const sendFeedback = (
  token: string,
  opportunityId: string,
  verdict: "save" | "relevant" | "not_relevant",
) =>
  backend("feedback", null, {
    method: "POST",
    token,
    body: { opportunity_id: opportunityId, verdict },
  });
