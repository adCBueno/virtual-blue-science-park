import { fitLabel, fitLevel, type Category, type Company, type Opportunity } from "@/lib/ecosystem";
import { actionBrief } from "@/lib/action-brief";

/**
 * Browser-safe dashboard report: one shape that every export format and the
 * "Send as email" draft are generated from, so they always say the same thing.
 */
export type ReportOpportunity = Pick<Opportunity, "id" | "title" | "category" | "date" | "source" | "url" | "summary" | "requirements" | "tags" | "registrationUrl"> & { score?: number };
export type ReportConnection = { id: string; name: string; industry: string; shared: string[] };
export type ReportCompany = {
  id: string;
  name: string;
  industry: string;
  sector: string;
  description: string;
  tags: string[];
  interests: Category[];
};
export type ReportAudience = "staff" | "representative" | "public";

export type Report = {
  title: string;
  subtitle: string;
  generatedAt: Date;
  audience: ReportAudience;
  company: ReportCompany | null;
  opportunities: ReportOpportunity[];
  connections: ReportConnection[];
  companies: ReportCompany[];
};

export type ExportFormat = "pdf" | "csv" | "xlsx" | "doc" | "json" | "md";

export const exportFormats: { id: ExportFormat; label: string; hint: string }[] = [
  { id: "pdf", label: "PDF", hint: "Print-ready report" },
  { id: "csv", label: "CSV", hint: "Rows for any spreadsheet" },
  { id: "xlsx", label: "Excel", hint: "Opens in Excel / Numbers" },
  { id: "doc", label: "Word", hint: "Editable document" },
  { id: "json", label: "JSON", hint: "Structured data" },
  { id: "md", label: "Markdown", hint: "Plain text for notes" },
];

const toCompany = (c: Company): ReportCompany => ({
  id: c.id,
  name: c.name,
  industry: c.industry,
  sector: c.sector,
  description: c.description,
  tags: c.tags,
  interests: c.interests,
});

export function buildReport({
  company,
  opportunities,
  connections = [],
  companies = [],
  audience,
}: {
  company: Company | null;
  opportunities: ReportOpportunity[];
  connections?: ReportConnection[];
  companies?: Company[];
  audience: ReportAudience;
}): Report {
  return {
    title: company
      ? `${company.name} · Opportunity report`
      : "Blue Science Park · Ecosystem overview",
    subtitle: company
      ? `${company.industry} · ${company.sector}`
      : `${companies.length} companies · ${opportunities.length} opportunities`,
    generatedAt: new Date(),
    audience,
    company: company ? toCompany(company) : null,
    opportunities: opportunities.map(
      ({ id, title, category, date, source, url, summary, requirements, tags, registrationUrl, score }) => ({
        id,
        tags,
        ...(registrationUrl ? { registrationUrl } : {}),
        title,
        category,
        date,
        source,
        url,
        summary,
        requirements,
        ...(score !== undefined ? { score } : {}),
      }),
    ),
    connections: connections.map(({ id, name, industry, shared }) => ({
      id,
      name,
      industry,
      shared,
    })),
    companies: company ? [] : companies.map(toCompany),
  };
}

export function reportFileName(report: Report, ext: string) {
  const base = (report.company?.name ?? "blue-science-park-ecosystem")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${report.generatedAt.toISOString().slice(0, 10)}.${ext}`;
}

const dateLabel = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/* ---------- Flat rows (CSV / Excel) ---------- */

const columns = [
  "Type",
  "Name",
  "Category / Industry",
  "Thematic fit",
  "Date",
  "Source",
  "Link",
  "Details",
] as const;

function rows(report: Report): string[][] {
  const out: string[][] = [];
  if (report.company)
    out.push([
      "Company",
      report.company.name,
      report.company.industry,
      "",
      "",
      "",
      "",
      `${report.company.description} Expertise: ${report.company.tags.join(", ")}. Interests: ${report.company.interests.join(", ") || "Balanced discovery"}.`,
    ]);
  for (const c of report.companies)
    out.push(["Company", c.name, c.industry, "", "", "", "", c.description]);
  for (const o of report.opportunities)
    out.push([
      "Opportunity",
      o.title,
      o.category,
      o.score !== undefined ? fitLevel(o.score) : "",
      o.date,
      o.source,
      o.url,
      o.summary,
    ]);
  for (const c of report.connections)
    out.push([
      "Suggested connection",
      c.name,
      c.industry,
      "",
      "",
      "",
      "",
      `Shared expertise: ${c.shared.join(", ")}`,
    ]);
  return out;
}

const csvCell = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export function toCSV(report: Report) {
  return [columns as readonly string[], ...rows(report)]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
}

/* ---------- Plain text / Markdown ---------- */

export function toMarkdown(report: Report) {
  const lines = [
    `# ${report.title}`,
    "",
    `_${report.subtitle} · generated ${dateLabel(report.generatedAt)}_`,
    "",
  ];
  if (report.company)
    lines.push(
      "## Company",
      "",
      report.company.description,
      "",
      `**Expertise:** ${report.company.tags.join(", ")}`,
      `**Interests:** ${report.company.interests.join(", ") || "Balanced discovery"}`,
      "",
    );
  if (report.companies.length)
    lines.push(
      "## Companies",
      "",
      ...report.companies.map((c) => `- **${c.name}** — ${c.industry}`),
      "",
    );
  if (report.opportunities.length)
    lines.push(
      "## Recommended opportunities",
      "",
      ...report.opportunities.map(
        (o) =>
          `- **${o.title}** (${o.category}${o.score !== undefined ? ` · ${fitLabel(o.score)}` : ""}) — ${o.date} · ${o.source} · ${o.url}`,
      ),
      "",
    );
  if (report.connections.length)
    lines.push(
      "## Suggested connections",
      "",
      ...report.connections.map(
        (c) => `- **${c.name}** — ${c.industry} · shared: ${c.shared.join(", ")}`,
      ),
      "",
    );
  lines.push(
    "---",
    "Illustrative prototype data from the Virtual Science Park. Dates and requirements are not verified.",
  );
  return lines.join("\n");
}

/** Short plain-text summary that fits in an email body (mailto links have a practical length limit). */
export function toEmailText(
  report: Report,
  {
    intro,
    includeOpportunities = true,
    includeConnections = true,
    signature,
  }: {
    intro: string;
    includeOpportunities?: boolean;
    includeConnections?: boolean;
    signature: string;
  },
) {
  const lines = [intro, ""];
  if (report.company) lines.push(`${report.company.name} — ${report.company.industry}`, "");
  if (includeOpportunities && report.opportunities.length) {
    lines.push("Recommended opportunities:");
    report.opportunities
      .slice(0, 4)
      .forEach((o) =>
        lines.push(
          `• ${o.title} (${o.category}${o.score !== undefined ? `, ${fitLabel(o.score).toLowerCase()}` : ""}) — ${o.date}`,
          `  Next step: ${actionBrief(o).verb} → ${actionBrief(o).cta.url} · BSP can help via ${actionBrief(o).service.name}`,
        ),
      );
    if (report.opportunities.length > 4) lines.push(`+ ${report.opportunities.length - 4} more in the attached PDF report`);
    lines.push("");
  }
  if (includeConnections && report.connections.length) {
    lines.push("Suggested connections:");
    report.connections.forEach((c) => lines.push(`• ${c.name} — shared: ${c.shared.join(", ")}`));
    lines.push("");
  }
  lines.push(signature);
  return lines.join("\n");
}

/* ---------- HTML (PDF / Word / Excel) ---------- */

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function toHTML(report: Report) {
  const c = report.company;
  const opp = report.opportunities
    .map(
      (o) =>
        `<tr><td><strong>${esc(o.title)}</strong><br><span class="muted">${esc(o.summary)}</span></td><td><span class="pill">${esc(o.category)}</span></td><td>${o.score !== undefined ? fitLevel(o.score) : "—"}</td><td>${esc(o.date)}</td><td><a href="${esc(o.url)}">${esc(o.source)}</a></td></tr>`,
    )
    .join("");
  const con = report.connections
    .map(
      (x) =>
        `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.industry)}</td><td>${esc(x.shared.join(", "))}</td></tr>`,
    )
    .join("");
  const cos = report.companies
    .map(
      (x) =>
        `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.industry)}</td><td>${esc(x.tags.join(", "))}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(report.title)}</title><style>
  @page { margin: 18mm; }
  body { font-family: "Inter", "Segoe UI", system-ui, sans-serif; color: #10203a; font-size: 11pt; line-height: 1.5; margin: 0; }
  header { border-bottom: 3px solid #0b3d91; padding-bottom: 12px; margin-bottom: 18px; }
  .eyebrow { font-size: 8pt; letter-spacing: 2px; color: #0b3d91; font-weight: 700; }
  h1 { font-size: 20pt; margin: 6px 0 2px; } h2 { font-size: 13pt; color: #0b3d91; margin: 22px 0 8px; }
  .muted { color: #5b6b82; font-size: 9pt; } .pill { background: #e8effb; color: #0b3d91; border-radius: 4px; padding: 2px 6px; font-size: 8.5pt; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; } th { text-align: left; background: #f2f5fa; color: #34445c; font-weight: 600; }
  th, td { padding: 7px 8px; border-bottom: 1px solid #dfe5ee; vertical-align: top; } a { color: #0b3d91; }
  .tags span { display: inline-block; background: #f2f5fa; border-radius: 4px; padding: 2px 7px; margin: 0 4px 4px 0; font-size: 8.5pt; }
  footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #dfe5ee; font-size: 8pt; color: #5b6b82; }
  </style></head><body>
  <header><div class="eyebrow">BLUE SCIENCE PARK · VIRTUAL SCIENCE PARK</div><h1>${esc(report.title)}</h1><div class="muted">${esc(report.subtitle)} · Generated ${dateLabel(report.generatedAt)}</div></header>
  ${c ? `<h2>Company</h2><p>${esc(c.description)}</p><div class="tags"><strong>Expertise: </strong>${c.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div><div class="tags"><strong>Interests: </strong>${(c.interests.length ? c.interests : ["Balanced discovery"]).map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
  ${cos ? `<h2>Companies in the ecosystem</h2><table><thead><tr><th>Company</th><th>Industry</th><th>Expertise</th></tr></thead><tbody>${cos}</tbody></table>` : ""}
  ${opp ? `<h2>${c ? "Recommended opportunities" : "Opportunities"}</h2><table><thead><tr><th>Opportunity</th><th>Category</th><th>Thematic fit</th><th>Date</th><th>Source</th></tr></thead><tbody>${opp}</tbody></table>` : ""}
  ${con ? `<h2>Suggested connections</h2><table><thead><tr><th>Company</th><th>Industry</th><th>Shared expertise</th></tr></thead><tbody>${con}</tbody></table>` : ""}
  <footer>Illustrative prototype data. Thematic fit is based on shared expertise and stated interests — it is not an eligibility decision; check requirements at the source. Dates and requirements are not verified. Suggested connections are not confirmed partnerships.</footer>
  </body></html>`;
}

/* ---------- Delivery ---------- */

export function downloadFile(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Prints the report through a hidden frame so the browser's "Save as PDF" produces the file — no extra dependency needed. */
export function printHTML(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1500);
  }, 250);
}

export function exportReport(report: Report, format: ExportFormat) {
  switch (format) {
    case "pdf":
      return printHTML(toHTML(report));
    case "csv":
      return downloadFile("﻿" + toCSV(report), "text/csv;charset=utf-8", reportFileName(report, "csv"));
    case "xlsx":
      return downloadFile(
        "﻿" + toHTML(report),
        "application/vnd.ms-excel",
        reportFileName(report, "xls"),
      );
    case "doc":
      return downloadFile("﻿" + toHTML(report), "application/msword", reportFileName(report, "doc"));
    case "json":
      return downloadFile(
        JSON.stringify(report, null, 2),
        "application/json",
        reportFileName(report, "json"),
      );
    case "md":
      return downloadFile(
        toMarkdown(report),
        "text/markdown;charset=utf-8",
        reportFileName(report, "md"),
      );
  }
}

export function mailtoLink({
  to,
  cc,
  subject,
  body,
}: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}) {
  const params = [`subject=${encodeURIComponent(subject)}`, `body=${encodeURIComponent(body)}`];
  if (cc) params.unshift(`cc=${encodeURIComponent(cc)}`);
  return `mailto:${to
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map(encodeURIComponent)
    .join(",")}?${params.join("&")}`;
}
