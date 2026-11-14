import { ExternalLink } from "lucide-react";
import { editableSections } from "@/data/api/adapter";
import { fieldMap } from "@/data/api/mapping";
import { backendProfile } from "@/data/api/store";
import type { BackendClaim } from "@/data/api/contract";

const kindLabels: Record<BackendClaim["kind"], string> = {
  stated: "Stated",
  inferred: "Inferred",
  user_confirmed: "Company-confirmed",
};
const human = (field: string) => field.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

/** "Simulated" on the whole profile when the backend marks it as demo data. */
export function SimulatedBadge({ companyId }: { companyId: string }) {
  return backendProfile(companyId)?.is_simulated ? (
    <span className="claim-badge badge-simulated">Simulated</span>
  ) : null;
}

/** Every claim with its own label, evidence link and retrieval date — grouped by profile section. */
export function BackendClaims({ companyId }: { companyId: string }) {
  const profile = backendProfile(companyId);
  if (!profile) return null;
  const groups = [
    ...editableSections.map(({ key, label }) => ({
      label,
      claims: profile.claims.filter((c) => fieldMap[c.field] === key),
    })),
    { label: "Topics", claims: profile.claims.filter((c) => !fieldMap[c.field]) },
  ].filter((g) => g.claims.length > 0);
  const missing = profile.missing_fields ?? [];
  return (
    <div className="backend-claims">
      {missing.length > 0 && (
        <p className="claims-missing">
          Not found in public sources: {missing.map(human).join(", ")}
        </p>
      )}
      {groups.map((group) => (
        <section key={group.label} className="claims-group">
          <h3>{group.label}</h3>
          <ul>
            {group.claims.map((claim) => (
              <li key={claim.id} className="claim-item">
                <span className="claim-value">{claim.value}</span>
                <span className="claim-meta">
                  <em className={`claim-kind kind-${claim.kind}`}>{kindLabels[claim.kind]}</em>
                  {claim.kind === "inferred" && (
                    <span>{Math.round(claim.confidence * 100)}% confidence</span>
                  )}
                  {claim.evidence_url && (
                    <a href={claim.evidence_url} target="_blank" rel="noreferrer">
                      {hostname(claim.evidence_url)}
                      <ExternalLink size={10} />
                    </a>
                  )}
                  <span>retrieved {claim.retrieved_at}</span>
                  {claim.cached_snapshot && (
                    <span className="claim-badge badge-cached">Cached snapshot</span>
                  )}
                </span>
                {claim.snippet && <q className="claim-snippet">{claim.snippet}</q>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
