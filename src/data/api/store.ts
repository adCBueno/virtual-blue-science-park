import type { CompanyProfile, PrivateCompanyProfile } from "@/contracts/ecosystem";
import { rebuildEcosystem, type ExternalMatch } from "@/lib/ecosystem";
import type { BackendSnapshot } from "./backend.functions";
import type { BackendProfile, BackendUser } from "./contract";
import { toUiCompany, toUiOpportunity, toUiProfile } from "./mapping";

/**
 * Client-side state for the team-API mode. The server decides the mode (API_URL set or not);
 * the first snapshot arrives with the page, later ones after login, logout and edits.
 */
export const backendState = {
  enabled: false,
  error: "",
  profiles: [] as BackendProfile[],
  published: [] as CompanyProfile[],
  private: [] as PrivateCompanyProfile[],
  version: 0,
};

const SESSION_KEY = "bsp-backend-session";
export type BackendSession = { token: string; user: BackendUser; expiresAt: string };

export function readSession(): BackendSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const session = raw ? (JSON.parse(raw) as BackendSession) : null;
    if (!session?.token || new Date(session.expiresAt).getTime() < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}
export function writeSession(session: BackendSession | null) {
  try {
    if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable: the session lasts for this page view */
  }
}

let applied: BackendSnapshot | null = null;
let fromLoader: BackendSnapshot | null = null;

/** The page's own snapshot is applied once; later re-renders must not undo a newer, logged-in snapshot. */
export function applyLoaderSnapshot(snapshot: BackendSnapshot) {
  if (fromLoader === snapshot) return;
  fromLoader = snapshot;
  applySnapshot(snapshot);
}

/** Replaces the app's companies, profiles, opportunities and recommendations with the backend's. */
export function applySnapshot(snapshot: BackendSnapshot) {
  if (applied === snapshot) return;
  applied = snapshot;
  if (!snapshot.enabled) {
    backendState.enabled = false;
    return;
  }
  backendState.enabled = true;
  backendState.error = snapshot.error ?? "";
  const { profiles, opportunities, recommendations } = snapshot.data;
  const ui = profiles.map(toUiProfile);
  const matches = new Map<string, ExternalMatch[]>();
  for (const rec of recommendations) {
    const claims = profiles.find((p) => p.company_id === rec.company_id)?.claims ?? [];
    const shared = rec.matched_claims.flatMap((id) => claims.find((c) => c.id === id)?.value ?? []);
    const list = matches.get(rec.company_id) ?? [];
    list.push({ opportunityId: rec.opportunity_id, score: rec.score, why: rec.why, shared });
    matches.set(rec.company_id, list);
  }
  for (const list of matches.values()) list.sort((a, b) => b.score - a.score);
  const ok = rebuildEcosystem(
    {
      companies: profiles.map(toUiCompany),
      profiles: ui,
      opportunities: opportunities.map(toUiOpportunity),
    },
    matches,
  );
  if (!ok && !backendState.error)
    backendState.error = "The backend returned no companies yet — showing demo data.";
  backendState.profiles = ok ? profiles : [];
  backendState.published = ok
    ? ui.filter((p): p is CompanyProfile => p.visibility === "published")
    : [];
  backendState.private = ok
    ? ui.filter((p): p is PrivateCompanyProfile => p.visibility === "private")
    : [];
  backendState.version++;
}
