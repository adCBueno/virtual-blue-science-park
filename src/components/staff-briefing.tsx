import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, CheckCheck, ExternalLink, Handshake, Megaphone, Newspaper, PencilLine, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Company, Opportunity } from "@/lib/ecosystem";
import { buildBriefing, demoUpdates, kindLabels, outcomeUpdates, profileUpdates, upcomingUpdates, windowLabels, windowStart, type BriefingWindow, type ParkUpdate, type ProfileChange, type UpdateKind } from "@/lib/briefing";
import { useOutreachLog } from "@/lib/outreach-log";

const LAST_VISIT_KEY = "bsp-briefing-last-visit";
const kindIcons: Record<UpdateKind, typeof Newspaper> = { milestone: Trophy, news: Newspaper, outcome: Megaphone, profile: PencilLine, upcoming: CalendarClock };

function ago(iso: string, now: Date) {
  const h = Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function UpdateLine({ u, now }: { u: ParkUpdate; now: Date }) {
  const Icon = kindIcons[u.kind];
  return <li className={`brief-update kind-${u.kind}`}>
    <span className="brief-update-icon"><Icon /></span>
    <span className="brief-update-body">
      <strong>{u.title}</strong>
      <span className="brief-why">{u.why}</span>
      <span className="brief-meta">{kindLabels[u.kind]} · {u.kind === "upcoming" ? "deadline" : ago(u.at, now)}{u.source && <> · <a href={u.source.url} target="_blank" rel="noreferrer">{u.source.name}<ExternalLink size={10} /></a></>}{u.simulated && <em className="sim-tag">simulated</em>}</span>
    </span>
  </li>;
}

/** Staff-only briefing: the highlights across member companies since a point in time. */
export function StaffBriefing({ companies, opportunities, profileChanges, staffName, onOpenCompany }: {
  companies: Company[];
  opportunities: Opportunity[];
  profileChanges: ProfileChange[];
  staffName: string;
  onOpenCompany: (company: Company) => void;
}) {
  const outreach = useOutreachLog();
  const [now] = useState(() => new Date());
  const [window, setWindow] = useState<BriefingWindow>("yesterday");
  const [withSimulated, setWithSimulated] = useState(true);
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { try { setLastVisit(globalThis.localStorage.getItem(LAST_VISIT_KEY)); } catch { /* no storage */ } }, []);
  const markSeen = () => { const at = new Date().toISOString(); try { globalThis.localStorage.setItem(LAST_VISIT_KEY, at); } catch { /* no storage */ } setLastVisit(at); setWindow("last-visit"); };

  const since = windowStart(window, now, lastVisit);
  const briefing = useMemo(() => {
    const updates = [
      ...(withSimulated ? demoUpdates(now) : []),
      ...outcomeUpdates(withSimulated ? outreach : outreach.filter(e => !e.simulated)),
      ...profileUpdates(profileChanges),
      ...upcomingUpdates(opportunities, companies, now),
    ];
    return buildBriefing({ updates, companies, since, now });
  }, [withSimulated, outreach, profileChanges, opportunities, companies, now, since.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="opportunity-directory staff-briefing">
    <div className="brief-head">
      <div>
        <span className="eyebrow">STAFF BRIEFING · BLUE SCIENCE PARK ONLY</span>
        <h2>{greeting(now)}{staffName ? `, ${staffName.split(" ")[0]}` : ""}.</h2>
        <p className="brief-summary">{briefing.total === 0 ? "Nothing new in this period — a quiet stretch." : <><strong>{briefing.total} updates</strong> across <strong>{briefing.companies} companies</strong> {windowLabels[window].toLowerCase()}. {briefing.highlights.length} worth your attention, {briefing.quiet.length} quiet.</>}</p>
      </div>
      <div className="brief-controls">
        <div className="brief-windows" role="tablist" aria-label="Briefing period">{(Object.keys(windowLabels) as BriefingWindow[]).map(w => <button key={w} type="button" role="tab" aria-selected={window === w} data-active={window === w} onClick={() => setWindow(w)} disabled={w === "last-visit" && !lastVisit} title={w === "last-visit" && !lastVisit ? "Use “Mark all as seen” first" : undefined}>{windowLabels[w]}</button>)}</div>
        <div className="brief-control-row">
          <label className="brief-toggle"><input type="checkbox" checked={withSimulated} onChange={e => setWithSimulated(e.target.checked)} />Include simulated member news</label>
          <Button variant="outline" size="sm" className="share-button" onClick={markSeen}><CheckCheck /><span>Mark all as seen</span></Button>
        </div>
      </div>
    </div>

    {briefing.highlights.length > 0 && <section aria-label="Highlights">
      <h3 className="brief-section-title"><Sparkles size={14} />Highlights</h3>
      <div className="brief-highlights">{briefing.highlights.map(h => { const Icon = kindIcons[h.kind]; return <article key={h.id} className={`brief-highlight kind-${h.kind}`}>
        <div className="brief-highlight-top"><span className="brief-update-icon"><Icon /></span><span className="brief-company">{h.company.name}</span><span className="brief-kind">{kindLabels[h.kind]}</span></div>
        <h4>{h.title}</h4>
        <p>{h.why}</p>
        <div className="brief-highlight-foot"><span className="brief-meta">{ago(h.at, now)}{h.simulated && <em className="sim-tag">simulated</em>}</span><Button variant="ghost" size="sm" onClick={() => onOpenCompany(h.company)}>Open company<ArrowUpRight /></Button></div>
      </article>; })}</div>
    </section>}

    <div className="brief-columns">
      <section aria-label="Updates by company" className="brief-companies">
        <h3 className="brief-section-title">By company</h3>
        {briefing.byCompany.length === 0 && <p className="report-empty-line">No company activity in this period.</p>}
        {briefing.byCompany.map(({ company, updates }) => { const isOpen = expanded === company.id; const shown = isOpen ? updates : updates.slice(0, 2); return <div key={company.id} className="brief-company-card">
          <div className="brief-company-head">
            <div><strong>{company.name}</strong><small>{company.industry}</small></div>
            <span className="brief-count">{updates.length}</span>
            <Button variant="outline" size="sm" className="share-button" onClick={() => onOpenCompany(company)}><span>Open</span><ArrowUpRight /></Button>
          </div>
          <ul className="brief-updates">{shown.map(u => <UpdateLine key={u.id} u={u} now={now} />)}</ul>
          {updates.length > 2 && <button type="button" className="outreach-toggle" onClick={() => setExpanded(isOpen ? null : company.id)}>{isOpen ? "Show less" : `Show ${updates.length - 2} more`}</button>}
        </div>; })}
        {briefing.quiet.length > 0 && <p className="brief-quiet">Quiet in this period: {briefing.quiet.map(c => c.name).join(", ")}</p>}
      </section>

      <aside className="brief-side">
        <div className="report-card">
          <h3 className="brief-section-title"><Handshake size={14} />Possible connections</h3>
          {briefing.signals.length === 0 ? <p className="report-empty-line">No overlapping activity in this period.</p> : <ul className="brief-signals">{briefing.signals.map(s => <li key={`${s.a.id}-${s.b.id}`}>
            <strong>{s.a.name} <span>↔</span> {s.b.name}</strong>
            <span className="brief-why">{s.reason}</span>
            <span className="brief-signal-actions"><button type="button" onClick={() => onOpenCompany(s.a)}>{s.a.name} ↗</button><button type="button" onClick={() => onOpenCompany(s.b)}>{s.b.name} ↗</button></span>
          </li>)}</ul>}
          <p className="action-caveat">Suggestions based on shared topics — neither company has expressed interest yet.</p>
        </div>
        <div className="report-card brief-how">
          <h3>Where this comes from</h3>
          <ul>
            <li><Newspaper size={12} />Member news &amp; milestones — monitoring agent{withSimulated && " (simulated for now)"}</li>
            <li><Megaphone size={12} />Outreach outcomes — Reports</li>
            <li><PencilLine size={12} />Profile changes — company edits &amp; reviews</li>
            <li><CalendarClock size={12} />Deadlines in the next 14 days — Opportunity radar</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>;
}
