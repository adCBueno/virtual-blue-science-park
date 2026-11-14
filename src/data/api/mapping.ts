import type {
  Company as CompanyRecord,
  CompanyProfile,
  Opportunity as OpportunityRecord,
  PrivateCompanyProfile,
  ProfileEvidence,
  User,
} from "@/contracts/ecosystem";
import type { BackendClaim, BackendOpportunity, BackendProfile, BackendUser } from "./contract";

/**
 * Pure, browser-safe mapping from the team backend's contract to the UI's contract.
 * Backend claims (one fact each, with evidence) become the UI's profile sections.
 */

export type UiField =
  | "description"
  | "productsServices"
  | "technologies"
  | "markets"
  | "customerGroups"
  | "geographicalFocus"
  | "developmentPriorities"
  | "projectsCollaborations";

/** Backend profile field → UI section. Several backend fields can feed one section. */
export const fieldMap: Record<string, UiField> = {
  what_it_does: "description",
  products_services: "productsServices",
  technologies: "technologies",
  expertise: "technologies",
  application_areas: "markets",
  markets: "markets",
  industries: "markets",
  customer_groups: "customerGroups",
  geographic_focus: "geographicalFocus",
  development_priorities: "developmentPriorities",
  projects: "projectsCollaborations",
  collaborations: "projectsCollaborations",
};

/** UI section → the backend field a new row is written to. */
export const writeField: Record<UiField, string> = {
  description: "what_it_does",
  productsServices: "products_services",
  technologies: "technologies",
  markets: "markets",
  customerGroups: "customer_groups",
  geographicalFocus: "geographic_focus",
  developmentPriorities: "development_priorities",
  projectsCollaborations: "projects",
};

const classification = {
  stated: "fact",
  inferred: "inference",
  user_confirmed: "companyProvided",
} as const;

function hostLabel(url: string | null | undefined) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

const isDate = (v: string | null | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isUrl = (v: string | null | undefined): v is string => !!v && /^https?:\/\/\S+$/.test(v);

/** The claim that best represents a section: user-confirmed first, then the most confident. */
function lead(claims: BackendClaim[]) {
  const rank = (c: BackendClaim) => (c.kind === "user_confirmed" ? 2 : 0) + c.confidence;
  return [...claims].sort((a, b) => rank(b) - rank(a))[0];
}

function evidenceFor(claims: BackendClaim[]): ProfileEvidence | undefined {
  const c = lead(claims);
  if (!c) return undefined;
  const label =
    c.kind === "user_confirmed"
      ? "Company-confirmed information"
      : `${c.kind === "stated" ? "Stated on" : "Inferred from"} ${hostLabel(c.evidence_url) ?? "a public source"}`;
  return {
    classification: classification[c.kind],
    sourceLabel: label,
    ...(isUrl(c.evidence_url) ? { sourceUrl: c.evidence_url } : {}),
    ...(isDate(c.retrieved_at) ? { retrievedOn: c.retrieved_at } : {}),
    ...(c.kind !== "user_confirmed" && c.confidence < 0.7
      ? { uncertainty: `Confidence ${Math.round(c.confidence * 100)}%` }
      : {}),
  };
}

export function tagsOf(profile: BackendProfile) {
  const values = profile.claims
    .filter((c) => c.field === "technologies" || c.field === "expertise" || c.field === "topics")
    .map((c) => c.value.trim().toLowerCase());
  return [...new Set(values)].filter(Boolean);
}

export function toUiProfile(profile: BackendProfile): CompanyProfile | PrivateCompanyProfile {
  const sections: Partial<Record<UiField, BackendClaim[]>> = {};
  for (const claim of profile.claims) {
    const key = fieldMap[claim.field];
    if (key) (sections[key] ??= []).push(claim);
  }
  const join = (key: UiField) => {
    const claims = sections[key];
    if (!claims?.length) return undefined;
    return [...new Set(claims.map((c) => c.value.trim()))].join("; ") || undefined;
  };
  const evidence: Partial<Record<UiField, ProfileEvidence>> = {};
  for (const key of Object.keys(sections) as UiField[]) {
    const e = evidenceFor(sections[key]!);
    if (e) evidence[key] = e;
  }
  const base = {
    companyId: profile.company_id,
    name: profile.name,
    description: join("description"),
    productsServices: join("productsServices"),
    technologies: tagsOf(profile),
    markets: join("markets"),
    customerGroups: join("customerGroups"),
    geographicalFocus: join("geographicalFocus"),
    developmentPriorities: join("developmentPriorities"),
    projectsCollaborations: join("projectsCollaborations"),
    opportunityInterests: [],
    evidence,
  };
  const clean = Object.fromEntries(
    Object.entries(base).filter(([, v]) => v !== undefined),
  ) as typeof base;
  return profile.visibility === "published"
    ? { ...clean, visibility: "published" }
    : { ...clean, visibility: "private", updatedAt: profile.updated_at };
}

const marine = /marine|ocean|sea|maritime|offshore|wave|ship|aqua|fish/i;
const digital =
  /software|cloud|ai\b|artificial|data|digital|saas|app|platform|cyber|web|analytics|health/i;

export function toUiCompany(profile: BackendProfile): CompanyRecord {
  const text = profile.claims.map((c) => c.value).join(" ") + " " + profile.name;
  const industry =
    profile.claims.find((c) => c.field === "industries")?.value ??
    profile.claims.find((c) => c.field === "markets")?.value ??
    profile.claims.find((c) => c.field === "application_areas")?.value ??
    "Member company";
  const sector = marine.test(text)
    ? "Marine technology"
    : digital.test(text)
      ? "Digital solutions"
      : "Industry & engineering";
  return { id: profile.company_id, industry: industry.slice(0, 80), sector };
}

const category = (o: BackendOpportunity): OpportunityRecord["category"] => {
  if (o.type === "funding") return "Funding";
  if (o.type === "testbed") return "Testing";
  if (/workshop|course|training|bootcamp/i.test(o.title)) return "Workshops";
  if (/network|meetup|lunch|mingle|breakfast|afterwork/i.test(o.title)) return "Networking";
  return "Events";
};

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
};

export function toUiOpportunity(o: BackendOpportunity): OpportunityRecord {
  const when = isDate(o.deadline)
    ? `Deadline · ${longDate(o.deadline)}`
    : isDate(o.event_date)
      ? `${o.format === "online" ? "Online" : o.format === "in_person" ? "In person" : "Event"} · ${longDate(o.event_date)}`
      : "Rolling applications";
  const flags = [o.is_simulated && "Simulated listing", o.cached_snapshot && "Cached snapshot"]
    .filter(Boolean)
    .join(" · ");
  const topics = (o.topics ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
  return {
    id: o.id,
    title: o.title,
    description:
      [
        o.audience && `For ${o.audience.replace(/^for\s+/i, "")}.`,
        topics.length && `Topics: ${topics.join(", ")}.`,
      ]
        .filter(Boolean)
        .join(" ") || o.title,
    category: category(o),
    technologies: topics,
    industries: [],
    sourceLabel: o.source,
    sourceUrl: isUrl(o.url) ? o.url : "https://www.bluesciencepark.se/",
    ...(isDate(o.published) ? { publishedOn: o.published } : {}),
    ...(isDate(o.retrieved_at) ? { retrievedOn: o.retrieved_at } : {}),
    ...(isDate(o.event_date) ? { eventOn: o.event_date } : {}),
    ...(isDate(o.deadline) ? { deadlineOn: o.deadline } : {}),
    schedulingLabel: when,
    eligibility:
      o.eligibility_text?.trim() ||
      "Eligibility not confirmed — check the requirements at the source.",
    ...(flags ? { uncertainty: flags } : {}),
  };
}

/** Backend roles: admin = Blue Science Park staff, company = the company's representative. */
export function toUiUser(u: BackendUser): User {
  const name = u.email.split("@")[0] ?? u.email;
  const id = u.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  return u.role === "admin" || !u.company_id
    ? { id, name, role: "staff", companyId: null }
    : { id, name, role: "representative", companyId: u.company_id };
}
