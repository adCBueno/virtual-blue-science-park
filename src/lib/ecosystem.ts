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
};
export type Opportunity = Pick<OpportunityRecord, "id" | "title" | "category"> & {
  summary: string;
  date: string;
  source: string;
  url: string;
  registrationUrl?: string;
  requirements: string;
  tags: string[];
};
function loadCompanies(): [Company, Company, ...Company[]] {
  const [first, second, ...rest] = catalogue.companies.map((company) => {
    const profile = catalogue.profiles.find((item) => item.companyId === company.id);
    const visual = Object.entries(visuals).find(([id]) => id === company.id)?.[1];
    if (!profile || !visual)
      throw new Error("Missing company profile or visual configuration: " + company.id);
    return {
      ...company,
      ...visual,
      name: profile.name,
      description: profile.description ?? "",
      tags: profile.technologies,
      interests: profile.opportunityInterests,
    };
  });
  if (!first || !second) throw new Error("The prototype needs at least two companies.");
  return [first, second, ...rest];
}
export const companies = loadCompanies();
export const opportunities: Opportunity[] = catalogue.opportunities.map((item) => ({
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
  opportunity: Pick<Opportunity, "tags" | "category">,
  companyList: Company[] = companies,
): CompanyFit[] {
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
  return `Shares ${shared}${fit.priority ? ` · ${category.toLowerCase()} is a stated priority` : ""}`;
}
