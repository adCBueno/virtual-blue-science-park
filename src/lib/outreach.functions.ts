import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  messages: z.array(z.object({
    companyId: z.string().trim().min(1).max(40),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(8000),
  })).min(1).max(25),
});

/** Staff-only: sends each message to the company's representative account. Recipients are resolved on the server. */
export const sendOutreachEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const { sendOutreach } = await import("@/lib/outreach.server");
    return sendOutreach(data.messages, context.supabase);
  });
