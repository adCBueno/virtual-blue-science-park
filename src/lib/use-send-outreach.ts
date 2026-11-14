import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendOutreachEmails } from "@/lib/outreach.functions";
import type { OutreachMessage, SendResult } from "@/lib/outreach.server";

export type SendState = { busy: boolean; error: string; results: Record<string, SendResult>; demo: boolean };

/**
 * Sends outreach from the app. With a real staff session it goes through the server; in the
 * simulated role preview nothing is sent and every message is marked as a demo send.
 */
export function useSendOutreach(live: boolean) {
  const send = useServerFn(sendOutreachEmails);
  const [state, setState] = useState<SendState>({ busy: false, error: "", results: {}, demo: !live });

  const run = async (messages: OutreachMessage[]): Promise<SendResult[]> => {
    setState(s => ({ ...s, busy: true, error: "" }));
    try {
      const results: SendResult[] = live
        ? (await send({ data: { messages } })).results
        : messages.map(m => ({ companyId: m.companyId, status: "sent" as const, detail: "Demo preview — nothing was actually sent" }));
      setState(s => ({ ...s, busy: false, demo: !live, results: { ...s.results, ...Object.fromEntries(results.map(r => [r.companyId, r])) } }));
      return results;
    } catch (err) {
      setState(s => ({ ...s, busy: false, error: err instanceof Error ? err.message : "Sending failed. Please try again." }));
      return [];
    }
  };
  return { ...state, send: run };
}

export const resultLabels: Record<SendResult["status"], string> = { sent: "Sent", failed: "Failed", "not-configured": "Not sent — email not configured", "no-recipient": "No representative account" };
