import { describe, expect, it } from "vitest";
import { companies, opportunities, recommendations } from "@/lib/ecosystem";
import { actionBrief, briefEmailLines, requirementItems } from "@/lib/action-brief";
import { demoEntries, logToCSV, statusLabel, summarize } from "@/lib/outreach-log";

const byId = (id: string) => opportunities.find((o) => o.id === id)!;

describe("action brief", () => {
  it("events lead to registration and BSP matchmaking", () => {
    const b = actionBrief(byId("marine-event"));
    expect(b.kind).toBe("register");
    expect(b.cta.label).toMatch(/Registration/);
    expect(b.service.id).toBe("matchmaking");
  });

  it("funding lists every requirement to confirm and routes to BSP funding guidance", () => {
    const o = byId("smart-funding");
    const b = actionBrief(o);
    expect(b.kind).toBe("apply");
    expect(b.service.id).toBe("funding-guidance");
    for (const r of requirementItems(o.requirements))
      expect(b.checklist).toContain(`Confirm: ${r}`);
    expect(b.caveat).toMatch(/eligibility is decided by the funder/);
  });

  it("testing routes to the BSP facility that fits the topic", () => {
    expect(actionBrief(byId("test-ocean")).service.id).toBe("mtc");
    expect(actionBrief(byId("test-industry")).service.id).toBe("digital-testbed");
    expect(actionBrief(byId("test-health")).service.id).toBe("ai-lab");
  });

  it("uses a direct registration form when the organiser publishes one", () => {
    const b = actionBrief({
      ...byId("marine-event"),
      registrationUrl: "https://example.org/register",
    });
    expect(b.cta).toEqual({
      label: "Registration form",
      url: "https://example.org/register",
      direct: true,
    });
  });

  it("formats next steps as a numbered list, without a checklist label or caveat note", () => {
    const lines = briefEmailLines(byId("smart-funding"));
    expect(lines[0]).toBe("NEXT STEPS");
    expect(lines[1]).toMatch(/^1\. Check the requirements and prepare an application: https:/);
    expect(lines[2]).toMatch(/^2\. Confirm: /);
    const text = lines.join("\n");
    expect(text).not.toMatch(/Checklist|☐|Note:/);
  });

  it("puts the next step and the BSP service in the email", () => {
    const text = briefEmailLines(byId("smart-funding")).join("\n");
    expect(text).toContain("NEXT STEP");
    expect(text).toContain("Funding guidance");
  });
});

describe("outcome tracking", () => {
  const entries = demoEntries(companies, opportunities, new Date("2026-11-14T10:00:00Z"));

  it("marks demo rows as simulated", () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.simulated)).toBe(true);
  });

  it("summarises conversion by stage, BSP service and type", () => {
    const s = summarize(entries);
    expect(s.total).toBe(entries.length);
    expect(s.converted).toBe(entries.filter((e) => e.status === "Converted").length);
    expect(s.byService.reduce((n, b) => n + b.sent, 0)).toBe(entries.length);
    expect(s.byCategory.reduce((n, b) => n + b.converted, 0)).toBe(s.converted);
  });

  it("labels a conversion by what it means for that opportunity type", () => {
    const funding = entries.find((e) => e.category === "Funding")!;
    expect(statusLabel({ ...funding, status: "Converted" })).toBe("Applied");
    expect(logToCSV(entries).split("\r\n")[0]).toContain("BSP service");
  });

  it("is empty-safe", () => {
    expect(summarize([]).rate).toBe(0);
  });
});

describe("testing opportunities", () => {
  const testing = opportunities.filter((o) => o.category === "Testing");

  it("cover testbeds, laboratories, demonstration environments and pilots", async () => {
    const { testingKind } = await import("@/lib/action-brief");
    expect(new Set(testing.map((o) => testingKind(o)))).toEqual(
      new Set(["testbed", "laboratory", "demonstration", "pilot"]),
    );
  });

  it("give each kind its own next step, routed to a BSP service", async () => {
    const { testingKind } = await import("@/lib/action-brief");
    const verbs = Object.fromEntries(testing.map((o) => [testingKind(o), actionBrief(o).verb]));
    expect(verbs).toEqual({
      testbed: "Request a test slot",
      laboratory: "Book lab time",
      demonstration: "Book a demonstration slot",
      pilot: "Apply for the pilot",
    });
    const pilot = actionBrief(byId("test-harbour-pilot"));
    expect(pilot.checklist).toContain("Name a contact person for the pilot period");
    expect(pilot.service.id).toBe("mtc");
    expect(actionBrief(byId("test-ai-lab")).service.id).toBe("ai-lab");
  });

  it("match companies with different profiles and explain why", () => {
    for (const company of companies.filter((c) => c.interests.includes("Testing"))) {
      const matches = recommendations(company, company.interests, "Testing");
      expect(matches.length).toBeGreaterThan(1);
      for (const m of matches) expect(m.tags.some((t) => company.tags.includes(t))).toBe(true);
    }
    const nord = recommendations(
      companies.find((c) => c.id === "nord")!,
      [],
      "Testing",
    ).map((o) => o.id);
    const pulse = recommendations(
      companies.find((c) => c.id === "pulse")!,
      [],
      "Testing",
    ).map((o) => o.id);
    expect(nord).not.toEqual(pulse);
  });
});
