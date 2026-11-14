import { afterEach, describe, expect, it, vi } from "vitest";

const reps: Record<string, { user_id: string; email: string }> = { nord: { user_id: "u-nord", email: "rep@nord.test" } };

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => {
      let company = "";
      const q = { select: () => q, eq: (col: string, v: string) => { if (col === "company_id") company = v; return q; }, maybeSingle: async () => ({ data: reps[company] ? { user_id: reps[company]!.user_id } : null, error: null }) };
      return q;
    },
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { email: Object.values(reps).find(r => r.user_id === id)?.email } } }) } },
  },
}));

const { sendOutreach } = await import("@/lib/outreach.server");
const client = (staff: boolean) => ({ rpc: async () => ({ data: staff, error: null }) }) as never;
const msg = (companyId: string) => ({ companyId, subject: "Opportunity", body: "Hello" });

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("outreach sending", () => {
  it("refuses anyone who is not Blue Science Park staff", async () => {
    await expect(sendOutreach([msg("nord")], client(false))).rejects.toThrow(/Only Blue Science Park staff/);
  });

  it("sends nothing when email delivery is not configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { configured, results } = await sendOutreach([msg("nord")], client(true));
    expect(configured).toBe(false);
    expect(results[0]!.status).toBe("not-configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves the representative on the server and reports companies without one", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("OUTREACH_FROM_EMAIL", "Blue Science Park <hello@bsp.test>");
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { results } = await sendOutreach([msg("nord"), msg("ocean")], client(true));
    expect(results.map(r => r.status)).toEqual(["sent", "no-recipient"]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.to).toEqual(["rep@nord.test"]);
  });
});
