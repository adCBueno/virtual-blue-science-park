import {
  ArrowUpRight,
  CalendarCheck,
  ClipboardCheck,
  FlaskConical,
  Handshake,
  Info,
  Ticket,
} from "lucide-react";
import {
  actionBrief,
  servicesNote,
  testingKind,
  testingKindLabels,
  type ActionKind,
} from "@/lib/action-brief";
import type { Opportunity } from "@/lib/ecosystem";

const kindIcons: Record<ActionKind, typeof Ticket> = {
  register: Ticket,
  rsvp: CalendarCheck,
  apply: ClipboardCheck,
  book: FlaskConical,
  intro: Handshake,
};

/** The next step for one opportunity, and which Blue Science Park service helps with it. */
export function ActionBriefCard({
  opportunity,
  compact = false,
}: {
  opportunity: Opportunity;
  compact?: boolean;
}) {
  const brief = actionBrief(opportunity);
  const Icon = kindIcons[brief.kind];
  return (
    <section className={`action-brief ${compact ? "is-compact" : ""}`} aria-label="Action brief">
      <div className="action-brief-head">
        <span className="action-brief-icon">
          <Icon />
        </span>
        <div>
          <span className="eyebrow">
            ACTION BRIEF
            {opportunity.category === "Testing" &&
              ` · ${testingKindLabels[testingKind(opportunity)].toUpperCase()}`}
          </span>
          <h3>{brief.headline}</h3>
        </div>
      </div>
      {!compact && brief.checklist.length > 0 && (
        <ul className="action-checklist">
          {brief.checklist.map((item) => (
            <li key={item}>
              <span aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}
      <a className="action-cta" href={brief.cta.url} target="_blank" rel="noreferrer">
        {brief.cta.label}
        <ArrowUpRight size={13} />
      </a>
      <div className="action-service">
        <small>How BSP helps</small>
        <strong>{brief.service.name}</strong>
        {!compact && (
          <p>
            {brief.service.offer} {brief.service.ask}
          </p>
        )}
      </div>
      <p className="action-caveat">
        <Info size={11} />
        {brief.caveat}
        {!compact && ` ${servicesNote}`}
      </p>
    </section>
  );
}
