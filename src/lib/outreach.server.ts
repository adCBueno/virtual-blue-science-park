import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Server-only outreach delivery.
 * - Only Blue Science Park staff may send (checked with the caller's own database client).
 * - Recipients are never supplied by the browser: each company's representative account is looked up
 *   here, so the service cannot be used to email arbitrary addresses.
 * - Delivery uses Resend when RESEND_API_KEY and OUTREACH_FROM_EMAIL are set (Lovable Secrets);
 *   otherwise every message reports "not-configured" and nothing leaves the server.
 */

export type OutreachMessage = { companyId: string; subject: string; body: string };
export type SendStatus = "sent" | "failed" | "not-configured" | "no-recipient";
export type SendResult = { companyId: string; status: SendStatus; detail: string };

async function representativeEmail(companyId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role, error } = await supabaseAdmin.from("user_roles").select("user_id").eq("company_id", companyId).eq("role", "representative").maybeSingle();
  if (error || !role?.user_id) return null;
  const { data: user } = await supabaseAdmin.auth.admin.getUserById(role.user_id);
  return user?.user?.email ?? null;
}

async function deliver(to: string, m: OutreachMessage, key: string, from: string): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: m.subject, text: m.body }),
  });
  return res.ok
    ? { companyId: m.companyId, status: "sent", detail: "Delivered to the representative's account email" }
    : { companyId: m.companyId, status: "failed", detail: `Email service answered ${res.status}` };
}

export async function sendOutreach(messages: OutreachMessage[], supabase: SupabaseClient<Database>): Promise<{ configured: boolean; results: SendResult[] }> {
  const staff = await supabase.rpc("is_staff");
  if (staff.error || staff.data !== true) throw new Error("Only Blue Science Park staff can send outreach emails.");

  const key = process.env["RESEND_API_KEY"];
  const from = process.env["OUTREACH_FROM_EMAIL"];
  const configured = Boolean(key && from);
  const results: SendResult[] = [];
  for (const m of messages) {
    const to = await representativeEmail(m.companyId);
    if (!to) { results.push({ companyId: m.companyId, status: "no-recipient", detail: "This company has no representative account yet" }); continue; }
    if (!configured) { results.push({ companyId: m.companyId, status: "not-configured", detail: "Email delivery is not configured yet" }); continue; }
    try { results.push(await deliver(to, m, key!, from!)); }
    catch { results.push({ companyId: m.companyId, status: "failed", detail: "Could not reach the email service" }); }
  }
  return { configured, results };
}
