import type { PrivateCompanyProfile } from "@/contracts/ecosystem";
import { canEditCompany, type ProfileDraft } from "@/lib/account";
import { companies } from "@/lib/ecosystem";
import type { PublishField } from "@/lib/profile-sections";
import {
  backendChat,
  backendFeedback,
  backendLogin,
  backendLogout,
  backendSaveProfile,
  loadBackend,
} from "./backend.functions";
import type { AssistantReply, AssistantSource } from "@/lib/assistant";
import type { ClaimOp } from "./backend.server";
import { fieldMap, toUiUser, writeField, type UiField } from "./mapping";
import type { BackendClaim } from "./contract";
import { applySnapshot, backendState, readSession, writeSession } from "./store";

/** Service implementations backed by the team API (same shape as the mock services). */

export async function reloadBackend() {
  const session = readSession();
  const snapshot = await loadBackend({ data: { token: session?.token ?? null } });
  if (snapshot.enabled && snapshot.sessionExpired) writeSession(null);
  applySnapshot(snapshot);
}

const currentUser = () => {
  const session = readSession();
  return session ? toUiUser(session.user) : null;
};

export const apiAuth = {
  accountEmails: () => [] as string[],
  currentUser,
  async signIn(email: string, password: string) {
    if (!password) throw new Error("Enter your password.");
    const result = await backendLogin({ data: { email, password } });
    writeSession({ token: result.access_token, user: result.user, expiresAt: result.expires_at });
    await reloadBackend();
  },
  async signOut() {
    const session = readSession();
    writeSession(null);
    if (session) await backendLogout({ data: { token: session.token } });
    await reloadBackend();
  },
  reset() {
    writeSession(null);
  },
};

/** Editable profile sections, in display order. Each holds several claims, edited one row per claim. */
export const editableSections: { key: UiField; label: string }[] = [
  { key: "description", label: "About the company" },
  { key: "productsServices", label: "Products & services" },
  { key: "technologies", label: "Technologies & expertise" },
  { key: "markets", label: "Markets & industries" },
  { key: "customerGroups", label: "Customer groups" },
  { key: "geographicalFocus", label: "Geographical focus" },
  { key: "developmentPriorities", label: "Development priorities" },
  { key: "projectsCollaborations", label: "Projects & collaborations" },
];

/** One editable row: an existing claim (claimId) or a new one (no claimId). */
export type ClaimRow = {
  key: string;
  claimId?: string;
  value: string;
  kind?: BackendClaim["kind"];
};
export type SectionRows = Record<UiField, ClaimRow[]>;

export function rowsFor(companyId: string): SectionRows {
  const profile = backendState.profiles.find((p) => p.company_id === companyId);
  const rows = Object.fromEntries(
    editableSections.map(({ key }) => [key, [] as ClaimRow[]]),
  ) as SectionRows;
  for (const claim of profile?.claims ?? []) {
    const section = fieldMap[claim.field];
    if (section)
      rows[section].push({
        key: claim.id,
        claimId: claim.id,
        value: claim.value,
        kind: claim.kind,
      });
  }
  return rows;
}

/**
 * Turns edited rows into claim writes: a changed row patches only its own claim, a new row posts
 * a new claim for that section's field. Rows are never joined into one value.
 */
export function claimOps(companyId: string, rows: SectionRows): ClaimOp[] {
  const profile = backendState.profiles.find((p) => p.company_id === companyId);
  if (!profile) return [];
  const ops: ClaimOp[] = [];
  for (const { key } of editableSections) {
    for (const row of rows[key] ?? []) {
      const value = row.value.trim();
      if (!value) continue;
      if (row.claimId) {
        const original = profile.claims.find((c) => c.id === row.claimId);
        if (original && original.value.trim() !== value)
          ops.push({ op: "patch", claimId: row.claimId, value });
      } else ops.push({ op: "add", field: writeField[key], value });
    }
  }
  return ops;
}

export const apiCompanies = {
  list: () => companies,
  get: (id: string) => companies.find((company) => company.id === id),
  baselineProfiles: () => backendState.published,
  publicProfiles: () => backendState.published,
  /** The profiles this user may edit, shaped as drafts so the editor starts from the current values. */
  privateProfiles(): PrivateCompanyProfile[] {
    const user = currentUser();
    return [
      ...backendState.private,
      ...backendState.published.map((p) => ({ ...p, visibility: "private" as const })),
    ].filter((p) => canEditCompany(user, p.companyId));
  },
  /** Demo mode's draft save would merge rows into one value; the API editor uses saveRows. */
  save(_id: string, _draft: ProfileDraft, _fields: PublishField[]): Promise<void> {
    return Promise.reject(new Error("Edit the profile claim by claim in the API editor."));
  },
  visibility: (id: string) =>
    backendState.profiles.find((p) => p.company_id === id)?.visibility ?? "private",
  async saveRows(id: string, rows: SectionRows, visibility: "private" | "published") {
    const session = readSession();
    if (!session) throw new Error("Log in to edit this profile.");
    const ops = claimOps(id, rows);
    const changed = visibility !== apiCompanies.visibility(id) ? visibility : null;
    if (!ops.length && !changed) return { ops: 0, visibility: null };
    await backendSaveProfile({
      data: { token: session.token, companyId: id, ops, visibility: changed },
    });
    await reloadBackend();
    return { ops: ops.length, visibility: changed };
  },
};

export const apiReviews = {
  list: () => [],
  resolveRecipient: (_id: string) => undefined,
  request(_id: string): never {
    throw new Error("Review requests are not part of the team API yet.");
  },
};

export const LOGIN_FOR_ASSISTANT = "Log in with a company account to use the assistant.";
export const SESSION_EXPIRED = "Your session expired — log in again.";

function sourceLabel(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    return (u.hostname.replace(/^www\./, "") + (path && path !== "/" ? path : "")).slice(0, 60);
  } catch {
    return url.slice(0, 60);
  }
}

/** Blue in team-API mode: the backend's guardrail decides, the UI shows its decision. Never falls back to the mock. */
export const apiAssistant = {
  async reply(input: { question: string }): Promise<AssistantReply> {
    const notice = (answer: string, kind: "login" | "expired"): AssistantReply => ({
      answer,
      action: { kind: "none" },
      sources: [],
      simulated: false,
      notice: kind,
    });
    const session = readSession();
    if (!session || session.user.role !== "company") return notice(LOGIN_FOR_ASSISTANT, "login");
    const result = await backendChat({ data: { token: session.token, message: input.question } });
    if (!result.ok) {
      if (result.status === 401) {
        writeSession(null);
        return notice(SESSION_EXPIRED, "expired");
      }
      if (result.status === 403) return notice(LOGIN_FOR_ASSISTANT, "login");
      throw new Error(
        result.status === 422
          ? "Please rephrase your question (up to 2000 characters)."
          : result.message,
      );
    }
    const seen = new Set<string>();
    const sources: AssistantSource[] = [];
    for (const url of result.reply.sources) {
      const label = sourceLabel(url);
      if (!/^https?:\/\//.test(url) || seen.has(label)) continue;
      seen.add(label);
      sources.push({ label, url });
    }
    const { action } = result.reply;
    return {
      answer: result.reply.reply,
      action: { kind: "none" },
      sources,
      simulated: false,
      ...(action !== "answer" ? { notice: action } : {}),
    };
  },
};

export type FeedbackVerdict = "save" | "relevant" | "not_relevant";
/** POST /feedback as { opportunity_id, verdict }; the company comes from the session. */
export async function apiFeedback(opportunityId: string, verdict: FeedbackVerdict) {
  const session = readSession();
  if (!session || session.user.role !== "company")
    throw new Error(LOGIN_FOR_ASSISTANT.replace("use the assistant", "give feedback"));
  await backendFeedback({ data: { token: session.token, opportunityId, verdict } });
}
