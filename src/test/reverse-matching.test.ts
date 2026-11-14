import { describe, expect, it } from "vitest";
import {
  companies,
  companiesFor,
  fitLabel,
  fitLevel,
  fitReason,
  opportunities,
} from "@/lib/ecosystem";
import { buildReport, toCSV, toEmailText } from "@/lib/report";

const byId = (id: string) => opportunities.find((o) => o.id === id)!;

describe("reverse matching", () => {
  it("only returns companies that share expertise, best fit first", () => {
    const fits = companiesFor(byId("test-ocean"));
    expect(fits.length).toBeGreaterThan(0);
    for (const f of fits) expect(f.shared.length).toBeGreaterThan(0);
    const scores = fits.map((f) => f.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(fits.map((f) => f.company.id)).not.toContain("pulse");
  });

  it("ranks a company whose stated priority matches the category above one that only shares tags", () => {
    const fits = companiesFor(byId("test-industry"));
    const nord = fits.find((f) => f.company.id === "nord")!;
    expect(nord.priority).toBe(true);
    expect(fits[0]!.company.id).toBe("nord");
  });

  it("gives different rankings for different opportunities", () => {
    const marine = companiesFor(byId("ocean-funding")).map((f) => f.company.id);
    const health = companiesFor(byId("test-health")).map((f) => f.company.id);
    expect(marine).not.toEqual(health);
  });

  it("explains every fit in plain language", () => {
    const fit = companiesFor(byId("test-industry"))[0]!;
    expect(fitReason(fit, "Testing")).toMatch(/^Shares .+ · testing is a stated priority$/);
  });
});

describe("fit labels are thematic, never probabilities or eligibility", () => {
  it("maps scores to levels", () => {
    expect(fitLevel(99)).toBe("Strong");
    expect(fitLevel(78)).toBe("Good");
    expect(fitLevel(69)).toBe("Possible");
    expect(fitLabel(90)).toBe("Strong thematic fit");
  });

  it("keeps percentages and eligibility claims out of exports and emails", () => {
    const company = companies[0];
    const report = buildReport({
      company,
      opportunities: [{ ...byId("test-industry"), score: 99 }],
      audience: "staff",
    });
    const text = toCSV(report) + toEmailText(report, { intro: "Hi", signature: "BSP" });
    expect(text).not.toMatch(/\d+%/);
    expect(text.toLowerCase()).not.toContain("eligible");
    expect(text).toContain("Strong");
  });
});
