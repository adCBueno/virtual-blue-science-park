import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  question: z.string().trim().min(1).max(500),
  companyId: z.string().max(40).nullable().default(null),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) })).max(12).default([]),
});

/** Anyone may ask about publicly available information. Only public rows are read here. */
export const publicAssistantReply = createServerFn({ method: "POST" })
  .inputValidator(input)
  .handler(async ({ data }) => {
    const { buildAssistantContext, generateAssistantReply, publicClient } = await import("@/lib/assistant.server");
    const context = await buildAssistantContext(data.companyId, publicClient(), "public");
    return generateAssistantReply(data.question, data.history, context);
  });

/** Signed-in accounts additionally get the private draft of a company they manage, because row
 * level security only returns that row to staff or to its own representative. */
export const memberAssistantReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const { buildAssistantContext, generateAssistantReply } = await import("@/lib/assistant.server");
    const assistantContext = await buildAssistantContext(data.companyId, context.supabase, "member");
    return generateAssistantReply(data.question, data.history, assistantContext);
  });
