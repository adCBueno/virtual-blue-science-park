import { useState } from "react";
type OutreachMessage = { companyId: string; subject: string; body: string };
type SendResult = {
  companyId: string;
  status: "sent" | "failed" | "not-configured" | "no-recipient";
  detail?: string;
};

export type SendState = {
  busy: boolean;
  error: string;
  results: Record<string, SendResult>;
  demo: boolean;
};

/**
 * Sends outreach from the app. With a real staff session it goes through the server; in the
 * simulated role preview nothing is sent and every message is marked as a demo send.
 */
export function useSendOutreach(_live: boolean) {
  const [state, setState] = useState<SendState>({
    busy: false,
    error: "",
    results: {},
    demo: false,
  });

  const run = async (messages: OutreachMessage[]): Promise<SendResult[]> => {
    setState((s) => ({ ...s, busy: true, error: "" }));
    try {
      const results: SendResult[] = messages.map(({ companyId }) => ({
        companyId,
        status: "not-configured",
      }));
      setState((s) => ({
        ...s,
        busy: false,
        demo: false,
        results: { ...s.results, ...Object.fromEntries(results.map((r) => [r.companyId, r])) },
      }));
      return results;
    } catch (err) {
      setState((s) => ({
        ...s,
        busy: false,
        error: err instanceof Error ? err.message : "Sending failed. Please try again.",
      }));
      return [];
    }
  };
  return { ...state, send: run };
}

export const resultLabels: Record<SendResult["status"], string> = {
  sent: "Sent",
  failed: "Failed",
  "not-configured": "Not sent — email not configured",
  "no-recipient": "No representative account",
};
