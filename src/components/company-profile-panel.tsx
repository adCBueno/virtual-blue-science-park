import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink, Globe2, Pencil, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, type Company } from "@/lib/ecosystem";
import type { Tables } from "@/integrations/supabase/types";
import { evidenceRows, profileSections, statusLabels, type ProfileRecord, type SectionKey, type SectionMeta } from "@/lib/profile-sections";
import { ProfileForm, type EditorIntent } from "@/components/profile-form";

function Provenance({ meta }: { meta: SectionMeta }) {
  return <span className={`provenance provenance-${meta.status}`}>
    <span className="provenance-status">{statusLabels[meta.status]}</span>
    <span className="provenance-source">{meta.source}{meta.retrieved_at ? ` · retrieved ${meta.retrieved_at}` : ""}</span>
    {meta.url && <a className="provenance-link" href={meta.url} target="_blank" rel="noreferrer">Source<ExternalLink size={11} /></a>}
  </span>;
}

/** The company profile, shown inline in the focused universe: readable sections, provenance and inline editing. */
export function CompanyProfilePanel({ company, profile, privateProfile, canEdit, isStaff, preview, previewStaff, editing, setEditing, updated, pendingReview, onClose, digest }: {
  company: Company;
  profile?: Tables<"company_public_profiles"> | undefined;
  privateProfile?: Tables<"company_private_profiles"> | undefined;
  canEdit: boolean;
  isStaff: boolean;
  preview: boolean;
  previewStaff: boolean;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  updated: () => Promise<void>;
  pendingReview: boolean;
  onClose: () => void;
  digest?: ReactNode;
}) {
  const [open, setOpen] = useState<SectionKey | "evidence" | null>(null);
  const [intent, setIntent] = useState<EditorIntent>("edit");
  const record: ProfileRecord = privateProfile ?? profile ?? {
    name: company.name, description: company.description, interests: company.interests, technologies: company.tags,
    priorities: "", products_services: "", markets: "", geographical_focus: "", projects: "",
  };
  const sections = profileSections(record);
  const about = sections.find(s => s.key === "about");
  const expandable = sections.filter(s => s.key !== "about");
  const evidence = evidenceRows(sections);
  const start = (next: EditorIntent) => { setIntent(next); setEditing(true); };
  const toggle = (key: SectionKey | "evidence") => setOpen(current => current === key ? null : key);

  return <aside className={`company-overview profile-panel ${editing ? "is-editing" : ""}`} aria-label={editing ? "Company profile editor" : "Company profile"}>
    <div className="panel-head">
      <div className="panel-top">
        <span className="eyebrow">{editing ? (preview ? "SIMULATED ROLE PREVIEW" : "EDITING PROFILE") : "COMPANY IN FOCUS"}</span>
        <Button variant="ghost" size="icon" aria-label={editing ? "Close profile editor" : "Close company profile"} onClick={onClose}><X /></Button>
      </div>
      <h2>{record.name || company.name}</h2>
      <span className="industry-label">{company.industry}</span>
      <p className="panel-summary">{editing ? "Edit the fields below. Nothing becomes public until you publish it." : about?.body}</p>
      {!editing && canEdit && <div className="panel-actions">
        <Button variant="outline" size="sm" onClick={() => start("edit")}><Pencil />Edit Profile</Button>
        {!isStaff && <Button variant="ghost" size="sm" onClick={() => start("publish")}><Globe2 />Manage Visibility</Button>}
      </div>}
    </div>
    <div className="panel-scroll">
      {!editing && digest}
      {editing
        ? <ProfileForm company={company} profile={profile} privateProfile={privateProfile} preview={preview} previewStaff={previewStaff} intent={intent} updated={updated} onCancel={() => setEditing(false)} />
        : <div className="profile-accordion">
          {expandable.map(section => <div className="profile-section" key={section.key} data-open={open === section.key}>
            <button type="button" className="section-toggle" aria-expanded={open === section.key} onClick={() => toggle(section.key)}>
              <span>{section.label}</span><em>{statusLabels[section.meta.status]}</em><ChevronDown size={13} />
            </button>
            <div className="section-body"><div>
              {section.key === "interests"
                ? <span className="section-chips">{categories.filter(c => record.interests.includes(c)).map(c => <small key={c}>{c}</small>)}{!categories.some(c => record.interests.includes(c)) && <small>Balanced discovery</small>}</span>
                : <p>{section.body}</p>}
              <Provenance meta={section.meta} />
            </div></div>
          </div>)}
          <div className="profile-section" data-open={open === "evidence"}>
            <button type="button" className="section-toggle" aria-expanded={open === "evidence"} onClick={() => toggle("evidence")}>
              <span>Evidence & Sources</span><em>{evidence.length} records</em><ChevronDown size={13} />
            </button>
            <div className="section-body"><div>
              <ul className="evidence-list">{evidence.map(row => <li className={`provenance provenance-${row.status}`} key={row.label}>
                <span className="provenance-status">{statusLabels[row.status]}</span>
                <span className="evidence-label">{row.label}</span>
                <span className="provenance-source">{row.source}{row.retrieved_at ? ` · retrieved ${row.retrieved_at}` : ""}</span>
                {row.url && <a className="provenance-link" href={row.url} target="_blank" rel="noreferrer">Source<ExternalLink size={10} /></a>}
              </li>)}</ul>
            </div></div>
          </div>
        </div>}
    </div>

    <div className="panel-foot">
      <span className="demo-label panel-demo">Illustrative demo profile · not verified AI research</span>
      {pendingReview && canEdit && <span className="review-notice">A review request is pending with your team.</span>}
    </div>
  </aside>;
}
