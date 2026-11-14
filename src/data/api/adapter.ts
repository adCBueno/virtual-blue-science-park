import type { PrivateCompanyProfile } from "@/contracts/ecosystem";
import { canEditCompany, type ProfileDraft } from "@/lib/account";
import { companies } from "@/lib/ecosystem";
import type { PublishField } from "@/lib/profile-sections";
import { backendLogin, backendLogout, backendSaveProfile, loadBackend } from "./backend.functions";
import type { ClaimOp } from "./backend.server";
import { fieldMap, tagsOf, toUiUser, writeField } from "./mapping";
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

const textDraft: Record<keyof typeof writeField, keyof ProfileDraft> = {
  description: "description",
  productsServices: "products_services",
  technologies: "technologies",
  markets: "markets",
  geographicalFocus: "geographical_focus",
  developmentPriorities: "priorities",
  projectsCollaborations: "projects",
};

/** Turns an edited draft into claim edits: changed sections are patched or added, never deleted. */
export function claimOps(companyId: string, draft: ProfileDraft): ClaimOp[] {
  const profile = backendState.profiles.find((p) => p.company_id === companyId);
  if (!profile) return [];
  const ops: ClaimOp[] = [];
  for (const [section, field] of Object.entries(writeField) as [
    keyof typeof writeField,
    string,
  ][]) {
    if (section === "technologies") {
      const known = new Set(tagsOf(profile));
      for (const tag of draft.technologies.map((t) => t.trim()).filter(Boolean))
        if (!known.has(tag.toLowerCase())) ops.push({ op: "add", field, value: tag });
      continue;
    }
    const value = String(draft[textDraft[section]] ?? "").trim();
    const claims = profile.claims.filter((c) => fieldMap[c.field] === section);
    const current = [...new Set(claims.map((c) => c.value.trim()))].join("; ");
    if (!value || value === current) continue;
    const target = claims.find((c) => c.field === field) ?? claims[0];
    ops.push(target ? { op: "patch", claimId: target.id, value } : { op: "add", field, value });
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
  async save(id: string, draft: ProfileDraft, fields: PublishField[]) {
    const session = readSession();
    if (!session) throw new Error("Log in to edit this profile.");
    const ops = claimOps(id, draft);
    await backendSaveProfile({
      data: { token: session.token, companyId: id, ops, publish: fields.length > 0 },
    });
    await reloadBackend();
  },
};

export const apiReviews = {
  list: () => [],
  resolveRecipient: (_id: string) => undefined,
  request(_id: string): never {
    throw new Error("Review requests are not part of the team API yet.");
  },
};
