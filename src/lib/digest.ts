/**
 * "This week" digest — built with Systematic Inventive Thinking (Inside the Box):
 *  - Subtraction: no feed. At most three items, never two of the same category.
 *  - Attribute Dependency: ranking depends on time — the closer a deadline, the higher it ranks;
 *    past items disappear on their own.
 *  - Multiplication: every item can carry a second company — who to apply with, or who to meet there.
 *  - Task Unification: the reader's "Not for us" is also the training signal for the next digest.
 * Browser-safe and deterministic so the panel, tests and exports share the same rules.
 */
import { companies as allCompanies, recommendations, type Category, type Company, type Opportunity } from "@/lib/ecosystem";

const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Reads "Demo deadline · 18 December 2026"; "Rolling applications" has no date. */
export function parseOpportunityDate(label: string): Date | null {
  const m = label.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const month = months.indexOf(m[2]!.toLowerCase());
  return month < 0 ? null : new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
}

export function daysUntil(label: string, today: Date): number | null {
  const date = parseOpportunityDate(label);
  if (!date) return null;
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((date.getTime() - start) / 86_400_000);
}

/** Attribute Dependency: urgency is a function of time left. */
export function urgencyBoost(days: number | null) {
  if (days === null) return 0;
  if (days <= 14) return 15;
  if (days <= 45) return 6;
  return 0;
}

export function whenLabel(days: number | null) {
  if (days === null) return "Rolling — apply when ready";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 14) return `In ${days} days`;
  return `In ${Math.round(days / 7)} weeks`;
}

const collaborative = /collaborat|consorti|partner|together/i;
export type TeamUpMode = "apply-together" | "meet-there";
export type TeamUp = { company: Company; mode: TeamUpMode; brings: string[] };

/**
 * Multiplication: duplicate the "company" in the match. For collaborative calls, suggest a partner
 * who brings expertise the focused company lacks; for events, suggest who to meet there.
 */
export function teamUpFor(opportunity: Opportunity, company: Company, pool: Company[] = allCompanies): TeamUp | null {
  const mode: TeamUpMode | null = collaborative.test(opportunity.requirements) || opportunity.category === "Collaborations"
    ? "apply-together"
    : opportunity.category === "Events" || opportunity.category === "Networking" ? "meet-there" : null;
  if (!mode) return null;
  const candidates = pool
    .filter(c => c.id !== company.id)
    .map(c => ({
      company: c,
      relevant: opportunity.tags.filter(t => c.tags.includes(t)),
      brings: opportunity.tags.filter(t => c.tags.includes(t) && !company.tags.includes(t)),
      wantsIt: c.interests.includes(opportunity.category),
    }))
    .filter(c => c.relevant.length > 0)
    .sort((a, b) => b.brings.length - a.brings.length || Number(b.wantsIt) - Number(a.wantsIt) || b.relevant.length - a.relevant.length);
  const best = candidates[0];
  if (!best) return null;
  return { company: best.company, mode, brings: best.brings.length ? best.brings : best.relevant };
}

export type DigestItem = Opportunity & {
  score: number;
  rank: number;
  days: number | null;
  when: string;
  why: string;
  teamUp: TeamUp | null;
};

/**
 * Task Unification: dismissing an item removes it and also lowers its category for this reader,
 * so the same click is both "hide" and "teach the digest".
 */
export function weeklyDigest(
  company: Company,
  { today, interests = company.interests, dismissed = [], limit = 3, pool = allCompanies }:
  { today: Date; interests?: Category[]; dismissed?: string[]; limit?: number; pool?: Company[] },
): DigestItem[] {
  const byId = new Map(recommendations(company, interests).map(o => [o.id, o]));
  const dismissedCategories = [...byId.values()].filter(o => dismissed.includes(o.id)).map(o => o.category);
  const ranked = [...byId.values()]
    .filter(o => !dismissed.includes(o.id))
    .map(o => {
      const days = daysUntil(o.date, today);
      const shared = o.tags.filter(t => company.tags.includes(t));
      const penalty = dismissedCategories.filter(c => c === o.category).length * 10;
      const priority = interests.includes(o.category) ? 8 : 0;
      return { o, days, shared, rank: o.score + urgencyBoost(days) + priority - penalty };
    })
    .filter(x => x.days === null || x.days >= 0)
    .sort((a, b) => b.rank - a.rank || (a.days ?? 999) - (b.days ?? 999));

  const picked: DigestItem[] = [];
  const usedCategories = new Set<Category>();
  for (const { o, days, shared, rank } of ranked) {
    if (picked.length >= limit) break;
    if (usedCategories.has(o.category)) continue;
    usedCategories.add(o.category);
    const reasons = [`Shares ${shared.join(", ")}`];
    if (interests.includes(o.category)) reasons.push(`${o.category.toLowerCase()} is a priority`);
    if (days !== null && days <= 14) reasons.push(o.category === "Funding" ? "closing soon" : "coming up soon");
    picked.push({ ...o, rank, days, when: whenLabel(days), why: reasons.join(" · "), teamUp: teamUpFor(o, company, pool) });
  }
  return picked;
}
