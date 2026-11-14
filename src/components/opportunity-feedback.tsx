import { useState } from "react";
import { Bookmark, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/account-provider";
import { backendState } from "@/data/services";
import { apiFeedback, type FeedbackVerdict } from "@/data/api/adapter";

const options: { verdict: FeedbackVerdict; label: string; done: string; Icon: typeof Bookmark }[] =
  [
    { verdict: "save", label: "Save", done: "Saved to your opportunities.", Icon: Bookmark },
    {
      verdict: "relevant",
      label: "Relevant",
      done: "Marked as relevant — thanks, this improves your ranking.",
      Icon: ThumbsUp,
    },
    {
      verdict: "not_relevant",
      label: "Not relevant",
      done: "Marked as not relevant — we'll show fewer like it.",
      Icon: ThumbsDown,
    },
  ];

/** Save / Relevant / Not relevant → POST /feedback. Only for a logged-in company account in team-API mode. */
export function OpportunityFeedback({
  opportunityId,
  onVerdict,
}: {
  opportunityId: string;
  onVerdict?: (verdict: FeedbackVerdict) => void;
}) {
  const { account } = useAccount();
  const [sent, setSent] = useState<FeedbackVerdict | null>(null);
  const [busy, setBusy] = useState(false);
  if (!backendState.enabled || account?.role !== "representative") return null;
  const send = async (verdict: FeedbackVerdict, done: string) => {
    setBusy(true);
    try {
      await apiFeedback(opportunityId, verdict);
      setSent(verdict);
      toast.success(done);
      onVerdict?.(verdict);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Feedback could not be sent. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="opportunity-feedback" role="group" aria-label="Feedback on this recommendation">
      {options.map(({ verdict, label, done, Icon }) => (
        <Button
          key={verdict}
          variant="outline"
          size="sm"
          disabled={busy}
          aria-pressed={sent === verdict}
          onClick={() => void send(verdict, done)}
        >
          <Icon />
          {label}
        </Button>
      ))}
    </div>
  );
}
