import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { categories } from "@/lib/ecosystem";

export const accountWorkspace = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [role, profile, privateProfiles, reviews] = await Promise.all([
    context.supabase.from("user_roles").select("role,company_id").eq("user_id", context.userId).maybeSingle(),
    context.supabase.from("profiles").select("display_name").eq("id", context.userId).maybeSingle(),
    context.supabase.from("company_private_profiles").select("*"),
    context.supabase.from("profile_review_requests").select("*").order("created_at", { ascending: false }),
  ]);
  for (const result of [role, profile, privateProfiles, reviews]) if (result.error) throw new Error(result.error.message);
  return { role: role.data?.role ?? "unassigned", companyId: role.data?.company_id ?? null, name: profile.data?.display_name ?? "", privateProfiles: privateProfiles.data ?? [], reviews: reviews.data ?? [] };
});
const draftSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(5000), interests: z.array(z.enum(categories)).max(6), technologies: z.array(z.string().trim().min(1).max(100)).max(30), priorities: z.string().max(2000), private_notes: z.string().max(5000), products_services: z.string().max(4000), markets: z.string().max(4000), geographical_focus: z.string().max(2000), projects: z.string().max(4000) });
export const saveProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ companyId: z.string(), draft: draftSchema, publishFields: z.array(z.enum(["name", "description", "products_services", "technologies", "markets", "geographical_focus", "priorities", "projects", "interests"])).default([]) }))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("save_company_profile", { cid: data.companyId, profile_data: data.draft, publish_fields: data.publishFields });
    if (result.error) throw new Error(result.error.message);
    return { success: true };
  });
export const reviewRecipient = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ companyId: z.string() })).handler(async ({ data, context }) => {
  const { data: recipient, error } = await context.supabase.rpc("company_review_recipient", { cid: data.companyId });
  if (error) throw new Error(error.message);
  return { recipient };
});
export const sendReview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ companyId: z.string() })).handler(async ({ data, context }) => {
  const { data: id, error } = await context.supabase.rpc("send_company_review", { cid: data.companyId });
  if (error) throw new Error(error.message);
  return { id };
});