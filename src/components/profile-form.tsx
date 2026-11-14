import { useEffect, useRef, useState } from "react";
import { Check, Globe2, LockKeyhole, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, type Company } from "@/lib/ecosystem";
import { draftFrom, type ProfileDraft } from "@/lib/account";
import {
  backendState,
  company as companyRepository,
  review as reviewService,
} from "@/data/services";
import { BackendProfileEditor } from "@/components/backend-profile-editor";
import type { PublicProfileRecord, PrivateProfileRecord } from "@/lib/profile-sections";
import type { PublishField } from "@/lib/profile-sections";

/** How the editor was opened: plain editing, visibility management, or sending a profile for review. */
export type EditorIntent = "edit" | "publish" | "review";

const publishable: { field: PublishField; label: string }[] = [
  { field: "name", label: "Company name" },
  { field: "description", label: "About the company" },
  { field: "products_services", label: "Products & services" },
  { field: "technologies", label: "Technologies & expertise" },
  { field: "markets", label: "Markets & industries" },
  { field: "geographical_focus", label: "Geographical focus" },
  { field: "priorities", label: "Development priorities" },
  { field: "projects", label: "Projects & collaborations" },
  { field: "interests", label: "Interests & opportunities" },
];

type ProfileFormProps = Parameters<typeof LocalProfileForm>[0];

/** The single editing form behind both the inline profile panel and the wider editor. */
export function ProfileForm(props: ProfileFormProps) {
  return backendState.enabled ? (
    <BackendProfileEditor
      company={props.company}
      updated={props.updated}
      onCancel={props.onCancel}
    />
  ) : (
    <LocalProfileForm {...props} />
  );
}

/** Demo-mode editor on the fixture profiles. */
function LocalProfileForm({
  company,
  profile,
  privateProfile,
  canRequestReview = false,
  pendingReview = false,
  intent = "edit",
  updated,
  onCancel,
}: {
  company: Company;
  profile?: PublicProfileRecord | undefined;
  privateProfile?: PrivateProfileRecord | undefined;
  canRequestReview?: boolean;
  pendingReview?: boolean;
  intent?: EditorIntent;
  updated: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    draftFrom(company, privateProfile ?? profile, privateProfile?.private_notes),
  );
  const [fields, setFields] = useState<PublishField[]>(["description"]);
  const [confirmation, setConfirmation] = useState<"publish" | "send" | null>(null);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const publishBlock = useRef<HTMLSpanElement>(null);
  const opened = useRef(false);
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const canSave = !busy && Boolean(draft.name.trim());
  const canPublish = canSave && fields.length > 0;
  const canSend =
    !busy &&
    canRequestReview &&
    Boolean(privateProfile) &&
    !pendingReview &&
    Boolean(reviewService.resolveRecipient(company.id));

  const persist = async (publish: boolean) => {
    if (!(publish ? canPublish : canSave)) return;
    setBusy(true);
    setError("");
    try {
      await companyRepository.save(company.id, draft, publish ? fields : []);
      await updated();
      setMessage(
        publish
          ? "Selected sections published. Private notes remain private."
          : "Profile saved privately. Your public profile is unchanged.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this profile.");
    } finally {
      setBusy(false);
      setConfirmation(null);
    }
  };

  const requestReview = async () => {
    if (!canSend) return;
    setError("");
    setBusy(true);
    try {
      const recipient = reviewService.resolveRecipient(company.id);
      if (!recipient)
        throw new Error(
          "No registered company account yet. A representative account must be assigned first.",
        );
      setRecipient(recipient.name);
      setConfirmation("send");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find the company account.");
    } finally {
      setBusy(false);
    }
  };

  const confirmSend = async () => {
    if (!canSend || !recipient) return;
    setBusy(true);
    try {
      reviewService.request(company.id);
      await updated();
      setMessage("In-app review request created. No email was sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send the review request.");
    } finally {
      setBusy(false);
      setConfirmation(null);
    }
  };

  /* Opening the editor through "Send to Company" or "Manage Visibility" lands on the right control. */
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (intent === "review") void requestReview();
    if (intent === "publish")
      publishBlock.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intent]);

  return (
    <div className="profile-form">
      <label className="editor-field">
        Company name
        <input value={draft.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <label className="editor-field">
        Description
        <textarea
          aria-label="Description"
          rows={3}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>
      <label className="editor-field">
        Products & services
        <textarea
          aria-label="Products and services"
          rows={2}
          value={draft.products_services}
          onChange={(e) => set("products_services", e.target.value)}
        />
      </label>
      <label className="editor-field">
        Technologies & expertise
        <input
          value={draft.technologies.join(", ")}
          onChange={(e) =>
            set(
              "technologies",
              e.target.value.split(",").map((t) => t.trim()),
            )
          }
        />
      </label>
      <label className="editor-field">
        Markets & industries
        <textarea
          aria-label="Markets and industries"
          rows={2}
          value={draft.markets}
          onChange={(e) => set("markets", e.target.value)}
        />
      </label>
      <label className="editor-field">
        Geographical focus
        <input
          value={draft.geographical_focus}
          onChange={(e) => set("geographical_focus", e.target.value)}
        />
      </label>
      <label className="editor-field">
        Development priorities
        <textarea
          aria-label="Development priorities"
          rows={2}
          value={draft.priorities}
          onChange={(e) => set("priorities", e.target.value)}
        />
      </label>
      <label className="editor-field">
        Projects & collaborations
        <textarea
          aria-label="Projects and collaborations"
          rows={2}
          value={draft.projects}
          onChange={(e) => set("projects", e.target.value)}
        />
      </label>
      <span className="editor-label">Interests & opportunity preferences</span>
      <div className="editor-interests">
        {categories.map((c) => (
          <Button
            variant="outline"
            size="sm"
            key={c}
            aria-pressed={draft.interests.includes(c)}
            onClick={() =>
              set(
                "interests",
                draft.interests.includes(c)
                  ? draft.interests.filter((i) => i !== c)
                  : [...draft.interests, c],
              )
            }
          >
            {draft.interests.includes(c) && <Check />}
            {c}
          </Button>
        ))}
      </div>
      <label className="editor-field">
        Private notes · never published
        <textarea
          aria-label="Private notes · never published"
          rows={2}
          value={draft.private_notes}
          onChange={(e) => set("private_notes", e.target.value)}
        />
      </label>
      <span className="editor-label" ref={publishBlock} data-focus={intent === "publish"}>
        Publish these sections
      </span>
      <div className="publication-fields">
        {publishable.map(({ field, label }) => (
          <label key={field}>
            <input
              type="checkbox"
              checked={fields.includes(field)}
              onChange={() =>
                setFields((fs) =>
                  fs.includes(field) ? fs.filter((i) => i !== field) : [...fs, field],
                )
              }
            />
            {label}
            <span>{fields.includes(field) ? "Public on confirmation" : "Private"}</span>
          </label>
        ))}
      </div>
      <div className="form-actions">
        <Button disabled={!canSave} onClick={() => void persist(false)}>
          <LockKeyhole />
          Save Privately
        </Button>
        <Button variant="outline" disabled={!canPublish} onClick={() => setConfirmation("publish")}>
          <Globe2 />
          Publish Changes
        </Button>
        {onCancel && (
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {canRequestReview && (
        <Button variant="outline" disabled={!canSend} onClick={() => void requestReview()}>
          <Send />
          Send to Company
        </Button>
      )}
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
      {confirmation && (
        <div className="inline-confirmation">
          <h3>
            {confirmation === "publish"
              ? "Publish selected information?"
              : "Send profile for review?"}
          </h3>
          <p>
            {confirmation === "publish"
              ? `${publishable
                  .filter((p) => fields.includes(p.field))
                  .map((p) => p.label)
                  .join(", ")} will become publicly visible. Private notes will not be published.`
              : `Recipient: ${recipient}. This creates an in-app request, not an email. Save your draft privately before sending.`}
          </p>
          <div>
            <Button
              disabled={confirmation === "publish" ? !canPublish : !canSend || !recipient}
              onClick={() => (confirmation === "publish" ? void persist(true) : void confirmSend())}
            >
              Confirm
            </Button>
            <Button variant="ghost" onClick={() => setConfirmation(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
