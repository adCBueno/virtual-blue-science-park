import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import {
  chatRequestSchema,
  chatResponseSchema,
  companyProfileSchema,
  companySchema,
  idSchema,
  opportunitySchema,
  recommendationSchema,
} from "@/contracts/ecosystem";
import { collaborators, companies, opportunities } from "@/lib/ecosystem";

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

const fixtures = "../data/fixtures/";
const companyRecords = z.array(companySchema).parse(readJson(fixtures + "companies.json"));
const profiles = z.array(companyProfileSchema).parse(readJson(fixtures + "company-profiles.json"));
const listings = z.array(opportunitySchema).parse(readJson(fixtures + "opportunities.json"));
const matches = z
  .array(recommendationSchema)
  .parse(readJson(fixtures + "collaboration-matches.json"));
const companyIds = new Set(companyRecords.map(({ id }) => id));
const opportunityIds = new Set(listings.map(({ id }) => id));

describe("ecosystem fixtures", () => {
  it("preserves the legacy catalogue, display content and order", () => {
    expect(companyRecords).toEqual(
      companies.map(({ id, industry, sector }) => ({ id, industry, sector })),
    );
    expect(
      profiles.map(({ companyId, name, description, technologies, opportunityInterests }) => ({
        id: companyId,
        name,
        description,
        tags: technologies,
        interests: opportunityInterests,
      })),
    ).toEqual(
      companies.map(({ id, name, description, tags, interests }) => ({
        id,
        name,
        description,
        tags,
        interests,
      })),
    );
    expect(
      listings.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        summary: item.description,
        date: item.schedulingLabel,
        source: item.sourceLabel,
        url: item.sourceUrl,
        requirements: item.eligibility,
        tags: item.technologies,
      })),
    ).toEqual(opportunities);
  });

  it("uses unique IDs and includes one published profile and desktop visual entry per company", () => {
    expect(companyIds.size).toBe(companyRecords.length);
    expect(opportunityIds.size).toBe(listings.length);
    expect(profiles.map(({ companyId }) => companyId).sort()).toEqual([...companyIds].sort());
    const visuals = z
      .record(
        idSchema,
        z.strictObject({
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          tone: z.string().min(1),
          mark: z.string().min(1),
          label: z.string().min(1),
        }),
      )
      .parse(readJson("../features/universe/desktop-node-visuals.json"));
    expect(
      Object.fromEntries(
        Object.entries(visuals).map(([id, { x, y, tone, mark }]) => [id, { x, y, tone, mark }]),
      ),
    ).toEqual(
      Object.fromEntries(companies.map(({ id, x, y, tone, mark }) => [id, { x, y, tone, mark }])),
    );
  });

  it("preserves both directed collaboration targets and the shared technologies", () => {
    expect(
      matches.map(({ companyId, target, factors }) => ({ companyId, target, factors })),
    ).toEqual(
      companies.flatMap((company) =>
        collaborators(company).map(({ id, shared }) => ({
          companyId: company.id,
          target: { kind: "collaboration", targetCompanyId: id },
          factors: [{ kind: "sharedTechnology", values: shared }],
        })),
      ),
    );
  });

  it("validates references in recommendation and chat examples", () => {
    const samplePath = "../../docs/api/examples.json";
    const examples = z
      .strictObject({
        recommendation: recommendationSchema,
        chatRequest: chatRequestSchema,
        chatResponse: chatResponseSchema,
      })
      .parse(readJson(samplePath));
    for (const match of [...matches, examples.recommendation]) {
      expect(companyIds.has(match.companyId)).toBe(true);
      if (match.target.kind === "opportunity") {
        expect(opportunityIds.has(match.target.opportunityId)).toBe(true);
      } else {
        expect(companyIds.has(match.target.targetCompanyId)).toBe(true);
        expect(match.target.targetCompanyId).not.toBe(match.companyId);
      }
    }
    expect(companyIds.has(examples.chatRequest.companyId ?? "")).toBe(true);
    const { action } = examples.chatResponse;
    expect(action.kind).toBe("highlight");
    if (action.kind === "highlight") {
      expect(action.opportunityIds.length + action.companyIds.length).toBeGreaterThan(0);
      for (const id of action.opportunityIds) expect(opportunityIds.has(id)).toBe(true);
      for (const id of action.companyIds) expect(companyIds.has(id)).toBe(true);
    }
  });

  it("rejects private notes on published profiles and invalid calendar dates", () => {
    expect(
      companyProfileSchema.safeParse({ ...profiles[0], privateNotes: "private" }).success,
    ).toBe(false);
    expect(opportunitySchema.safeParse({ ...listings[0], deadlineOn: "2026-02-30" }).success).toBe(
      false,
    );
  });
});
