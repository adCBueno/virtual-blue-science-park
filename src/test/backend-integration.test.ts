/**
 * Runs against a live team backend: BACKEND_TEST_URL=http://127.0.0.1:8000 bun run test
 * (backend started with SEED_DIR=fixtures/mock OPPORTUNITY_REFRESH=off). Skipped otherwise.
 */
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env["BACKEND_TEST_URL"];

describe.skipIf(!url)("team backend integration", () => {
  beforeAll(() => {
    process.env["API_URL"] = url;
  });

  it("loads companies, profiles, opportunities and recommendations, mapped to the UI contract", async () => {
    const { loadEcosystem } = await import("@/data/api/backend.server");
    const { toUiCompany, toUiOpportunity, toUiProfile } = await import("@/data/api/mapping");
    const { companyProfileSchema, privateCompanyProfileSchema, opportunitySchema, companySchema } =
      await import("@/contracts/ecosystem");
    const data = await loadEcosystem();
    expect(data.profiles.length).toBeGreaterThan(0);
    expect(data.opportunities.length).toBeGreaterThan(0);
    for (const p of data.profiles) {
      companySchema.parse(toUiCompany(p));
      const ui = toUiProfile(p);
      (ui.visibility === "published" ? companyProfileSchema : privateCompanyProfileSchema).parse(
        ui,
      );
    }
    for (const o of data.opportunities) opportunitySchema.parse(toUiOpportunity(o));
    expect(
      data.recommendations.every((r) =>
        r.caveats.toLowerCase().includes("eligibility not confirmed"),
      ),
    ).toBe(true);
  });

  it("replaces the app's data and uses the backend matcher for rankings", async () => {
    const { loadEcosystem } = await import("@/data/api/backend.server");
    const { applySnapshot, backendState } = await import("@/data/api/store");
    const eco = await import("@/lib/ecosystem");
    const data = await loadEcosystem();
    applySnapshot({ enabled: true, data, user: null, sessionExpired: false });
    expect(backendState.enabled).toBe(true);
    expect(eco.companies.map((c) => c.id).sort()).toEqual(
      data.profiles.map((p) => p.company_id).sort(),
    );
    const withRecs = data.recommendations[0]!;
    const company = eco.companies.find((c) => c.id === withRecs.company_id)!;
    const ranked = eco.recommendations(company, company.interests);
    expect(ranked[0]?.why).toBeTruthy();
    expect(ranked.map((r) => r.score)).toEqual(
      [...ranked.map((r) => r.score)].sort((a, b) => b - a),
    );
    const opportunity = eco.opportunities.find((o) => o.id === withRecs.opportunity_id)!;
    expect(eco.companiesFor(opportunity).map((f) => f.company.id)).toContain(withRecs.company_id);
  });

  it("logs in, rejects a wrong password, and saves a profile edit as a confirmed claim", async () => {
    const api = await import("@/data/api/backend.server");
    await expect(api.login("demo@nordsense.example.com", "wrong")).rejects.toMatchObject({
      status: 401,
    });
    const session = await api.login("demo@nordsense.example.com", "demo-nordsense-2026");
    expect(session.user.company_id).toBe("nordsense");
    const { toUiUser } = await import("@/data/api/mapping");
    expect(toUiUser(session.user)).toMatchObject({
      role: "representative",
      companyId: "nordsense",
    });

    const { applySnapshot } = await import("@/data/api/store");
    const { claimOps } = await import("@/data/api/adapter");
    applySnapshot({
      enabled: true,
      data: await api.loadEcosystem(session.access_token),
      user: session.user,
      sessionExpired: false,
    });
    const draft = {
      name: "NordSense AB (simulated)",
      description: "Wireless sensors that keep paper mills running",
      interests: [],
      technologies: ["industrial IoT sensors", "LoRaWAN"],
      priorities: "",
      private_notes: "",
      products_services: "",
      markets: "",
      geographical_focus: "",
      projects: "",
    };
    const ops = claimOps("nordsense", draft);
    expect(ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: "patch", value: draft.description }),
        { op: "add", field: "technologies", value: "LoRaWAN" },
      ]),
    );
    await api.saveProfile(session.access_token, "nordsense", ops, false);
    const after = await api.loadEcosystem(session.access_token);
    const claims = after.profiles.find((p) => p.company_id === "nordsense")!.claims;
    expect(claims.find((c) => c.value === draft.description)?.kind).toBe("user_confirmed");
    expect(claims.some((c) => c.value === "LoRaWAN" && c.kind === "user_confirmed")).toBe(true);
    await expect(
      api.saveProfile(session.access_token, "medtrace", ops, false),
    ).rejects.toMatchObject({ status: 403 });
    await api.logout(session.access_token);
    await expect(api.me(session.access_token)).rejects.toMatchObject({ status: 401 });
  });
});
