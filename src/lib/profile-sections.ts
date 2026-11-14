import { categories } from "@/lib/ecosystem";

export type SectionKey =
  | "about"
  | "products"
  | "technologies"
  | "markets"
  | "geography"
  | "priorities"
  | "projects"
  | "interests";
export type SectionStatus = "source" | "inferred" | "company" | "missing";
export type PublishField =
  | "name"
  | "description"
  | "products_services"
  | "technologies"
  | "markets"
  | "geographical_focus"
  | "priorities"
  | "projects"
  | "interests";

/** Structural shape both the public and the private company profile rows satisfy. */
export type ProfileRecord = {
  name: string;
  description: string;
  interests: string[];
  technologies: string[];
  priorities: string;
  products_services: string;
  markets: string;
  geographical_focus: string;
  projects: string;
  sections?: unknown;
};
export type PublicProfileRecord = ProfileRecord & { company_id: string; provenance: string };
export type PrivateProfileRecord = ProfileRecord & {
  company_id: string;
  private_notes: string;
  updated_at: string;
  review_status: string;
};

export type SectionMeta = {
  status: SectionStatus;
  source: string;
  url?: string;
  retrieved_at?: string;
};
export type ProfileSection = {
  key: SectionKey;
  label: string;
  body: string;
  field: PublishField | null;
  meta: SectionMeta;
};

export const sectionLabels: Record<SectionKey, string> = {
  about: "About the Company",
  products: "Products & Services",
  technologies: "Technologies & Expertise",
  markets: "Markets & Industries",
  geography: "Geographical Focus",
  priorities: "Development Priorities",
  projects: "Projects & Collaborations",
  interests: "Interests & Opportunities",
};

export const statusLabels: Record<SectionStatus, string> = {
  source: "Source-supported fact",
  inferred: "AI-inferred interest",
  company: "Company-supplied or confirmed",
  missing: "Missing or uncertain",
};

export const sectionOrder: { key: SectionKey; field: PublishField | null }[] = [
  { key: "about", field: "description" },
  { key: "products", field: "products_services" },
  { key: "technologies", field: "technologies" },
  { key: "markets", field: "markets" },
  { key: "geography", field: "geographical_focus" },
  { key: "priorities", field: "priorities" },
  { key: "projects", field: "projects" },
  { key: "interests", field: "interests" },
];

const statuses: SectionStatus[] = ["source", "inferred", "company", "missing"];

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Reads stored provenance for one section, ignoring anything that is not a recognisable record. */
export function sectionMeta(sections: unknown, key: SectionKey): SectionMeta {
  const entry =
    sections && typeof sections === "object"
      ? (sections as Record<string, unknown>)[key]
      : undefined;
  if (!entry || typeof entry !== "object")
    return { status: "missing", source: "No provenance recorded" };
  const record = entry as {
    status?: unknown;
    source?: unknown;
    url?: unknown;
    retrieved_at?: unknown;
  };
  const status = statuses.includes(record.status as SectionStatus)
    ? (record.status as SectionStatus)
    : "missing";
  const url = text(record.url);
  const retrieved = text(record.retrieved_at);
  return {
    status,
    source: text(record.source) || "No provenance recorded",
    ...(url ? { url } : {}),
    ...(retrieved ? { retrieved_at: retrieved } : {}),
  };
}

function bodyFor(profile: ProfileRecord, key: SectionKey): string {
  switch (key) {
    case "about":
      return profile.description;
    case "products":
      return profile.products_services;
    case "technologies":
      return profile.technologies.join(", ");
    case "markets":
      return profile.markets;
    case "geography":
      return profile.geographical_focus;
    case "priorities":
      return profile.priorities;
    case "projects":
      return profile.projects;
    case "interests":
      return categories.filter((c) => (profile.interests as string[]).includes(c)).join(", ");
  }
}

/** Builds the expandable profile sections with their provenance, in display order. */
export function profileSections(profile: ProfileRecord): ProfileSection[] {
  return sectionOrder.map(({ key, field }) => {
    const body = bodyFor(profile, key).trim();
    const stored = sectionMeta(profile.sections, key);
    return {
      key,
      label: sectionLabels[key],
      field,
      body: body || "Not available yet. The company has not supplied this information.",
      meta: body ? stored : { status: "missing", source: "No company information supplied yet" },
    };
  });
}

/** Company-provided sections are the ones a representative can publish. */
export const publishableFields: PublishField[] = [
  "name",
  "description",
  "products_services",
  "technologies",
  "markets",
  "geographical_focus",
  "priorities",
  "projects",
  "interests",
];

export type EvidenceRow = {
  label: string;
  status: SectionStatus;
  source: string;
  url?: string;
  retrieved_at?: string;
};

/** Every section's origin in one list, so a visitor can see where each line came from. */
export function evidenceRows(sections: ProfileSection[]): EvidenceRow[] {
  return sections.map(({ label, meta }) => ({
    label,
    status: meta.status,
    source: meta.source,
    ...(meta.url ? { url: meta.url } : {}),
    ...(meta.retrieved_at ? { retrieved_at: meta.retrieved_at } : {}),
  }));
}
