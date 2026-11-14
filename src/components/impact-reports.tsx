import { useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logToCSV, summarize, useOutreachLog } from "@/lib/outreach-log";
import { downloadFile, printHTML } from "@/lib/report";

/** Outcome tracking: what happened after BSP reached out — by stage, BSP service and opportunity type. */
export function ImpactReports() {
  const entries = useOutreachLog();
  const summary = useMemo(() => summarize(entries), [entries]);
  const hasSimulated = entries.some((e) => e.simulated);

  const exportPDF = () => {
    const funnel = [
      ["Reached", summary.total],
      ["Showed interest", summary.interested + summary.converted],
    ]
      .map(([l, n]) => `<tr><td>${l}</td><td>${n}</td></tr>`)
      .join("");
    printHTML(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Outreach outcomes · Blue Science Park</title><style>body{font-family:system-ui,sans-serif;color:#10203a;font-size:10.5pt;margin:0}h1{font-size:18pt;margin:0 0 4px}h2{font-size:12pt;color:#0b3d91;margin:20px 0 6px}.kpis{display:flex;gap:10px;margin-top:14px}.kpis div{flex:1;border:1px solid #dfe5ee;border-radius:6px;padding:10px}.kpis strong{display:block;font-size:16pt;color:#0b3d91}table{width:100%;border-collapse:collapse;font-size:9.5pt}th,td{text-align:left;padding:6px;border-bottom:1px solid #dfe5ee}th{background:#f2f5fa}footer{margin-top:20px;font-size:8pt;color:#5b6b82}</style></head><body><div style="font-size:8pt;letter-spacing:2px;color:#0b3d91;font-weight:700">BLUE SCIENCE PARK · VIRTUAL SCIENCE PARK</div><h1>Outreach outcomes</h1><div>Generated ${new Date().toLocaleDateString("en-GB")}</div><div class="kpis"><div><strong>${summary.companies}</strong>Companies</div><div><strong>${summary.awaiting}</strong>Awaiting response</div></div><h2>Funnel</h2><table><thead><tr><th>Stage</th><th>Count</th></tr></thead><tbody>${funnel}</tbody></table><footer>${hasSimulated ? "Includes simulated demo activity. " : ""}Statuses are updated by BSP staff.</footer></body></html>`,
    );
  };

  return (
    <div className="opportunity-directory impact-reports">
      <div className="directory-heading">
        <div>
          <span className="eyebrow">OUTCOME TRACKING</span>
          <h2>What happened after we reached out</h2>
          <p className="report-sub">
            Outreach records include their next step and BSP service. Update the status as companies
            respond.
          </p>
        </div>
        <div className="report-actions">
          <Button
            variant="outline"
            size="sm"
            className="share-button"
            onClick={() =>
              downloadFile(
                "﻿" + logToCSV(entries),
                "text/csv;charset=utf-8",
                `bsp-outreach-${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
            disabled={!entries.length}
          >
            <Download />
            <span>CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="share-button"
            onClick={exportPDF}
            disabled={!entries.length}
          >
            <Printer />
            <span>PDF</span>
          </Button>
        </div>
      </div>

      <div className="report-kpis report-kpis-compact">
        <div>
          <strong>{summary.companies}</strong>
          <span>Companies</span>
        </div>
        <div>
          <strong>{summary.awaiting}</strong>
          <span>Awaiting response</span>
        </div>
      </div>

      <div className="report-card report-funnel-card">
        <h3>Funnel</h3>
        <ol className="report-funnel">
          {(["Sent", "Interested"] as const).map((stage) => {
            const count = stage === "Sent" ? summary.total : summary.interested + summary.converted;
            return (
              <li key={stage}>
                <span className="funnel-label">
                  {stage === "Sent" ? "Reached" : "Showed interest"}
                </span>
                <span className="funnel-track">
                  <span
                    style={{ width: summary.total ? `${(count / summary.total) * 100}%` : "0%" }}
                  />
                </span>
                <span className="funnel-num">{count}</span>
              </li>
            );
          })}
        </ol>
        {entries.length === 0 && (
          <p className="report-empty-line">
            No outreach logged yet. Send an opportunity from{" "}
            <strong>Opportunities → Find companies that fit</strong>.
          </p>
        )}
      </div>
      <span className="demo-label report-note">
        Prototype: tracking is stored in this browser.{" "}
        {hasSimulated && "Rows marked simulated are demo data."}
      </span>
    </div>
  );
}
