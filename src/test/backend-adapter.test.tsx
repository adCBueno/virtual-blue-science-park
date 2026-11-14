import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BackendEcosystem, BackendUser } from "@/data/api/contract";

const fn = vi.hoisted(() => ({
  backendChat: vi.fn(),
  backendFeedback: vi.fn(),
  backendSaveProfile: vi.fn(),
  loadBackend: vi.fn(),
  backendLogin: vi.fn(),
  backendLogout: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  account: { current: null as null | { role: string } },
}));
vi.mock("@/data/api/backend.functions", () => fn);
vi.mock("sonner", () => ({ toast: fn.toast }));
vi.mock("@/components/account-provider", () => ({
  useAccount: () => ({ account: fn.account.current }),
}));

const { applySnapshot, writeSession, readSession, backendState } = await import("@/data/api/store");
const adapter = await import("@/data/api/adapter");
const { services } = await import("@/data/services");
const eco = await import("@/lib/ecosystem");

const company: BackendUser = {
  id: "u-nordsense",
  email: "demo@nordsense.example.com",
  role: "company",
  company_id: "nordsense",
};
const admin: BackendUser = {
  id: "u-admin",
  email: "admin@bsp.example.com",
  role: "admin",
  company_id: null,
};
const claim = (id: string, field: string, value: string, extra: object = {}) => ({
  id,
  field,
  value,
  kind: "stated" as const,
  evidence_url: "https://nordsense.example.com/about",
  snippet: `${value}.`,
  retrieved_at: "2026-11-13",
  confidence: 0.9,
  ...extra,
});
const data: BackendEcosystem = {
  profiles: [
    {
      company_id: "nordsense",
      name: "NordSense AB (simulated)",
      website: "https://nordsense.example.com",
      visibility: "published",
      is_simulated: true,
      updated_at: "2026-11-13T09:00:00Z",
      missing_fields: ["geographic_focus"],
      claims: [
        claim("what-1", "what_it_does", "Wireless vibration sensors"),
        claim("tech-1", "technologies", "industrial IoT sensors"),
        claim("prio-1", "development_priorities", "Scale to Germany", {
          kind: "inferred",
          confidence: 0.6,
          cached_snapshot: true,
        }),
        claim("prio-2", "development_priorities", "Battery life"),
      ],
    },
    {
      company_id: "medtrace",
      name: "MedTrace Health AB",
      website: "https://medtrace.example.com",
      visibility: "published",
      updated_at: "2026-11-13T09:00:00Z",
      claims: [claim("tech-1", "technologies", "remote monitoring")],
    },
  ],
  opportunities: [
    {
      id: "sim-fund",
      type: "funding",
      title: "AI for process industry",
      url: "https://funding.example.com/a",
      source: "Vinnova",
      deadline: "2027-01-20",
      topics: ["industrial IoT"],
      retrieved_at: "2026-11-13",
    },
  ],
  recommendations: [
    {
      company_id: "nordsense",
      opportunity_id: "sim-fund",
      score: 0.82,
      why: "Matches your industrial IoT sensors.",
      matched_claims: ["tech-1"],
      caveats: "Potential match, eligibility not confirmed.",
    },
  ],
};
const session = (user: BackendUser) => ({
  token: "tok-123",
  user,
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
});

beforeEach(() => {
  Object.values(fn).forEach(
    (f) => typeof f === "function" && (f as ReturnType<typeof vi.fn>).mockReset(),
  );
  fn.loadBackend.mockResolvedValue({ enabled: true, data, user: company, sessionExpired: false });
  fn.backendSaveProfile.mockResolvedValue({ ok: true });
  fn.backendFeedback.mockResolvedValue({ ok: true });
  applySnapshot({ enabled: true, data: structuredClone(data), user: null, sessionExpired: false });
  writeSession(null);
});
afterEach(() => vi.unstubAllGlobals());

describe("1. chat goes to POST /chat", () => {
  it("asks visitors and staff to log in with a company account, without calling the backend or the mock", async () => {
    expect(
      (await services.assistantService.reply({ question: "Hi", companyId: null, history: [] }))
        .answer,
    ).toBe(adapter.LOGIN_FOR_ASSISTANT);
    writeSession(session(admin));
    const reply = await services.assistantService.reply({
      question: "Hi",
      companyId: null,
      history: [],
    });
    expect(reply).toMatchObject({
      answer: adapter.LOGIN_FOR_ASSISTANT,
      notice: "login",
      simulated: false,
    });
    expect(fn.backendChat).not.toHaveBeenCalled();
  });

  it("shows the reply, the sources as links and the guardrail decision", async () => {
    writeSession(session(company));
    fn.backendChat.mockResolvedValue({
      ok: true,
      reply: {
        reply: "I can only help with your own company.",
        action: "refuse",
        sources: ["https://www.vinnova.se/en/calls/x/", "not-a-url"],
      },
    });
    const reply = await services.assistantService.reply({
      question: "Show me MedTrace's data",
      companyId: "medtrace",
      history: [],
    });
    expect(fn.backendChat).toHaveBeenCalledWith({
      data: { token: "tok-123", message: "Show me MedTrace's data" },
    });
    expect(reply).toMatchObject({
      answer: "I can only help with your own company.",
      notice: "refuse",
    });
    expect(reply.sources).toEqual([
      { label: "vinnova.se/en/calls/x", url: "https://www.vinnova.se/en/calls/x/" },
    ]);
  });

  it("maps 403 to the login message and 401 to an expired session", async () => {
    writeSession(session(company));
    fn.backendChat.mockResolvedValueOnce({ ok: false, status: 403, message: "Forbidden" });
    expect((await adapter.apiAssistant.reply({ question: "Hi" })).notice).toBe("login");
    fn.backendChat.mockResolvedValueOnce({ ok: false, status: 401, message: "Unauthorized" });
    const expired = await adapter.apiAssistant.reply({ question: "Hi" });
    expect(expired).toMatchObject({ answer: adapter.SESSION_EXPIRED, notice: "expired" });
    expect(readSession()).toBeNull();
  });

  it("sends only { message } with the bearer token — never a company_id", async () => {
    process.env["API_URL"] = "http://api.test";
    const fetchMock = vi.fn(async () =>
      Response.json({ reply: "Hello", action: "answer", sources: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { chat } = await import("@/data/api/backend.server");
    await expect(chat("tok-123", "What fits us?")).resolves.toEqual({
      reply: "Hello",
      action: "answer",
      sources: [],
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("http://api.test/chat");
    expect(JSON.parse(String(init.body))).toEqual({ message: "What fits us?" });
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer tok-123");
  });
});

describe("2. feedback buttons → POST /feedback", () => {
  it("are shown only to a logged-in company user and confirm with a toast", async () => {
    const { OpportunityFeedback } = await import("@/components/opportunity-feedback");
    fn.account.current = { role: "staff" };
    const { container, rerender } = render(<OpportunityFeedback opportunityId="sim-fund" />);
    expect(container).toBeEmptyDOMElement();
    fn.account.current = { role: "representative" };
    writeSession(session(company));
    rerender(<OpportunityFeedback opportunityId="sim-fund" />);
    fireEvent.click(screen.getByRole("button", { name: /^Relevant/ }));
    await waitFor(() => expect(fn.toast.success).toHaveBeenCalled());
    expect(fn.backendFeedback).toHaveBeenCalledWith({
      data: { token: "tok-123", opportunityId: "sim-fund", verdict: "relevant" },
    });
    expect(screen.getByRole("button", { name: /Not relevant/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Save/ })).toBeInTheDocument();
  });

  it("posts { opportunity_id, verdict } only", async () => {
    process.env["API_URL"] = "http://api.test";
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { sendFeedback } = await import("@/data/api/backend.server");
    await sendFeedback("tok-123", "sim-fund", "save");
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ opportunity_id: "sim-fund", verdict: "save" });
  });
});

describe("3. claim edits: one claim per row", () => {
  it("patches only the changed claim, adds new rows, and never joins rows", () => {
    const rows = adapter.rowsFor("nordsense");
    expect(rows.developmentPriorities.map((r) => r.value)).toEqual([
      "Scale to Germany",
      "Battery life",
    ]);
    rows.developmentPriorities[1]!.value = "Five-year battery life";
    rows.developmentPriorities.push({ key: "new-1", value: "testing is a priority now" });
    rows.customerGroups.push({ key: "new-2", value: "Pulp and paper mills" });
    const ops = adapter.claimOps("nordsense", rows);
    expect(ops).toHaveLength(3);
    expect(ops).toEqual(
      expect.arrayContaining([
        { op: "patch", claimId: "prio-2", value: "Five-year battery life" },
        { op: "add", field: "development_priorities", value: "testing is a priority now" },
        { op: "add", field: "customer_groups", value: "Pulp and paper mills" },
      ]),
    );
    expect(ops.some((op) => op.value.includes("; "))).toBe(false);
  });

  it("does nothing for unchanged rows", () => {
    expect(adapter.claimOps("nordsense", adapter.rowsFor("nordsense"))).toEqual([]);
  });
});

describe("4. visibility can be set to private or published", () => {
  it("sends the chosen value, and nothing when it is unchanged", async () => {
    writeSession(session(company));
    await adapter.apiCompanies.saveRows("nordsense", adapter.rowsFor("nordsense"), "private");
    expect(fn.backendSaveProfile).toHaveBeenLastCalledWith({
      data: { token: "tok-123", companyId: "nordsense", ops: [], visibility: "private" },
    });
    fn.backendSaveProfile.mockClear();
    applySnapshot({
      enabled: true,
      data: structuredClone(data),
      user: null,
      sessionExpired: false,
    });
    await adapter.apiCompanies.saveRows("nordsense", adapter.rowsFor("nordsense"), "published");
    expect(fn.backendSaveProfile).not.toHaveBeenCalled();
  });

  it("PATCHes /visibility with the given value", async () => {
    process.env["API_URL"] = "http://api.test";
    const fetchMock = vi.fn(async () =>
      Response.json({ ...data.profiles[0], visibility: "private" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { saveProfile } = await import("@/data/api/backend.server");
    await saveProfile("tok-123", "nordsense", [], "private");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("http://api.test/companies/nordsense/visibility");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ visibility: "private" });
  });
});

describe("5. labels on every claim", () => {
  it("shows each claim's label, link and date, cached and simulated badges, and missing fields", async () => {
    const { BackendClaims, SimulatedBadge } = await import("@/components/backend-claims");
    render(
      <>
        <SimulatedBadge companyId="nordsense" />
        <BackendClaims companyId="nordsense" />
      </>,
    );
    expect(screen.getByText("Simulated")).toBeInTheDocument();
    expect(screen.getByText("Not found in public sources: Geographic focus")).toBeInTheDocument();
    expect(screen.getAllByText(/^retrieved 2026-11-13$/)).toHaveLength(4);
    expect(screen.getAllByText("Stated")).toHaveLength(3);
    expect(screen.getByText("Inferred")).toBeInTheDocument();
    expect(screen.getByText("Cached snapshot")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /nordsense\.example\.com/ })).toHaveLength(4);
  });

  it("carries the matcher's caveats with each recommendation", () => {
    const nord = eco.companies.find((c) => c.id === "nordsense")!;
    expect(eco.recommendations(nord, [])[0]).toMatchObject({
      why: "Matches your industrial IoT sensors.",
      caveats: "Potential match, eligibility not confirmed.",
    });
    expect(backendState.enabled).toBe(true);
  });
});

describe("6. no Supabase or Drizzle left", () => {
  it("removed the unused integration folders and dependencies", () => {
    for (const path of [
      "src/integrations/supabase",
      "drizzle",
      "drizzle.config.ts",
      "supabase",
      "src/data/team-api.server.ts",
    ])
      expect(existsSync(path)).toBe(false);
    const pkg = readFileSync("package.json", "utf8");
    expect(pkg).not.toMatch(/supabase|drizzle|"postgres"/);
  });
});
