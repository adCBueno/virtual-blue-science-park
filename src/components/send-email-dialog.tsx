import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Mail, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Company } from "@/lib/ecosystem";
import {
  exportReport,
  mailtoLink,
  toEmailText,
  type Report,
  type ReportAudience,
} from "@/lib/report";
import { entryFor, logOutreach } from "@/lib/outreach-log";
import { representativeFor } from "@/lib/representatives";
import { useSendOutreach } from "@/lib/use-send-outreach";

export type EmailViewer = { audience: ReportAudience; name: string; companyId: string | null };

const validEmails = (value: string) => {
  const list = value.split(/[,;\s]+/).filter(Boolean);
  return list.length > 0 && list.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
};

/**
 * "Send as email" — staff pick a member company and send it its curated report;
 * a company representative sends its own report to Blue Science Park or a colleague.
 * Staff emails are sent from the app to the company's representative account (resolved on the server);
 * a representative's own share still opens their email app.
 */
export function SendEmailButton({
  companies,
  initialCompanyId,
  viewer,
  reportFor,
  label = "Send as email",
  variant = "default",
  compact = false,
  live = false,
}: {
  live?: boolean;
  companies: Company[];
  initialCompanyId: string | null;
  viewer: EmailViewer;
  reportFor: (company: Company | null) => Report;
  label?: string;
  variant?: "default" | "outline";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        className={`share-button ${compact ? "is-compact" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={label}
      >
        <Mail />
        <span>{label}</span>
      </Button>
      {open && (
        <SendEmailDialog
          companies={companies}
          initialCompanyId={initialCompanyId}
          viewer={viewer}
          reportFor={reportFor}
          live={live}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function SendEmailDialog({
  companies,
  initialCompanyId,
  viewer,
  reportFor,
  onClose,
  live,
}: {
  companies: Company[];
  initialCompanyId: string | null;
  viewer: EmailViewer;
  reportFor: (company: Company | null) => Report;
  onClose: () => void;
  live: boolean;
}) {
  const mailer = useSendOutreach(live);
  const isStaff = viewer.audience === "staff";
  const ownCompanyId = viewer.audience === "representative" ? viewer.companyId : null;
  const [companyId, setCompanyId] = useState<string>(
    initialCompanyId ?? ownCompanyId ?? (isStaff ? (companies[0]?.id ?? "") : ""),
  );
  const company = companies.find((c) => c.id === companyId) ?? null;
  const report = useMemo(() => reportFor(company), [company, reportFor]);

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [includeOpportunities, setIncludeOpportunities] = useState(true);
  const [includeConnections, setIncludeConnections] = useState(true);
  const [edited, setEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const subject0 = isStaff
    ? `Blue Science Park · Opportunities for ${company?.name ?? "your company"}`
    : company
      ? `${company.name} · Virtual Science Park report`
      : "Blue Science Park · Ecosystem overview";
  const intro = isStaff
    ? `Hi ${company?.name ?? ""} team,\n\nHere is a curated selection of opportunities and possible connections in the Blue Science Park ecosystem that match your expertise.`
    : company
      ? `Hi,\n\nSharing our Virtual Science Park report for ${company.name} — the opportunities and connections that match our profile.`
      : "Hi,\n\nSharing an overview of the Blue Science Park ecosystem from the Virtual Science Park.";
  const signature = isStaff
    ? `Best regards,\n${viewer.name}\nBlue Science Park`
    : `Best regards,\n${viewer.name}${company && ownCompanyId === company.id ? `\n${company.name}` : ""}`;
  const generated = toEmailText(report, {
    intro,
    includeOpportunities,
    includeConnections,
    signature,
  });

  const [subject, setSubject] = useState(subject0);
  const [body, setBody] = useState(generated);
  /* Regenerate the draft when its inputs change, unless the user already rewrote it by hand. */
  useEffect(() => {
    if (!edited) {
      setBody(generated);
      setSubject(subject0);
    }
  }, [generated, subject0, edited]);
  useEffect(() => {
    setEdited(false);
  }, [companyId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Staff write to the company's representative account — the address is never typed by hand. */
  const rep = isStaff && company ? representativeFor(company) : null;
  const recipient = isStaff ? (rep?.email ?? "") : to;
  const canSend = isStaff ? Boolean(company) && !mailer.busy : validEmails(recipient) && (!cc || validEmails(cc));
  const staffResult = company ? mailer.results[company.id] : undefined;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: user can still select the text */
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="profile-modal email-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-top">
          <span className="eyebrow">
            {isStaff
              ? "BLUE SCIENCE PARK STAFF"
              : viewer.audience === "representative"
                ? "COMPANY REPRESENTATIVE"
                : "SHARE"}
          </span>
          <Button variant="ghost" size="icon" aria-label="Close email" onClick={onClose}>
            <X />
          </Button>
        </div>
        <h2 id="email-title">{isStaff ? "Send to a member company" : "Send as email"}</h2>
        <p>
          {isStaff
            ? "Pick the company, check the draft and send it to the company's representative."
            : "Share this report with Blue Science Park, your team or a partner."}
        </p>

        {sent && isStaff ? (
          <div className="email-sent">
            <span className={`email-sent-icon ${staffResult?.status === "sent" ? "" : "is-warning"}`}>{staffResult?.status === "sent" ? <Check /> : <X />}</span>
            <h3>{staffResult?.status === "sent" ? `Email sent to the ${company?.name ?? ""} representative` : "The email was not sent"}</h3>
            <p>{staffResult?.detail ?? mailer.error}</p>
            <div className="email-actions"><Button onClick={onClose}>Done</Button></div>
          </div>
        ) : sent ? (
          <div className="email-sent">
            <span className="email-sent-icon">
              <Check />
            </span>
            <h3>Your email app should be open</h3>
            <p>
              The message is ready to {recipient}. Remember to attach the PDF if you want the full report —
              browsers can’t attach files to email links.
            </p>
            <div className="email-actions">
              <Button variant="outline" onClick={() => exportReport(report, "pdf")}>
                <Paperclip />
                Download PDF
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form
            className="email-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSend) return;
              if (isStaff && company) {
                void mailer.send([{ companyId: company.id, subject, body }]).then((results) => {
                  if (!results.length) return;
                  if (results[0]?.status === "sent" && includeOpportunities)
                    logOutreach(report.opportunities.slice(0, 4).map((o) => entryFor(o, company, viewer.name || "BSP staff")));
                  setSent(true);
                });
                return;
              }
              window.location.href = mailtoLink({ to: recipient, cc, subject, body });
              setSent(true);
            }}
          >
            {isStaff && (
              <label className="editor-field">
                Company
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.industry}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!isStaff && company && (
              <div className="email-about">
                <span>About</span>
                <strong>{company.name}</strong>
                <small>{company.industry}</small>
              </div>
            )}
            {isStaff ? (
              <div className="recipient-line">
                <span>To</span>
                {live && company ? <><strong>{company.name} representative</strong><small>account email, looked up securely when sending</small></> : rep ? <><strong>{rep.name}</strong><small>{rep.email}{rep.simulated && " · demo address"}</small></> : <small>No representative account yet</small>}
              </div>
            ) : (
            <label className="editor-field">
              To
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder={isStaff ? "representative@company.com" : "contact@bluesciencepark.se"}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </label>
            )}
            {!isStaff && (
            <label className="editor-field">
              Cc <small className="field-hint">optional</small>
              <input
                type="text"
                inputMode="email"
                placeholder="colleague@company.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </label>
            )}
            <label className="editor-field">
              Subject
              <input
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setEdited(true);
                }}
              />
            </label>
            <fieldset className="email-toggles">
              <legend>Include</legend>
              <label>
                <input
                  type="checkbox"
                  checked={includeOpportunities}
                  onChange={(e) => setIncludeOpportunities(e.target.checked)}
                />
                Opportunities ({report.opportunities.length})
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeConnections}
                  onChange={(e) => setIncludeConnections(e.target.checked)}
                  disabled={!report.connections.length}
                />
                Suggested connections ({report.connections.length})
              </label>
            </fieldset>
            <label className="editor-field">
              Message
              <textarea
                rows={9}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setEdited(true);
                }}
              />
            </label>
            {edited && (
              <button type="button" className="email-reset" onClick={() => setEdited(false)}>
                Reset to generated draft
              </button>
            )}
            {mailer.error && <p role="alert" className="form-error">{mailer.error}</p>}
            <div className="email-actions">
              <Button type="button" variant="ghost" onClick={() => void copy()}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy text"}
              </Button>
              {!isStaff && (
                <Button type="button" variant="outline" onClick={() => exportReport(report, "pdf")}>
                  <Paperclip />
                  PDF to attach
                </Button>
              )}
              <Button type="submit" disabled={!canSend}>
                <Send />
                {mailer.busy ? "Sending…" : isStaff ? "Send email" : "Send as email"}
              </Button>
            </div>
            <span className="demo-label email-demo">
              {isStaff ? (live ? "Sent from Blue Science Park to the representative account" : "Demo role preview · nothing is actually sent") : "Opens your email app with the message ready"}
            </span>
          </form>
        )}
      </section>
    </div>
  );
}
