import { describe, expect, it } from "vitest";
import { canEditCompany, applyProfile, draftFrom, type Account } from "@/lib/account";
import { companies } from "@/lib/ecosystem";
const representative: Account = {
  id: "rep",
  name: "Representative",
  email: "",
  role: "representative",
  companyId: "nord",
};
const published = {
  name: "Nord Sensor",
  description: "Published description.",
  interests: ["Testing"],
  technologies: ["sensors"],
  priorities: "",
  products_services: "Sensor kits.",
  markets: "Industry.",
  geographical_focus: "Karlskrona.",
  projects: "",
};
describe("company account boundaries", () => {
  it("visitors cannot edit company profiles", () => {
    expect(canEditCompany(null, "nord")).toBe(false);
  });
  it("representatives edit only their associated company", () => {
    expect(canEditCompany(representative, "nord")).toBe(true);
    expect(canEditCompany(representative, "ocean")).toBe(false);
  });
  it("staff may manage member companies", () => {
    expect(canEditCompany({ ...representative, role: "staff", companyId: null }, "ocean")).toBe(
      true,
    );
  });
  it("unassigned authenticated users receive no editing permissions", () => {
    expect(canEditCompany({ ...representative, role: "unassigned", companyId: null }, "nord")).toBe(
      false,
    );
  });
  it("without an accessible profile the published baseline remains unchanged", () => {
    expect(applyProfile(companies[0], undefined).description).toBe(companies[0].description);
  });
  it("starts editing from the published sections and keeps private notes separate", () => {
    const draft = draftFrom(companies[0], published, "call RISE about the testbed");
    expect(draft.description).toBe("Published description.");
    expect(draft.products_services).toBe("Sensor kits.");
    expect(draft.interests).toEqual(["Testing"]);
    expect(draft.private_notes).toBe("call RISE about the testbed");
  });
  it("gives a visitor with no draft no private notes to publish", () => {
    expect(draftFrom(companies[0]).private_notes).toBe("");
  });
});
