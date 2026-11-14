import { beforeEach, describe, expect, it } from "vitest";
import { services } from "@/data/services";
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
  it("defaults to public access and grants roles through known demo logins", () => {
    expect(authService.currentUser()).toBeNull();
    expect(() => authService.signIn("unknown@example.test")).toThrow();
    expect(authService.currentUser()).toBeNull();
    authService.signIn("demo-nord@example.test");
    expect(authService.currentUser()).toMatchObject({ role: "representative", companyId: "nord" });
    authService.signIn("demo-staff@example.test");
    expect(authService.currentUser()).toMatchObject({ role: "staff", companyId: null });
    authService.signOut();
    expect(authService.currentUser()).toBeNull();
  });

  it("treats a saved role preview as public access", () => {
    sessionStorage.setItem(
      "bsp-demo-workspace",
      JSON.stringify({
        userId: "demo-staff",
        preview: true,
        published: [],
        drafts: [],
        requests: [],
      }),
    );
    expect(authService.currentUser()).toBeNull();
  });
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
    authService.signIn("demo-nord@example.test");
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
    authService.signOut();
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
    authService.signIn("demo-nord@example.test");
    companyRepository.save(nord.id, draft, ["description"]);
    authService.signOut();
    const published = companyRepository
      .publicProfiles()
      .find((profile) => profile.companyId === nord.id);
    expect(published).toMatchObject({ name: nord.name, description: "Private draft" });
    expect(published).not.toHaveProperty("privateNotes");
  });

  it("creates in-app requests only for staff and exposes them to the recipient", () => {
    const nord = companyRepository.list()[0];
    expect(() => reviewService.request(nord.id)).toThrow();
    authService.signIn("demo-staff@example.test");
    expect(() => reviewService.request(nord.id)).toThrow("Save your draft");
    companyRepository.save(nord.id, draftFrom(nord), []);
    const request = reviewService.request(nord.id);
    expect(() => reviewService.request(nord.id)).toThrow("already pending");
    authService.signOut();
    expect(reviewService.list()).toEqual([]);
    authService.signIn("demo-nord@example.test");
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
});
