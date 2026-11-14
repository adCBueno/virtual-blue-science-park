import { describe, expect, it } from "vitest";
import { companies, opportunities } from "@/lib/ecosystem";
import {
  buildBriefing,
  demoUpdates,
  outcomeUpdates,
  upcomingUpdates,
  windowStart,
  type ParkUpdate,
} from "@/lib/briefing";
import { demoEntries } from "@/lib/outreach-log";

const now = new Date("2026-11-14T09:00:00");

describe("staff briefing", () => {
  it("windows start at the beginning of the day, counted back", () => {
    expect(windowStart("yesterday", now, null).toDateString()).toBe(
      new Date("2026-11-13T00:00:00").toDateString(),
    );
    expect(windowStart("7d", now, null).getDate()).toBe(7);
    expect(windowStart("last-visit", now, "2026-11-12T15:00:00.000Z").toISOString()).toBe(
      "2026-11-12T15:00:00.000Z",
    );
  });

  it("only includes updates inside the window", () => {
    const updates = demoUpdates(now);
    const yesterday = buildBriefing({
      updates,
      companies,
      since: windowStart("yesterday", now, null),
      now,
    });
    const week = buildBriefing({ updates, companies, since: windowStart("7d", now, null), now });
    expect(yesterday.total).toBeLessThan(week.total);
    expect(week.total).toBe(updates.length);
  });

  it("keeps highlights short and never repeats a company", () => {
    const b = buildBriefing({
      updates: demoUpdates(now),
      companies,
      since: windowStart("7d", now, null),
      now,
      highlightLimit: 3,
    });
    expect(b.highlights.length).toBeLessThanOrEqual(3);
    expect(new Set(b.highlights.map((h) => h.companyId)).size).toBe(b.highlights.length);
  });

  it("ranks milestones above routine profile edits", () => {
    const at = now.toISOString();
    const updates: ParkUpdate[] = [
      { id: "p", companyId: "nord", kind: "profile", title: "Edited", why: "", at, tags: [] },
      {
        id: "m",
        companyId: "ocean",
        kind: "milestone",
        title: "Pilot",
        why: "",
        at,
        tags: ["marine"],
      },
    ];
    expect(
      buildBriefing({ updates, companies, since: windowStart("yesterday", now, null), now })
        .highlights[0]!.id,
    ).toBe("m");
  });

  it("lists quiet companies and suggests connections between companies active on the same topic", () => {
    const b = buildBriefing({
      updates: demoUpdates(now),
      companies,
      since: windowStart("7d", now, null),
      now,
    });
    expect(b.quiet.every((c) => !b.byCompany.some((g) => g.company.id === c.id))).toBe(true);
    for (const s of b.signals) {
      expect(s.a.id).not.toBe(s.b.id);
      expect(s.shared.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("turns outreach responses into outcome updates and upcoming deadlines into reminders", () => {
    const outcomes = outcomeUpdates(demoEntries(companies, opportunities, now));
    expect(outcomes.length).toBeGreaterThan(0);
    expect(outcomes.every((o) => o.kind === "outcome")).toBe(true);
    const upcoming = upcomingUpdates(opportunities, companies, now);
    expect(upcoming.every((u) => u.source?.url)).toBe(true);
  });
});
