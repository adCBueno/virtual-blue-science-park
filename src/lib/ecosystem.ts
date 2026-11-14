import { catalogue } from "@/data/catalogue";
import {
  categorySchema,
  type Company as CompanyRecord,
  type Opportunity as OpportunityRecord,
} from "@/contracts/ecosystem";
import visuals from "@/features/universe/desktop-node-visuals.json";
export const categories = categorySchema.options;
export type Category = (typeof categories)[number];
export type Sector =
  "All sectors" | "Marine technology" | "Digital solutions" | "Industry & engineering";
export type Company = Pick<CompanyRecord, "id" | "industry" | "sector"> & {
  name: string;
  description: string;
  tags: string[];
  interests: Category[];
  mark: string;
  tone: string;
  x: number;
  y: number;
  label?: string;
};
export type Opportunity = Pick<OpportunityRecord, "id" | "title" | "category"> & {
  summary: string;
  date: string;
  source: string;
  url: string;
  registrationUrl?: string;
  requirements: string;
  tags: string[];
  /** Explanation from the backend matcher, when recommendations come from the team API. */
  why?: string;
  /** The matcher's caveats, e.g. "potential match, eligibility not confirmed". */
  caveats?: string;
};
type EcosystemSource = {
  companies: CompanyRecord[];
  profiles: {
    companyId: string;
    name: string;
    description?: string | undefined;
    technologies: string[];
    opportunityInterests: Category[];
  }[];
  opportunities: OpportunityRecord[];
};
const visualById: Record<
  string,
  { x: number; y: number; tone: string; mark: string; label: string }
> = visuals;
const ring = Object.values(visualById).map(({ x, y }) => ({ x, y }));
const tones = ["blue", "teal", "ink", "coral"];
/** Companies without a hand-made visual (e.g. from the team API) get a ring position and a short label. */
function visualFor(id: string, index: number, name: string) {
  const known = visualById[id];
  if (known) return known;
  const slot = ring[index % ring.length] ?? { x: 50, y: 20 };
  const label =
    name
      .replace(/\(.*?\)|\b(AB|Ltd|Inc|Oy|AS)\b/gi, "")
      .trim()
      .split(/\s+/)[0] ?? name;
  return {
    ...slot,
    tone: tones[index % tones.length]!,
    mark: "generic",
    label: label.toLowerCase().slice(0, 14),
  };
}
function buildCompanies(source: EcosystemSource): Company[] {
  return source.companies.flatMap((company, index) => {
    const profile = source.profiles.find((item) => item.companyId === company.id);
    if (!profile) return [];
    return [
      {
        ...company,
        ...visualFor(company.id, index, profile.name),
        name: profile.name,
        description: profile.description ?? "",
        tags: profile.technologies,
        interests: profile.opportunityInterests,
      },
    ];
  });
}
function buildOpportunities(source: EcosystemSource): Opportunity[] {
  return source.opportunities.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    summary: item.description,
    date: item.schedulingLabel ?? "",
    source: item.sourceLabel,
    url: item.sourceUrl,
    requirements: item.eligibility,
    tags: item.technologies,
  }));
}
const initial = buildCompanies(catalogue);
if (initial.length < 2) throw new Error("The prototype needs at least two companies.");
/** Live arrays: replaced in place when data arrives from the team API, so every importer sees it. */
export const companies = initial as [Company, Company, ...Company[]];
export const opportunities: Opportunity[] = buildOpportunities(catalogue);

export type ExternalMatch = {
  opportunityId: string;
  score: number;
  why: string;
  caveats: string;
  shared: string[];
};
/** Recommendations computed by the backend matcher, per company. Null = use the local rule-based matching. */
let externalMatches: Map<string, ExternalMatch[]> | null = null;

export function rebuildEcosystem(
  source: EcosystemSource,
  matches: Map<string, ExternalMatch[]> | null,
) {
  const next = buildCompanies(source);
  if (next.length === 0) return false;
  companies.splice(0, companies.length, ...next);
  opportunities.splice(0, opportunities.length, ...buildOpportunities(source));
  externalMatches = matches;
  return true;
}

export function relevance(
  company: Company,
  tags: string[],
  category: Category,
  interests: Category[],
) {
  const overlap = tags.filter((tag) => company.tags.includes(tag)).length;
  return Math.min(99, 60 + overlap * 9 + (interests.includes(category) ? 12 : 0));
}
export function recommendations(
  company: Company,
  interests: Category[],
  category: Category | "All" = "All",
) {
  if (externalMatches) {
    return (externalMatches.get(company.id) ?? []).flatMap((match) => {
      const o = opportunities.find((item) => item.id === match.opportunityId);
      return o && (category === "All" || category === o.category)
        ? [{ ...o, score: Math.round(match.score * 100), why: match.why, caveats: match.caveats }]
        : [];
    });
  }
  return opportunities
    .filter(
      (o) =>
        o.tags.some((t) => company.tags.includes(t)) &&
        (category === "All" || category === o.category),
    )
    .map((o) => ({ ...o, score: relevance(company, o.tags, o.category, interests) }))
    .sort(
      (a, b) =>
        Number(interests.includes(b.category)) - Number(interests.includes(a.category)) ||
        b.score - a.score,
    );
}
export function collaborators(company: Company, directory: readonly Company[] = companies) {
  return directory
    .filter((c) => c.id !== company.id)
    .map((c) => ({ ...c, shared: c.tags.filter((t) => company.tags.includes(t)) }))
    .filter((c) => c.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length)
    .slice(0, 2);
}

/**
 * Thematic fit, not a probability: a deterministic score from shared expertise tags and stated
 * interests. It never implies eligibility — requirements must be checked at the source.
 */
export type FitLevel = "Strong" | "Good" | "Possible";
export function fitLevel(score: number): FitLevel {
  return score >= 85 ? "Strong" : score >= 75 ? "Good" : "Possible";
}
export function fitLabel(score: number) {
  return `${fitLevel(score)} thematic fit`;
}

export type CompanyFit = { company: Company; score: number; shared: string[]; priority: boolean };
/** Reverse matching: for one opportunity, which companies does it fit, and why? */
export function companiesFor(
  opportunity: Pick<Opportunity, "tags" | "category"> & { id?: string },
  companyList: Company[] = companies,
): CompanyFit[] {
  if (externalMatches && opportunity.id) {
    return companyList
      .flatMap((company) => {
        const match = externalMatches
          ?.get(company.id)
          ?.find((m) => m.opportunityId === opportunity.id);
        return match
          ? [
              {
                company,
                score: Math.round(match.score * 100),
                shared: match.shared,
                priority: false,
              },
            ]
          : [];
      })
      .sort((a, b) => b.score - a.score);
  }
  return companyList
    .map((company) => ({
      company,
      shared: opportunity.tags.filter((t) => company.tags.includes(t)),
      priority: company.interests.includes(opportunity.category),
      score: relevance(company, opportunity.tags, opportunity.category, company.interests),
    }))
    .filter((f) => f.shared.length > 0)
    .sort((a, b) => b.score - a.score || Number(b.priority) - Number(a.priority));
}

/** One plain sentence explaining a fit, reused by the panel, the email and the export. */
export function fitReason(fit: Pick<CompanyFit, "shared" | "priority">, category: Category) {
  const shared = fit.shared.join(", ");
  const base = shared ? `Shares ${shared}` : "Matched on the company profile";
  return `${base}${fit.priority ? ` · ${category.toLowerCase()} is a stated priority` : ""}`;
}
