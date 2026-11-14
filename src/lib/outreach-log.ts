import { useCallback, useEffect, useState } from "react";
import type { Category, Company, Opportunity } from "@/lib/ecosystem";
import { actionBrief, bspServices, outcomeLabels, type ActionKind, type BspServiceId } from "@/lib/action-brief";

/**
 * Outcome tracking for outreach. Every email prepared from the service is logged with its
 * action brief, and BSP staff update the status as companies respond.
 * Prototype storage: this browser only (localStorage). A shared table is the next step.
 */

export type OutreachStatus = "Sent" | "Interested" | "Converted" | "Declined" | "No response";
export const outreachStatuses: OutreachStatus[] = ["Sent", "Interested", "Converted", "Declined", "No response"];

export type OutreachEntry = {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  category: Category;
  action: ActionKind;
  serviceId: BspServiceId;
  companyId: string;
  companyName: string;
  status: OutreachStatus;
  sentAt: string;
  updatedAt: string;
  sentBy: string;
  simulated?: boolean;
};

const KEY = "bsp-outreach-log-v1";
const EVENT = "bsp-outreach-log";

export function statusLabel(entry: Pick<OutreachEntry, "status" | "action">) {
  return entry.status === "Converted" ? outcomeLabels[entry.action] : entry.status;
}

export function loadLog(): OutreachEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as OutreachEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: OutreachEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable: tracking lasts for this page view only */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function entryFor(opportunity: Opportunity, company: Pick<Company, "id" | "name">, sentBy: string, now = new Date()): OutreachEntry {
  const brief = actionBrief(opportunity);
  return {
    id: `${opportunity.id}:${company.id}:${now.getTime()}`,
    opportunityId: opportunity.id,
    opportunityTitle: opportunity.title,
    category: opportunity.category,
    action: brief.kind,
    serviceId: brief.service.id,
    companyId: company.id,
    companyName: company.name,
    status: "Sent",
    sentAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sentBy,
  };
}

/** Logs outreach; a repeat send of the same opportunity to the same company updates the existing row. */
export function logOutreach(newEntries: OutreachEntry[]) {
  const current = loadLog();
  for (const e of newEntries) {
    const existing = current.find(c => c.opportunityId === e.opportunityId && c.companyId === e.companyId);
    if (existing) existing.updatedAt = e.updatedAt;
    else current.unshift(e);
  }
  saveLog(current);
}

export function setStatus(id: string, status: OutreachStatus) {
  saveLog(loadLog().map(e => (e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e)));
}

export function clearLog(onlySimulated = false) {
  saveLog(onlySimulated ? loadLog().filter(e => !e.simulated) : []);
}

export function useOutreachLog() {
  const [entries, setEntries] = useState<OutreachEntry[]>([]);
  const refresh = useCallback(() => setEntries(loadLog()), []);
  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);
  return entries;
}

export type Breakdown = { key: string; label: string; sent: number; converted: number; rate: number };
export type OutreachSummary = {
  total: number;
  companies: number;
  converted: number;
  interested: number;
  awaiting: number;
  declined: number;
  rate: number;
  byStage: Record<OutreachStatus, number>;
  byService: Breakdown[];
  byCategory: Breakdown[];
};

function breakdown(entries: OutreachEntry[], keyOf: (e: OutreachEntry) => string, labelOf: (key: string) => string): Breakdown[] {
  const groups = new Map<string, OutreachEntry[]>();
  for (const e of entries) groups.set(keyOf(e), [...(groups.get(keyOf(e)) ?? []), e]);
  return [...groups.entries()]
    .map(([key, list]) => { const converted = list.filter(e => e.status === "Converted").length; return { key, label: labelOf(key), sent: list.length, converted, rate: list.length ? converted / list.length : 0 }; })
    .sort((a, b) => b.sent - a.sent || b.converted - a.converted);
}

export function summarize(entries: OutreachEntry[]): OutreachSummary {
  const byStage = Object.fromEntries(outreachStatuses.map(s => [s, entries.filter(e => e.status === s).length])) as Record<OutreachStatus, number>;
  const converted = byStage.Converted;
  return {
    total: entries.length,
    companies: new Set(entries.map(e => e.companyId)).size,
    converted,
    interested: byStage.Interested,
    awaiting: byStage.Sent,
    declined: byStage.Declined + byStage["No response"],
    rate: entries.length ? converted / entries.length : 0,
    byStage,
    byService: breakdown(entries, e => e.serviceId, k => bspServices[k as BspServiceId]?.name ?? k),
    byCategory: breakdown(entries, e => e.category, k => k),
  };
}

/** Clearly-marked simulated history so the report can be demonstrated before real outreach exists. */
export function demoEntries(companies: Company[], opportunities: Opportunity[], now = new Date()): OutreachEntry[] {
  const pattern: OutreachStatus[] = ["Converted", "Interested", "Sent", "Converted", "No response", "Converted", "Declined", "Interested", "Sent", "Converted"];
  const out: OutreachEntry[] = [];
  let i = 0;
  for (const o of opportunities) {
    for (const c of companies.filter(c => o.tags.some(t => c.tags.includes(t))).slice(0, 2)) {
      const sent = new Date(now.getTime() - (i + 1) * 86_400_000 * 1.5);
      out.push({ ...entryFor(o, c, "Demo staff", sent), id: `demo:${o.id}:${c.id}`, status: pattern[i % pattern.length]!, simulated: true });
      i++;
    }
  }
  return out;
}

export function seedDemo(companies: Company[], opportunities: Opportunity[]) {
  saveLog([...loadLog().filter(e => !e.simulated), ...demoEntries(companies, opportunities)]);
}

const csvCell = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export function logToCSV(entries: OutreachEntry[]) {
  const head = ["Sent", "Company", "Opportunity", "Type", "Next step", "BSP service", "Status", "Last update", "Sent by", "Simulated"];
  const rows = entries.map(e => [e.sentAt.slice(0, 10), e.companyName, e.opportunityTitle, e.category, outcomeLabels[e.action], bspServices[e.serviceId]?.name ?? e.serviceId, statusLabel(e), e.updatedAt.slice(0, 10), e.sentBy, e.simulated ? "yes" : "no"]);
  return [head, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n");
}
