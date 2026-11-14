import { companiesFor, fitLevel, type Company, type Opportunity } from "@/lib/ecosystem";
import { daysUntil } from "@/lib/digest";
import { outcomeLabels } from "@/lib/action-brief";
import type { OutreachEntry } from "@/lib/outreach-log";

/**
 * Staff briefing: what happened across member companies in a recent window, condensed into a
 * few highlights so staff only open the companies that need them. Browser-safe and deterministic.
 *
 * Data contract for the monitoring agent: push `ParkUpdate` rows (kind "news" | "milestone")
 * with a source link; everything else is derived from data the app already has.
 */

export type UpdateKind = "milestone" | "news" | "outcome" | "profile" | "upcoming";
export type ParkUpdate = {
  id: string;
  companyId: string;
  kind: UpdateKind;
  title: string;
  /** One line on why a BSP staff member should care. */
  why: string;
  at: string; // ISO date
  tags: string[];
  source?: { name: string; url: string };
  simulated?: boolean;
};

export const kindLabels: Record<UpdateKind, string> = { milestone: "Milestone", news: "News", outcome: "Outreach outcome", profile: "Profile change", upcoming: "Coming up" };
const kindWeight: Record<UpdateKind, number> = { milestone: 5, outcome: 4, news: 3, upcoming: 3, profile: 2 };

export type BriefingWindow = "yesterday" | "3d" | "7d" | "last-visit";
export const windowLabels: Record<BriefingWindow, string> = { yesterday: "Since yesterday", "3d": "Last 3 days", "7d": "Last 7 days", "last-visit": "Since my last visit" };

export function windowStart(window: BriefingWindow, now: Date, lastVisit: string | null): Date {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysBack = (n: number) => new Date(startOfToday.getTime() - n * 86_400_000);
  if (window === "yesterday") return daysBack(1);
  if (window === "3d") return daysBack(3);
  if (window === "7d") return daysBack(7);
  return lastVisit ? new Date(lastVisit) : daysBack(1);
}

const hoursAgo = (now: Date, h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

/** Clearly-marked simulated member news, stand-in for the monitoring agent's output. */
export function demoUpdates(now: Date): ParkUpdate[] {
  const d = (id: string, companyId: string, kind: UpdateKind, h: number, title: string, why: string, tags: string[]): ParkUpdate =>
    ({ id: `demo:${id}`, companyId, kind, title, why, at: hoursAgo(now, h), tags, source: { name: "Company website (simulated)", url: "https://www.bluesciencepark.se/" }, simulated: true });
  return [
    d("ocean-pilot", "ocean", "milestone", 9, "Started a pilot with a coastal municipality for autonomous water-quality monitoring", "Pilots often need test sites and funding — a fit for the Baltic Sea living lab and the blue economy call.", ["marine", "sensors", "sustainability"]),
    d("nord-hire", "nord", "news", 20, "Hiring two embedded engineers to scale its industrial sensor line", "Growth phase: a good moment to offer the connected systems testbed and smart-industry funding.", ["sensors", "iot"]),
    d("aether-model", "aether", "milestone", 30, "Released an open model for predictive maintenance on factory data", "Directly relevant to Nord Sensor and Modul Works — a possible three-way collaboration.", ["ai", "automation", "iot"]),
    d("baltic-award", "baltic", "milestone", 44, "Shortlisted for a regional clean-energy innovation award", "Visibility moment — consider featuring them at Marine Innovation Day.", ["energy", "marine", "sustainability"]),
    d("pulse-trial", "pulse", "news", 60, "Looking for a clinical partner to validate its remote-monitoring app", "Matches the digital health pilot programme; BSP could broker the clinical contact.", ["health", "ai"]),
    d("modul-expo", "modul", "news", 100, "Showcased modular production cells at an automation fair", "Recently active in sales — check whether they need test capacity before scaling.", ["automation", "sensors"]),
    d("connective-5g", "ericsson", "milestone", 130, "Announced a private 5G trial for maritime operations", "Strong overlap with Ocean Collective and Baltic Blue — candidate for a marine connectivity session.", ["iot", "marine"]),
  ];
}

/** Outreach statuses that changed in the window become outcome updates. */
export function outcomeUpdates(entries: OutreachEntry[]): ParkUpdate[] {
  return entries
    .filter(e => e.status !== "Sent")
    .map(e => ({
      id: `outcome:${e.id}`,
      companyId: e.companyId,
      kind: "outcome" as const,
      title: e.status === "Converted" ? `${outcomeLabels[e.action]}: ${e.opportunityTitle}` : e.status === "Interested" ? `Interested in ${e.opportunityTitle}` : `${e.status} on ${e.opportunityTitle}`,
      why: e.status === "Converted" ? "BSP outreach led to action — follow up on support." : e.status === "Interested" ? "Warm lead: a nudge from BSP could turn this into action." : "Close the loop or offer an alternative.",
      at: e.updatedAt,
      tags: [],
      ...(e.simulated ? { simulated: true } : {}),
    }));
}

/** Deadlines in the next two weeks for companies with at least a good fit. */
export function upcomingUpdates(opportunities: Opportunity[], companyList: Company[], now: Date): ParkUpdate[] {
  const out: ParkUpdate[] = [];
  for (const o of opportunities) {
    const days = daysUntil(o.date, now);
    if (days === null || days < 0 || days > 14) continue;
    for (const fit of companiesFor(o, companyList).filter(f => fitLevel(f.score) !== "Possible").slice(0, 3)) {
      out.push({ id: `upcoming:${o.id}:${fit.company.id}`, companyId: fit.company.id, kind: "upcoming", title: `${o.title} — ${days === 0 ? "today" : `in ${days} days`}`, why: `${fitLevel(fit.score)} thematic fit (${o.category.toLowerCase()}). Remind them before it closes.`, at: now.toISOString(), tags: o.tags, source: { name: o.source, url: o.url } });
    }
  }
  return out;
}

export type ProfileChange = { companyId: string; at: string; label: string };
export function profileUpdates(changes: ProfileChange[]): ParkUpdate[] {
  return changes.map(c => ({ id: `profile:${c.companyId}:${c.at}`, companyId: c.companyId, kind: "profile" as const, title: c.label, why: "Check the change — it can shift which opportunities they are matched with.", at: c.at, tags: [] }));
}

export type ConnectionSignal = { a: Company; b: Company; shared: string[]; reason: string };
export type CompanyDigest = { company: Company; updates: ParkUpdate[]; top: number };
export type Briefing = { highlights: (ParkUpdate & { company: Company })[]; byCompany: CompanyDigest[]; signals: ConnectionSignal[]; total: number; companies: number; quiet: Company[] };

export function importance(u: ParkUpdate, company: Company | undefined, now: Date) {
  const ageDays = (now.getTime() - new Date(u.at).getTime()) / 86_400_000;
  const relevance = company ? u.tags.filter(t => company.tags.includes(t)).length : 0;
  return kindWeight[u.kind] * 10 + relevance * 2 - Math.max(0, ageDays) * 1.5;
}

export function buildBriefing({ updates, companies, since, now, highlightLimit = 5 }: { updates: ParkUpdate[]; companies: Company[]; since: Date; now: Date; highlightLimit?: number }): Briefing {
  const byId = new Map(companies.map(c => [c.id, c]));
  const inWindow = updates
    .filter(u => byId.has(u.companyId) && (u.kind === "upcoming" || new Date(u.at) >= since))
    .map(u => ({ ...u, company: byId.get(u.companyId)!, score: importance(u, byId.get(u.companyId), now) }))
    .sort((a, b) => b.score - a.score);

  // Highlights: the most important items, at most one per company so no single company crowds the top.
  const highlights: Briefing["highlights"] = [];
  const seen = new Set<string>();
  for (const u of inWindow) {
    if (highlights.length >= highlightLimit) break;
    if (seen.has(u.companyId) || u.kind === "upcoming") continue;
    seen.add(u.companyId);
    highlights.push(u);
  }

  const groups = new Map<string, ParkUpdate[]>();
  for (const u of inWindow) groups.set(u.companyId, [...(groups.get(u.companyId) ?? []), u]);
  const byCompany = [...groups.entries()]
    .map(([id, list]) => ({ company: byId.get(id)!, updates: list, top: Math.max(...list.map(u => importance(u, byId.get(id), now))) }))
    .sort((a, b) => b.top - a.top);

  // Connection signals: two companies active on the same topic in the same window.
  const signals: ConnectionSignal[] = [];
  const active = inWindow.filter(u => u.kind === "news" || u.kind === "milestone");
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const x = active[i]!, y = active[j]!;
    if (x.companyId === y.companyId) continue;
    const shared = x.tags.filter(t => y.tags.includes(t));
    if (shared.length < 2 || signals.some(s => [s.a.id, s.b.id].sort().join() === [x.companyId, y.companyId].sort().join())) continue;
    signals.push({ a: x.company, b: y.company, shared, reason: `Both active on ${shared.join(" & ")} this period — consider an introduction.` });
  }

  return {
    highlights,
    byCompany,
    signals: signals.slice(0, 3),
    total: inWindow.filter(u => u.kind !== "upcoming").length,
    companies: new Set(inWindow.filter(u => u.kind !== "upcoming").map(u => u.companyId)).size,
    quiet: companies.filter(c => !groups.has(c.id)),
  };
}
