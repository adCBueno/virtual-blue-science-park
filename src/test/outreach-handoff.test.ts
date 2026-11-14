import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { BackendEcosystem, BackendUser } from "@/data/api/contract";

const fn = vi.hoisted(() => ({ backendRepresentative: vi.fn() }));
vi.mock("@/data/api/backend.functions", () => fn);

const { applySnapshot, writeSession, backendState } = await import("@/data/api/store");
const reps = await import("@/lib/representatives");
const { mailtoUrl, fitsInMailto, MAILTO_BODY_LIMIT } = await import("@/lib/use-send-outreach");
const log = await import("@/lib/outreach-log");

const admin: BackendUser = {
  id: "u-admin",
  email: "admin@bsp.example.com",
  role: "admin",
  company_id: null,
};
const company: BackendUser = {
  id: "u-nordsense",
  email: "demo@nordsense.example.com",
  role: "company",
  company_id: "nordsense",
};
const session = (user: BackendUser) => ({
  token: "tok-admin",
  user,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
});
const data: BackendEcosystem = {
  profiles: [
    {
      company_id: "nordsense",
      name: "NordSense AB",
      website: "https://nordsense.example.com",
      visibility: "published",
      updated_at: "2026-11-13T09:00:00Z",
      claims: [],
    },
    {
      company_id: "nord",
      name: "Nord",
      website: "https://nord.example.com",
      visibility: "published",
      updated_at: "2026-11-13T09:00:00Z",
      claims: [],
    },
  ],
  opportunities: [],
  recommendations: [],
};

beforeEach(() => {
  fn.backendRepresentative.mockReset();
  applySnapshot({ enabled: true, data: structuredClone(data), user: null, sessionExpired: false });
  writeSession(session(admin));
});
afterEach(() => vi.unstubAllGlobals());

describe("representative lookup", () => {
  it("uses the backend in API mode with the staff session token and returns the email", async () => {
    fn.backendRepresentative.mockResolvedValue({
      status: "found",
      email: "demo@nordsense.example.com",
    });
    await expect(reps.representativeFor({ id: "nordsense" })).resolves.toEqual({
      state: "found",
      email: "demo@nordsense.example.com",
    });
    expect(fn.backendRepresentative).toHaveBeenCalledWith({
      data: { token: "tok-admin", companyId: "nordsense" },
    });
  });

  it("maps 200, 404, 403 and 401 from GET /companies/{id}/representative", async () => {
    process.env["API_URL"] = "http://api.test";
    const { lookupRepresentative } = await import("@/data/api/backend.server");
    const reply = (status: number, body?: unknown) =>
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          body ? Response.json(body, { status }) : Response.json({ detail: "x" }, { status }),
        ),
      );
    reply(200, { company_id: "nordsense", email: "demo@nordsense.example.com" });
    await expect(lookupRepresentative("tok", "nordsense")).resolves.toEqual({
      status: "found",
      email: "demo@nordsense.example.com",
    });
    reply(404);
    await expect(lookupRepresentative("tok", "nordsense")).resolves.toEqual({ status: "none" });
    reply(403);
    await expect(lookupRepresentative("tok", "nordsense")).resolves.toEqual({ status: "login" });
    reply(401);
    await expect(lookupRepresentative("tok", "nordsense")).resolves.toEqual({ status: "login" });
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as unknown as [URL];
    expect(String(url)).toBe("http://api.test/companies/nordsense/representative");
  });

  it("404 shows 'No representative account'; 403 and non-staff sessions show the staff-login message", async () => {
    fn.backendRepresentative.mockResolvedValueOnce({ status: "none" });
    const none = await reps.representativeFor({ id: "nordsense" });
    expect(none.state === "none" && reps.recipientLabels[none.state]).toBe(
      "No representative account",
    );
    fn.backendRepresentative.mockResolvedValueOnce({ status: "login" });
    const forbidden = await reps.representativeFor({ id: "nordsense" });
    expect(forbidden.state === "login" && reps.recipientLabels[forbidden.state]).toBe(
      "Log in as BSP staff to see recipients",
    );
    writeSession(session(company));
    expect(await reps.representativeFor({ id: "nordsense" })).toEqual({ state: "login" });
    writeSession(null);
    expect(await reps.representativeFor({ id: "nordsense" })).toEqual({ state: "login" });
    expect(fn.backendRepresentative).toHaveBeenCalledTimes(2);
  });

  it("never returns a fixture email when the team API is on", async () => {
    expect(backendState.enabled).toBe(true);
    fn.backendRepresentative.mockResolvedValue({ status: "none" });
    const results = [await reps.representativeFor({ id: "nord" })];
    writeSession(null);
    results.push(await reps.representativeFor({ id: "nord" }));
    expect(JSON.stringify(results)).not.toContain("example.test");
    expect(results.map((r) => r.state)).toEqual(["none", "login"]);
  });

  it("looks up each company once, in parallel, for the panel's lifetime", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    fn.backendRepresentative.mockImplementation(
      async ({ data }: { data: { companyId: string } }) => {
        await gate;
        return { status: "found", email: `demo@${data.companyId}.example.com` };
      },
    );
    const companies = [{ id: "nordsense" }, { id: "medtrace" }];
    const { result, rerender } = renderHook(({ list }) => reps.useRepresentatives(list), {
      initialProps: { list: companies },
    });
    await waitFor(() => expect(fn.backendRepresentative).toHaveBeenCalledTimes(2));
    expect(result.current("nordsense")).toEqual({ state: "loading" });
    release();
    await waitFor(() =>
      expect(result.current("medtrace")).toEqual({
        state: "found",
        email: "demo@medtrace.example.com",
      }),
    );
    rerender({ list: [...companies] });
    rerender({ list: [companies[0]!] });
    expect(fn.backendRepresentative).toHaveBeenCalledTimes(2);
  });
});

describe("mailto hand-off", () => {
  it("percent-encodes spaces, line breaks, & ? and non-ASCII characters", () => {
    const url = mailtoUrl(
      "demo@nordsense.example.com",
      "Funding & testing? Karlskrona",
      "Hej Åsa,\nsee: a&b?c=d\n\nVälkommen",
    );
    expect(url).toBe(
      "mailto:demo@nordsense.example.com?subject=Funding%20%26%20testing%3F%20Karlskrona" +
        "&body=Hej%20%C3%85sa%2C%0D%0Asee%3A%20a%26b%3Fc%3Dd%0D%0A%0D%0AV%C3%A4lkommen",
    );
    expect(url).not.toMatch(/[ \n+]/);
    const [, query] = url.split("?");
    const params = new URLSearchParams(query!.replace(/\+/g, "%2B"));
    expect(params.get("body")).toBe("Hej Åsa,\r\nsee: a&b?c=d\r\n\r\nVälkommen");
    expect(
      decodeURIComponent(mailtoUrl("x@y.se", "å", "å").split("subject=")[1]!.split("&")[0]!),
    ).toBe("å");
  });

  it("asks to copy instead when the body is too long for a mail link", () => {
    expect(fitsInMailto("a".repeat(MAILTO_BODY_LIMIT))).toBe(true);
    expect(fitsInMailto("a".repeat(MAILTO_BODY_LIMIT + 1))).toBe(false);
  });

  it("logs prepared emails in Reports as 'Prepared', never 'Sent'", () => {
    const opportunity = {
      id: "o1",
      title: "Grant",
      category: "Funding" as const,
      summary: "s",
      date: "d",
      source: "Vinnova",
      url: "https://vinnova.se",
      requirements: "r",
      tags: [],
    };
    const entry = log.entryFor(opportunity, { id: "nordsense", name: "NordSense" }, "Staff");
    expect(entry.status).toBe("Prepared");
    window.localStorage.setItem(
      "bsp-outreach-log-v1",
      JSON.stringify([{ ...entry, status: "Sent" }]),
    );
    expect(log.loadLog()[0]?.status).toBe("Prepared");
    expect(log.logToCSV(log.loadLog())).not.toMatch(/\bSent\b/);
  });
});
