import { Globe2, LockKeyhole, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Company } from "@/lib/ecosystem";
import type { PublicProfileRecord, PrivateProfileRecord } from "@/lib/profile-sections";
import { ProfileForm } from "@/components/profile-form";

/** The wider editor used from the staff workspace. Editing itself lives in ProfileForm. */
export function CompanyEditor({
  company,
  profile,
  privateProfile,
  close,
  updated,
  canRequestReview = false,
  pendingReview = false,
}: {
  company: Company;
  profile?: PublicProfileRecord | undefined;
  privateProfile?: PrivateProfileRecord | undefined;
  close: () => void;
  updated: () => Promise<void>;
  canRequestReview?: boolean;
  pendingReview?: boolean;
}) {
  return (
    <aside className="detail-panel company-editor" aria-label="Company profile editor">
      <div className="detail-top">
        <span className="eyebrow">PRIVATE COMPANY WORKSPACE</span>
        <Button variant="ghost" size="icon" aria-label="Close company profile" onClick={close}>
          <X />
        </Button>
      </div>
      <h2>{company.name}</h2>
      <span className="visibility-indicator">
        {privateProfile ? <LockKeyhole size={13} /> : <Globe2 size={13} />}
        {privateProfile ? "Private draft · only this company and staff" : "Published information"}
      </span>
      <p className="detail-demo">
        Profile information comes from the data source. Published edits are labelled as
        company-provided information.
      </p>
      <ProfileForm
        company={company}
        profile={profile}
        privateProfile={privateProfile}
        canRequestReview={canRequestReview}
        pendingReview={pendingReview}
        updated={updated}
        onCancel={close}
      />
    </aside>
  );
}
