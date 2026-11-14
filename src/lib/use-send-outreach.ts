import { useState } from "react";

/**
 * Outreach hand-off. The app never sends email itself: staff open a pre-filled draft in their own
 * mail app (mailto:) or copy the text. Statuses describe exactly that.
 */

/** Mail apps truncate long mailto: links; past this length the body is copied instead. */
export const MAILTO_BODY_LIMIT = 1800;

export type OutreachStatus = "prepared" | "no-recipient";
export const statusLabels: Record<OutreachStatus, string> = {
  prepared: "Prepared",
  "no-recipient": "No representative account",
};

/** RFC 6068 mailto: link. Line breaks become CRLF; everything else is percent-encoded. */
export function mailtoUrl(email: string, subject: string, body: string) {
  const crlf = body.replace(/\r?\n/g, "\r\n");
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlf)}`;
}

export function fitsInMailto(body: string) {
  return body.length <= MAILTO_BODY_LIMIT;
}

export const emailText = (subject: string, body: string) => `Subject: ${subject}\n\n${body}`;

export function useOutreachStatus() {
  const [statuses, setStatuses] = useState<Record<string, OutreachStatus>>({});
  const mark = (companyId: string, status: OutreachStatus) =>
    setStatuses((s) => ({ ...s, [companyId]: status }));
  return { statuses, mark };
}
