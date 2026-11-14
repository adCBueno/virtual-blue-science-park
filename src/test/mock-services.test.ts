import { beforeEach, describe, expect, it } from "vitest";
import { chatResponseSchema } from "@/contracts/ecosystem";
import { services } from "@/data/services";
import { createTeamApiTransport } from "@/data/team-api.server";
import { draftFrom } from "@/lib/account";

const {
  companyRepository,
  opportunityRepository,
  authService,
  reviewService,
  assistantService,
  recommendationService,
} = services;

beforeEach(() => authService.reset());

describe("fixture-backed workspace", () => {
  it("retrieves the original catalogue and applies company interests when ranking", () => {
    expect(companyRepository.list()).toHaveLength(7);
    expect(opportunityRepository.list()).toHaveLength(11);
    expect(companyRepository.get("missing")).toBeUndefined();
    expect(opportunityRepository.get("missing")).toBeUndefined();
    const nord = companyRepository.list()[0];
    const ocean = companyRepository.list()[1];
    expect(recommendationService.recommendations(nord, ["Funding"])[0]?.category).toBe("Funding");
    expect(recommendationService.recommendations(ocean, ["Funding"])[0]?.id).not.toBe(
      recommendationService.recommendations(nord, ["Funding"])[0]?.id,
    );
  });

  it("protects private drafts and publishes only explicit fields", async () => {
    const nord = companyRepository.list()[0];
    const ocean = companyRepository.list()[1];
    const draft = {
      ...draftFrom(nord),
      name: "Edited name",
      description: "Private draft",
      private_notes: "Staff note",
    };
    expect(() => companyRepository.save(nord.id, draft, [])).toThrow();
    authService.preview("representative");
    expect(() => companyRepository.save(ocean.id, draft, [])).toThrow();
    companyRepository.save(nord.id, draft, []);
    expect(companyRepository.privateProfiles()[0]?.privateNotes).toBe("Staff note");
    expect(
      (
        await assistantService.reply({
          question: "Tell me about the company",
          companyId: nord.id,
          history: [],
        })
      ).answer,
    ).toContain("Private draft");
    authService.preview("guest");
    expect(companyRepository.privateProfiles()).toEqual([]);
    expect(
      (
        await assistantService.reply({
          question: "Tell me about the company",
          companyId: nord.id,
          history: [],
        })
      ).answer,
    ).not.toContain("Private draft");
    authService.preview("representative");
    companyRepository.save(nord.id, draft, ["description"]);
    authService.preview("guest");
    const published = companyRepository
      .publicProfiles()
      .find((profile) => profile.companyId === nord.id);
    expect(published).toMatchObject({ name: nord.name, description: "Private draft" });
    expect(published).not.toHaveProperty("privateNotes");
  });

  it("creates in-app requests only for staff and exposes them to the recipient", () => {
    const nord = companyRepository.list()[0];
    expect(() => reviewService.request(nord.id)).toThrow();
    authService.preview("staff");
    expect(() => reviewService.request(nord.id)).toThrow("Save your draft");
    companyRepository.save(nord.id, draftFrom(nord), []);
    const request = reviewService.request(nord.id);
    expect(() => reviewService.request(nord.id)).toThrow("already pending");
    authService.preview("guest");
    expect(reviewService.list()).toEqual([]);
    authService.preview("representative");
    expect(reviewService.list()).toEqual([request]);
  });

  it("produces deterministic, validated chat actions", async () => {
    const input = { question: "Focus Ocean Collective", companyId: "nord", history: [] };
    expect((await assistantService.reply(input)).action).toEqual({
      kind: "focus",
      companyId: "ocean",
    });
    expect((await assistantService.reply({ ...input, question: "Filter Funding" })).action).toEqual(
      { kind: "filter", category: "Funding" },
    );
    await expect(assistantService.reply({ ...input, question: "" })).rejects.toThrow();
  });

  it("validates team API responses with the same contract as mock responses", async () => {
    const input = { question: "Hello", companyId: null, history: [] };
    const reply = await assistantService.reply(input);
    const operation = { request: () => ({ path: "example-only" }), response: chatResponseSchema };
    const valid = createTeamApiTransport("https://team.example.test", async () =>
      Response.json(reply),
    );
    await expect(valid(operation, input)).resolves.toEqual(reply);
    const invalid = createTeamApiTransport("https://team.example.test", async () =>
      Response.json({}),
    );
    await expect(invalid(operation, input)).rejects.toThrow();
  });
});
