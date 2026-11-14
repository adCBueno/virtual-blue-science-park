import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Mail,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  companiesFor,
  fitLabel,
  fitLevel,
  fitReason,
  type Company,
  type CompanyFit,
  type Opportunity,
} from "@/lib/ecosystem";
import { briefEmailLines } from "@/lib/action-brief";
import { recipientLabels, useRepresentatives } from "@/lib/representatives";
import {
  emailText,
  fitsInMailto,
  mailtoUrl,
  statusLabels,
  useOutreachStatus,
} from "@/lib/use-send-outreach";
import { entryFor, logOutreach } from "@/lib/outreach-log";
import { ActionBriefCard } from "@/components/action-brief-card";

function draftFor(opportunity: Opportunity, fit: CompanyFit, sender: string) {
  return {
    subject: `Opportunity for ${fit.company.name}: ${opportunity.title}`,
    body: [
      `Hi ${fit.company.name} team,`,
      "",
      "We came across an opportunity that may fit your work:",
      "",
      `${opportunity.title} (${opportunity.category}) — ${opportunity.source}`,
      opportunity.date,
      opportunity.summary,
      "",
      `Why we think it's relevant: ${fitReason(fit, opportunity.category)}.`,
      "",
      ...briefEmailLines(opportunity),
      "",
      "Happy to help if you'd like to explore it.",
      "",
      "Best regards,",
      sender || "Blue Science Park staff",
      "Blue Science Park",
    ].join("\n"),
  };
}

/**
 * Staff view of one opportunity: every member company it fits, ranked with the reason,
 * then personalised outreach drafts — one per selected company.
 */
export function OpportunityMatchPanel({
  opportunity,
  companies,
  sender,
  onClose,
  onFocusCompany,
  inline = false,
}: {
  /** Drawn inside the company panel (map view) instead of as its own side panel. */
  inline?: boolean;
  opportunity: Opportunity;
  companies: Company[];
  sender: string;
  onClose: () => void;
  onFocusCompany: (company: Company) => void;
}) {
  const fits = useMemo(() => companiesFor(opportunity, companies), [opportunity, companies]);
  const [selected, setSelected] = useState<string[]>(() =>
    fits.filter((f) => fitLevel(f.score) !== "Possible").map((f) => f.company.id),
  );
  const [step, setStep] = useState<"match" | "outreach">("match");
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const outreach = useOutreachStatus();
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setStep("match");
    setBodies({});
    setSelected(fits.filter((f) => fitLevel(f.score) !== "Possible").map((f) => f.company.id));
  }, [opportunity.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = fits.filter((f) => selected.includes(f.company.id));
  const recipients = useRepresentatives(step === "outreach" ? chosen.map((f) => f.company) : []);
  const prepared = chosen.filter((f) => outreach.statuses[f.company.id] === "prepared").length;
  /** The app sends nothing itself: opening the draft or copying it marks the email as prepared. */
  const markPrepared = (fit: CompanyFit) => {
    if (outreach.statuses[fit.company.id] !== "prepared")
      logOutreach([entryFor(opportunity, fit.company, sender || "BSP staff")]);
    outreach.mark(fit.company.id, "prepared");
  };
  const copyText = async (fit: CompanyFit, subject: string, body: string) => {
    try {
      await navigator.clipboard.writeText(emailText(subject, body));
      markPrepared(fit);
    } catch {
      /* clipboard blocked: the text stays visible under "Review message" */
    }
  };
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const others = companies.length - fits.length;

  /* Switching between ranking and emails only changes the section below the brief:
     keep the panel where it is and bring that section into view, instead of jumping to the top. */
  const panelRef = useRef<HTMLElement>(null);
  const Root = inline ? "section" : "aside";
  const stepRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const panel = panelRef.current;
    const section = stepRef.current;
    if (!panel || !section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (inline) {
      section.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      return;
    }
    panel.scrollTo({
      top: Math.max(0, section.offsetTop - 12),
      behavior: reduce ? "auto" : "smooth",
    });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Root
      ref={panelRef}
      className={`detail-panel match-panel ${inline ? "side-content" : ""}`}
      aria-label={`Companies that fit ${opportunity.title}`}
    >
      <div className="detail-top">
        <span className="eyebrow">
          {step === "match" ? "REVERSE MATCHING · STAFF" : "PREPARE OUTREACH"}
        </span>
        <Button variant="ghost" size="icon" aria-label="Close matching" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="match-opportunity">
        <span className={`detail-icon category-${opportunity.category.toLowerCase()}`}>
          <Sparkles />
        </span>
        <div>
          <small>
            {opportunity.category} · {opportunity.source}
          </small>
          <h2>{opportunity.title}</h2>
          <span className="match-date">{opportunity.date}</span>
        </div>
      </div>
      <a className="match-source" href={opportunity.url} target="_blank" rel="noreferrer">
        Open source
        <ExternalLink size={12} />
      </a>
      <ActionBriefCard opportunity={opportunity} compact />

      <div ref={stepRef} key={step} className="match-step" aria-live="polite">
        {step === "match" ? (
          <>
            <div className="match-summary">
              <strong>
                {fits.length} of {companies.length} companies
              </strong>{" "}
              share expertise with this opportunity.
              <span>
                Ranked by thematic fit — shared expertise plus stated priorities. Not an eligibility
                check.
              </span>
            </div>

            <ul className="match-list">
              {fits.map((fit) => {
                const level = fitLevel(fit.score);
                const isOn = selected.includes(fit.company.id);
                return (
                  <li key={fit.company.id} className={`match-row ${isOn ? "is-selected" : ""}`}>
                    <label className="match-check">
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() => toggle(fit.company.id)}
                        aria-label={`Include ${fit.company.name}`}
                      />
                      <span className="match-body">
                        <span className="match-name">
                          {fit.company.name}
                          <em className={`fit-chip fit-${level.toLowerCase()}`}>
                            {fitLabel(fit.score)}
                          </em>
                        </span>
                        <span className="match-reason">{fitReason(fit, opportunity.category)}</span>
                        <span className="match-industry">{fit.company.industry}</span>
                      </span>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="match-view"
                      onClick={() => onFocusCompany(fit.company)}
                      aria-label={`Open ${fit.company.name}`}
                    >
                      <ArrowUpRight />
                    </Button>
                  </li>
                );
              })}
            </ul>
            {others > 0 && (
              <p className="match-others">
                {others} other {others === 1 ? "company doesn't" : "companies don't"} share
                expertise with this opportunity.
              </p>
            )}

            <div className="match-footer">
              <Button disabled={!chosen.length} onClick={() => setStep("outreach")}>
                <Mail />
                Prepare {chosen.length} {chosen.length === 1 ? "email" : "emails"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="ghost" className="match-back" onClick={() => setStep("match")}>
              <ArrowLeft />
              Back to ranking
            </Button>
            <p className="match-summary-text">
              One personalised email per company: its reason, the next steps and how BSP can help.
              Open each draft in your own mail app, or copy it. Prepared emails are logged in
              Reports.
            </p>
            <ul className="outreach-list">
              {chosen.map((fit) => {
                const id = fit.company.id;
                const draft = draftFor(opportunity, fit, sender);
                const body = bodies[id] ?? draft.body;
                const recipient = recipients(id);
                const email = recipient.state === "found" ? recipient.email : null;
                const status =
                  outreach.statuses[id] ??
                  (recipient.state === "none" ? "no-recipient" : undefined);
                const fits = fitsInMailto(body);
                return (
                  <li
                    key={id}
                    className={`outreach-card ${status === "prepared" ? "is-sent" : status ? "is-failed" : ""}`}
                  >
                    <div className="outreach-head">
                      <strong>{fit.company.name}</strong>
                      {status ? (
                        <span className={`outreach-sent status-${status}`}>
                          {status === "prepared" && <Check size={12} />}
                          {statusLabels[status]}
                        </span>
                      ) : (
                        <em className={`fit-chip fit-${fitLevel(fit.score).toLowerCase()}`}>
                          {fitLevel(fit.score)}
                        </em>
                      )}
                    </div>
                    <span className="match-reason">{fitReason(fit, opportunity.category)}</span>
                    <div className="recipient-line">
                      <span>To</span>
                      {recipient.state === "found" ? (
                        <>
                          <strong>{recipient.name ?? `${fit.company.name} representative`}</strong>
                          <small>{recipient.email}</small>
                        </>
                      ) : recipient.state === "error" ? (
                        <small>{recipient.message}</small>
                      ) : (
                        <small>{recipientLabels[recipient.state]}</small>
                      )}
                    </div>
                    <button
                      type="button"
                      className="outreach-toggle"
                      onClick={() => setOpen((o) => (o === id ? null : id))}
                    >
                      {open === id ? "Hide message" : "Review message"}
                    </button>
                    {open === id && (
                      <label className="editor-field">
                        Message
                        <textarea
                          rows={10}
                          value={body}
                          onChange={(e) => setBodies((b) => ({ ...b, [id]: e.target.value }))}
                        />
                      </label>
                    )}
                    <div className="outreach-actions">
                      <Button
                        size="sm"
                        disabled={!email || !fits}
                        onClick={() => {
                          if (!email) return;
                          window.location.href = mailtoUrl(email, draft.subject, body);
                          markPrepared(fit);
                        }}
                      >
                        <Mail />
                        Open in mail app
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void copyText(fit, draft.subject, body)}
                      >
                        <Copy />
                        Copy email text
                      </Button>
                    </div>
                    {email && !fits && (
                      <small className="outreach-note">
                        This message is too long for a mail link. Copy it and paste it into a new
                        email to {email}.
                      </small>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="match-summary-text">
              {prepared} of {chosen.length} prepared
            </p>
            <span className="demo-label email-demo">
              The app doesn&apos;t send email itself: each draft opens in your own mail app.
            </span>
          </>
        )}
      </div>
    </Root>
  );
}
