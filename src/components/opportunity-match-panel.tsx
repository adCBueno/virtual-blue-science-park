import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ExternalLink,
  Mail,
  Send,
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
import { representativeFor } from "@/lib/representatives";
import { resultLabels, useSendOutreach } from "@/lib/use-send-outreach";
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
  live = false,
}: {
  live?: boolean;
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
  const mailer = useSendOutreach(live);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setStep("match");
    setBodies({});
    setSelected(fits.filter((f) => fitLevel(f.score) !== "Possible").map((f) => f.company.id));
  }, [opportunity.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = fits.filter((f) => selected.includes(f.company.id));
  const pending = chosen.filter((f) => mailer.results[f.company.id]?.status !== "sent");
  const sendAll = async () => {
    const results = await mailer.send(
      pending.map((fit) => {
        const draft = draftFor(opportunity, fit, sender);
        return {
          companyId: fit.company.id,
          subject: draft.subject,
          body: bodies[fit.company.id] ?? draft.body,
        };
      }),
    );
    const delivered = pending.filter((f) =>
      results.some((r) => r.companyId === f.company.id && r.status === "sent"),
    );
    if (delivered.length)
      logOutreach(delivered.map((f) => entryFor(opportunity, f.company, sender || "BSP staff")));
  };
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const others = companies.length - fits.length;

  /* Switching between ranking and emails only changes the section below the brief:
     keep the panel where it is and bring that section into view, instead of jumping to the top. */
  const panelRef = useRef<HTMLElement>(null);
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
    panel.scrollTo({
      top: Math.max(0, section.offsetTop - 12),
      behavior: reduce ? "auto" : "smooth",
    });
  }, [step]);

  return (
    <aside
      ref={panelRef}
      className="detail-panel match-panel"
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
              Emails go to each company&apos;s representative account and are logged in Reports.
            </p>
            <ul className="outreach-list">
              {chosen.map((fit) => {
                const id = fit.company.id;
                const draft = draftFor(opportunity, fit, sender);
                const body = bodies[id] ?? draft.body;
                const rep = representativeFor(fit.company);
                const result = mailer.results[id];
                return (
                  <li
                    key={id}
                    className={`outreach-card ${result?.status === "sent" ? "is-sent" : result ? "is-failed" : ""}`}
                  >
                    <div className="outreach-head">
                      <strong>{fit.company.name}</strong>
                      {result ? (
                        <span
                          className={`outreach-sent status-${result.status}`}
                          title={result.detail}
                        >
                          {result.status === "sent" && <Check size={12} />}
                          {resultLabels[result.status]}
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
                      {live ? (
                        <>
                          <strong>{fit.company.name} representative</strong>
                          <small>account email, looked up securely when sending</small>
                        </>
                      ) : rep ? (
                        <>
                          <strong>{rep.name}</strong>
                          <small>{rep.email}</small>
                        </>
                      ) : (
                        <small>No representative account yet</small>
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
                          disabled={result?.status === "sent"}
                          onChange={(e) => setBodies((b) => ({ ...b, [id]: e.target.value }))}
                        />
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
            {mailer.error && (
              <p role="alert" className="form-error">
                {mailer.error}
              </p>
            )}
            <div className="match-footer">
              <Button
                disabled={!live || mailer.busy || pending.length === 0}
                onClick={() => void sendAll()}
              >
                <Send />
                {mailer.busy
                  ? "Sending…"
                  : pending.length === 0
                    ? "All emails sent"
                    : `Send ${pending.length} ${pending.length === 1 ? "email" : "emails"}`}
              </Button>
            </div>
            <span className="demo-label email-demo">
              Direct delivery is unavailable. Review and copy each draft.
            </span>
          </>
        )}
      </div>
    </aside>
  );
}
