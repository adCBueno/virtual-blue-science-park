import { describe, expect, it } from "vitest";
import { companies, opportunities } from "@/lib/ecosystem";
import {
  daysUntil,
  parseOpportunityDate,
  teamUpFor,
  urgencyBoost,
  weeklyDigest,
} from "@/lib/digest";

const today = new Date(Date.UTC(2026, 10, 14)); // 14 Nov 2026, hackathon weekend
const company = (id: string) => companies.find((c) => c.id === id)!;
const opp = (id: string) => opportunities.find((o) => o.id === id)!;

describe("dates", () => {
  it("parses demo labels and treats rolling applications as undated", () => {
    expect(
      parseOpportunityDate("Demo deadline · 18 December 2026")?.toISOString().slice(0, 10),
    ).toBe("2026-12-18");
    expect(parseOpportunityDate("Demo opportunity · Rolling applications")).toBeNull();
    expect(daysUntil("Demo meetup · 25 November 2026", today)).toBe(11);
  });
});

describe("weekly digest (Subtraction + Attribute Dependency)", () => {
  it("never shows more than three items, and never two of the same category", () => {
    for (const c of companies) {
      const items = weeklyDigest(c, { today });
      expect(items.length).toBeLessThanOrEqual(3);
      expect(new Set(items.map((i) => i.category)).size).toBe(items.length);
    }
  });

  it("ranks the same item higher as its deadline gets closer", () => {
    expect(urgencyBoost(5)).toBeGreaterThan(urgencyBoost(30));
    expect(urgencyBoost(30)).toBeGreaterThan(urgencyBoost(90));
    const early = weeklyDigest(company("aether"), {
      today: new Date(Date.UTC(2026, 8, 1)),
      limit: 6,
    });
    const late = weeklyDigest(company("aether"), { today, limit: 6 });
    const rankOf = (items: typeof early) => items.find((i) => i.id === "ai-workshop")!.rank;
    expect(rankOf(late)).toBeGreaterThan(rankOf(early));
  });

  it("drops opportunities whose date has passed", () => {
    const items = weeklyDigest(company("nord"), {
      today: new Date(Date.UTC(2026, 11, 20)),
      limit: 6,
    });
    expect(items.map((i) => i.id)).not.toContain("industry-event");
  });

  it("explains every item in one plain sentence", () => {
    for (const item of weeklyDigest(company("nord"), { today }))
      expect(item.why).toMatch(/^Shares /);
  });
});

describe("Not for us (Task Unification)", () => {
  it("removes the item and lets the next one in", () => {
    const before = weeklyDigest(company("ocean"), { today });
    const first = before[0]!;
    const after = weeklyDigest(company("ocean"), { today, dismissed: [first.id] });
    expect(after.map((i) => i.id)).not.toContain(first.id);
    expect(after.length).toBe(before.length);
  });
});

describe("team-ups (Multiplication)", () => {
  it("suggests a partner who brings missing expertise for a collaborative call", () => {
    const t = teamUpFor(opp("ocean-funding"), company("ocean"))!;
    expect(t.mode).toBe("apply-together");
    expect(t.company.id).not.toBe("ocean");
    expect(t.brings.some((tag) => !company("ocean").tags.includes(tag))).toBe(true);
  });

  it("suggests who to meet at an event, and nothing for a solo testbed", () => {
    expect(teamUpFor(opp("marine-event"), company("baltic"))?.mode).toBe("meet-there");
    expect(teamUpFor(opp("test-industry"), company("nord"))).toBeNull();
  });
});
