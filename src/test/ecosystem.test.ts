import { describe, expect, it } from "vitest";
import { collaborators, companies, recommendations } from "@/lib/ecosystem";

describe("company-focused recommendations", () => {
  const sensor = companies[0];
  const ocean = companies[1];
  it("different companies receive different relevant opportunities", () => {
    expect(recommendations(sensor, []).some(o => o.id === "test-industry")).toBe(true);
    expect(recommendations(ocean, []).some(o => o.id === "test-ocean")).toBe(true);
    expect(recommendations(ocean, []).some(o => o.id === "test-industry")).toBe(true);
    expect(recommendations(sensor, []).some(o => o.id === "ocean-funding")).toBe(false);
  });
  it("prioritising funding moves funding to the front and increases its relevance", () => {
    const standard = recommendations(sensor, []);
    const funding = recommendations(sensor, ["Funding"]);
    expect(funding[0]?.category).toBe("Funding");
    expect(funding.find(o => o.id === "digital-funding")?.score).toBeGreaterThan(standard.find(o => o.id === "digital-funding")?.score ?? 0);
  });
  it("category filters only return the requested category", () => {
    const result = recommendations(sensor, [], "Testing");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(o => o.category === "Testing")).toBe(true);
  });
  it("suggested companies have common expertise and never include the focused company", () => {
    expect(collaborators(sensor).map(c => c.id)).toContain("modul");
    expect(collaborators(sensor).every(c => c.id !== sensor.id && c.shared.length > 0)).toBe(true);
    expect(collaborators(sensor).map(c => c.id)).not.toEqual(collaborators(ocean).map(c => c.id));
  });
});