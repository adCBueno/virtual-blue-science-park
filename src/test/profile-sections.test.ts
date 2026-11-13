import { describe, expect, it } from "vitest";
import { evidenceRows, profileSections, statusLabels, sectionLabels } from "@/lib/profile-sections";
import { companies } from "@/lib/ecosystem";

const baseline = {
  name: "Baltic Blue", description: "Clean energy, powered by the sea.", interests: ["Funding", "Events"], technologies: ["marine", "energy"],
  priorities: "", products_services: "Wave and current converters.", markets: "Coastal communities.", geographical_focus: "Baltic Sea.",
  projects: "Port demonstration site.",
};

describe("inline profile sections", () => {
  it("shows every expandable section with its label", () => {
    const sections = profileSections({ ...baseline, sections: {} });
    expect(sections.map(s => s.label)).toEqual([
      "About the Company", "Products & Services", "Technologies & Expertise", "Markets & Industries",
      "Geographical Focus", "Development Priorities", "Projects & Collaborations", "Interests & Opportunities",
    ]);
  });
  it("keeps stored provenance for a source-supported section", () => {
    const sections = profileSections({ ...baseline, sections: { geography: { status: "source", source: "Blue Science Park member location", url: "https://www.bluesciencepark.se/", retrieved_at: "2026-11-13" } } });
    const geography = sections.find(s => s.key === "geography");
    expect(geography?.meta.status).toBe("source");
    expect(geography?.meta.url).toBe("https://www.bluesciencepark.se/");
    expect(geography?.meta.retrieved_at).toBe("2026-11-13");
  });
  it("marks a section missing when the company supplied nothing, whatever the stored note says", () => {
    const sections = profileSections({ ...baseline, priorities: "", sections: { priorities: { status: "company", source: "Company-provided information" } } });
    const priorities = sections.find(s => s.key === "priorities");
    expect(priorities?.meta.status).toBe("missing");
    expect(priorities?.body).toBe("Not available yet. The company has not supplied this information.");
  });
  it("ignores provenance that is not a recognisable record", () => {
    const sections = profileSections({ ...baseline, sections: { markets: "not a record", projects: { status: "verified" } } });
    expect(sections.find(s => s.key === "markets")?.meta.status).toBe("missing");
    expect(sections.find(s => s.key === "projects")?.meta.status).toBe("missing");
  });
  it("describes the four provenance states in plain words", () => {
    expect(Object.values(statusLabels)).toEqual(["Source-supported fact", "AI-inferred interest", "Company-supplied or confirmed", "Missing or uncertain"]);
    expect(sectionLabels.about).toBe("About the Company");
  });
  it("falls back to the demo baseline when no profile row exists", () => {
    const sections = profileSections({ name: companies[0].name, description: companies[0].description, interests: companies[0].interests, technologies: companies[0].tags, priorities: "", products_services: "", markets: "", geographical_focus: "", projects: "" });
    expect(sections.find(s => s.key === "about")?.body).toBe(companies[0].description);
    expect(sections.find(s => s.key === "products")?.meta.status).toBe("missing");
  });
  it("lists where every section came from for the evidence summary", () => {
    const sections = profileSections({ ...baseline, sections: { geography: { status: "source", source: "Blue Science Park member location", url: "https://www.bluesciencepark.se/", retrieved_at: "2026-11-13" } } });
    const evidence = evidenceRows(sections);
    expect(evidence).toHaveLength(8);
    expect(evidence.find(e => e.label === "Geographical Focus")).toEqual({ label: "Geographical Focus", status: "source", source: "Blue Science Park member location", url: "https://www.bluesciencepark.se/", retrieved_at: "2026-11-13" });
    expect(evidence.find(e => e.label === "Development Priorities")).toEqual({ label: "Development Priorities", status: "missing", source: "No company information supplied yet" });
  });
});
