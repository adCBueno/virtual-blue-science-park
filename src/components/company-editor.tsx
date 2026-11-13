import { Globe2, LockKeyhole, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Company } from "@/lib/ecosystem";
import type { Tables } from "@/integrations/supabase/types";
import { ProfileForm } from "@/components/profile-form";

/** The wider editor used from the staff workspace. Editing itself lives in ProfileForm. */
export function CompanyEditor({ company, profile, privateProfile, close, updated, preview = false, previewStaff = false }: {
  company: Company;
  profile?: Tables<"company_public_profiles"> | undefined;
  privateProfile?: Tables<"company_private_profiles"> | undefined;
  close: () => void;
  updated: () => Promise<void>;
  preview?: boolean;
  previewStaff?: boolean;
}) {
  return <aside className="detail-panel company-editor" aria-label="Company profile editor">
    <div className="detail-top"><span className="eyebrow">{preview ? "SIMULATED ROLE PREVIEW" : "PRIVATE COMPANY WORKSPACE"}</span><Button variant="ghost" size="icon" aria-label="Close company profile" onClick={close}><X /></Button></div>
    <h2>{company.name}</h2>
    <span className="visibility-indicator">{privateProfile ? <LockKeyhole size={13} /> : <Globe2 size={13} />}{privateProfile ? "Private draft · only this company and staff" : "Published information"}</span>
    <p className="detail-demo">Baseline: illustrative demo information, not verified AI research. Published edits are labelled as company-provided information.</p>
    <ProfileForm company={company} profile={profile} privateProfile={privateProfile} preview={preview} previewStaff={previewStaff} updated={updated} onCancel={close} />
  </aside>;
}
