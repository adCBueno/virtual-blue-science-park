import { useState } from "react";
import { Globe2, LockKeyhole, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Company } from "@/lib/ecosystem";
import { apiCompanies, editableSections, rowsFor, type SectionRows } from "@/data/api/adapter";

const kindLabels = {
  stated: "Stated",
  inferred: "Inferred",
  user_confirmed: "Company-confirmed",
} as const;
let newRow = 0;

/**
 * Team-API profile editor: one row per claim. Changing a row patches that claim only; a new row
 * adds a claim to the section. Visibility can be set to private or published.
 */
export function BackendProfileEditor({
  company,
  updated,
  onCancel,
}: {
  company: Company;
  updated: () => Promise<void>;
  onCancel?: (() => void) | undefined;
}) {
  const [rows, setRows] = useState<SectionRows>(() => rowsFor(company.id));
  const [visibility, setVisibility] = useState(() => apiCompanies.visibility(company.id));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const setRow = (section: keyof SectionRows, key: string, value: string) =>
    setRows((r) => ({
      ...r,
      [section]: r[section].map((row) => (row.key === key ? { ...row, value } : row)),
    }));
  const addRow = (section: keyof SectionRows) =>
    setRows((r) => ({ ...r, [section]: [...r[section], { key: `new-${++newRow}`, value: "" }] }));

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiCompanies.saveRows(company.id, rows, visibility);
      await updated();
      setRows(rowsFor(company.id));
      setVisibility(apiCompanies.visibility(company.id));
      setMessage(
        result.ops === 0 && !result.visibility
          ? "Nothing changed."
          : [
              result.ops
                ? `${result.ops} ${result.ops === 1 ? "claim" : "claims"} saved as company-confirmed`
                : "",
              result.visibility ? `profile is now ${result.visibility}` : "",
            ]
              .filter(Boolean)
              .join(" · ") + ".",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-form backend-editor">
      <p className="backend-editor-intro">
        Each line is one claim. Edit a line to correct it, or add a line. Saved lines become
        company-confirmed, and the profiling agent never overwrites them.
      </p>
      {editableSections.map(({ key, label }) => (
        <fieldset key={key} className="claim-section">
          <legend>{label}</legend>
          {rows[key].length === 0 && (
            <p className="claim-empty">Not found in public sources yet.</p>
          )}
          {rows[key].map((row) => (
            <label key={row.key} className="claim-row">
              <span className="sr-only">{label}</span>
              {key === "description" ? (
                <textarea
                  rows={2}
                  value={row.value}
                  onChange={(e) => setRow(key, row.key, e.target.value)}
                />
              ) : (
                <input value={row.value} onChange={(e) => setRow(key, row.key, e.target.value)} />
              )}
              <em className={`claim-kind kind-${row.kind ?? "new"}`}>
                {row.kind ? kindLabels[row.kind] : "New"}
              </em>
            </label>
          ))}
          <button type="button" className="claim-add" onClick={() => addRow(key)}>
            <Plus size={12} /> Add
          </button>
        </fieldset>
      ))}

      <fieldset className="claim-section visibility-toggle">
        <legend>Visibility</legend>
        <label>
          <input
            type="radio"
            name="visibility"
            checked={visibility === "private"}
            onChange={() => setVisibility("private")}
          />
          <LockKeyhole size={13} /> Private{" "}
          <small>only your company and Blue Science Park staff</small>
        </label>
        <label>
          <input
            type="radio"
            name="visibility"
            checked={visibility === "published"}
            onChange={() => setVisibility("published")}
          />
          <Globe2 size={13} /> Published <small>visible to everyone</small>
        </label>
      </fieldset>

      <div className="form-actions">
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        {onCancel && (
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {message && (
        <p role="status" className="save-message">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
