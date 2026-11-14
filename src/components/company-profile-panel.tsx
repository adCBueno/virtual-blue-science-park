import { useState, type ReactNode } from "react";
import { ExternalLink, Globe2, Pencil, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, type Company } from "@/lib/ecosystem";
import type { PublicProfileRecord, PrivateProfileRecord } from "@/lib/profile-sections";
import {
  profileSections,
  statusLabels,
  type ProfileRecord,
  type SectionMeta,
} from "@/lib/profile-sections";
import { review as reviewService } from "@/data/services";
import { ProfileForm, type EditorIntent } from "@/components/profile-form";
import { BackendClaims, SimulatedBadge } from "@/components/backend-claims";
import { backendProfile } from "@/data/api/store";

function Provenance({ meta }: { meta: SectionMeta }) {
  return (
    <span className={`provenance provenance-${meta.status}`}>
      <span className="provenance-status">{statusLabels[meta.status]}</span>
      <span className="provenance-source">
        {meta.source}
        {meta.retrieved_at ? ` · retrieved ${meta.retrieved_at}` : ""}
      </span>
      {meta.url && (
        <a className="provenance-link" href={meta.url} target="_blank" rel="noreferrer">
          Source
          <ExternalLink size={11} />
        </a>
      )}
    </span>
  );
}

/** The company profile, shown inline in the focused universe: readable sections, provenance and inline editing. */
export function CompanyProfilePanel({
  company,
  profile,
  privateProfile,
  canEdit,
  isStaff,
  canRequestReview,
  editing,
  setEditing,
  updated,
  pendingReview,
  digest,
  replacement,
  onClose,
}: {
  company: Company;
  profile?: PublicProfileRecord | undefined;
  privateProfile?: PrivateProfileRecord | undefined;
  canEdit: boolean;
  isStaff: boolean;
  canRequestReview: boolean;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  updated: () => Promise<void>;
  pendingReview: boolean;
  digest?: ReactNode;
  /** Opportunity details or reverse matching, drawn inside this same panel instead of a new one. */
  replacement?: ReactNode;
  onClose: () => void;
}) {
  const [intent, setIntent] = useState<EditorIntent>("edit");
  const record: ProfileRecord = privateProfile ??
    profile ?? {
      name: company.name,
      description: company.description,
      interests: company.interests,
      technologies: company.tags,
      priorities: "",
      products_services: "",
      markets: "",
      geographical_focus: "",
      projects: "",
    };
  const sections = profileSections(record);
  const about = sections.find((s) => s.key === "about");
  const expandable = sections.filter((s) => s.key !== "about");
  const start = (next: EditorIntent) => {
    setIntent(next);
    setEditing(true);
  };

  if (replacement)
    return (
      <aside className="company-overview profile-panel is-replaced" aria-label="Details">
        <div className="panel-scroll">{replacement}</div>
      </aside>
    );

  return (
    <aside
      className={`company-overview profile-panel ${editing ? "is-editing" : ""}`}
      aria-label={editing ? "Company profile editor" : "Company profile"}
    >
      <div className="panel-head">
        <div className="panel-top">
          <span className="eyebrow">{editing ? "EDITING PROFILE" : "COMPANY IN FOCUS"}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={editing ? "Close profile editor" : "Close company profile"}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <h2>
          {record.name || company.name} <SimulatedBadge companyId={company.id} />
        </h2>
        <span className="industry-label">{company.industry}</span>
        <p className="panel-summary">
          {editing
            ? "Edit the fields below. Nothing becomes public until you publish it."
            : about?.body}
        </p>
        {!editing && canEdit && (
          <div className="panel-actions">
            <Button variant="outline" size="sm" onClick={() => start("edit")}>
              <Pencil />
              Edit Profile
            </Button>
            {isStaff ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={
                  !privateProfile || pendingReview || !reviewService.resolveRecipient(company.id)
                }
                onClick={() => start("review")}
              >
                <Send />
                Send to Company
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => start("publish")}>
                <Globe2 />
                Manage Visibility
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="panel-scroll">
        {!editing && digest}
        {editing ? (
          <ProfileForm
            key={company.id}
            company={company}
            profile={profile}
            privateProfile={privateProfile}
            canRequestReview={canRequestReview}
            pendingReview={pendingReview}
            intent={intent}
            updated={updated}
            onCancel={() => setEditing(false)}
          />
        ) : backendProfile(company.id) ? (
          <BackendClaims companyId={company.id} />
        ) : (
          <div className="profile-details">
            {expandable
              .filter((section) => section.meta.status !== "missing")
              .map((section) => (
                <section className="profile-detail" key={section.key}>
                  <h3>
                    {section.label}
                    <em>{statusLabels[section.meta.status]}</em>
                  </h3>
                  {section.key === "interests" ? (
                    <span className="section-chips">
                      {categories
                        .filter((c) => record.interests.includes(c))
                        .map((c) => (
                          <small key={c}>{c}</small>
                        ))}
                    </span>
                  ) : (
                    <p>{section.body}</p>
                  )}
                  <Provenance meta={section.meta} />
                </section>
              ))}
          </div>
        )}
      </div>

      <div className="panel-foot">
        <span className="demo-label panel-demo">
          Company profile · source information appears by section
        </span>
        {pendingReview && canEdit && (
          <span className="review-notice">A review request is pending with your team.</span>
        )}
      </div>
    </aside>
  );
}
