import { useMemo, useState } from "react";
import { Bookmark, CalendarClock, Check, Handshake, RotateCcw, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { weeklyDigest, type DigestItem } from "@/lib/digest";
import type { Company } from "@/lib/ecosystem";

/**
 * "What matters this week": three items instead of a feed. Built for the overwhelmed reader
 * from the interviews — each item says when, why, and who to do it with.
 */
export function WeeklyDigest({
  company,
  companies,
  canMarkInterest,
  saved,
  onToggleSave,
  onOpen,
  onFocusCompany,
  today,
}: {
  company: Company;
  companies: Company[];
  canMarkInterest: boolean;
  saved: string[];
  onToggleSave: (id: string) => void;
  onOpen: (item: DigestItem) => void;
  onFocusCompany: (company: Company) => void;
  today?: Date;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [now] = useState(() => today ?? new Date());
  const items = useMemo(
    () =>
      weeklyDigest(company, {
        today: now,
        dismissed: canMarkInterest ? dismissed : [],
        pool: companies,
      }),
    [company, companies, canMarkInterest, dismissed, now],
  );

  return (
    <section className="weekly-digest" aria-label={`This week for ${company.name}`}>
      <div className="digest-head">
        <span className="eyebrow">
          <CalendarClock size={13} /> THIS WEEK FOR {company.name.toUpperCase()}
        </span>
        <small>
          {items.length
            ? `${items.length} things worth your time — not a feed.`
            : "Nothing urgent this week."}
        </small>
      </div>
      <ol className="digest-list">
        {items.map((item) => {
          const isSaved = saved.includes(item.id);
          return (
            <li key={item.id} className={`digest-item category-${item.category.toLowerCase()}`}>
              <button type="button" className="digest-main" onClick={() => onOpen(item)}>
                <span className="digest-when">{item.when}</span>
                <strong>{item.title}</strong>
                <span className="digest-why">{item.why}</span>
              </button>
              {canMarkInterest && item.teamUp && (
                <button
                  type="button"
                  className="digest-teamup"
                  onClick={() => onFocusCompany(item.teamUp!.company)}
                >
                  {item.teamUp.mode === "apply-together" ? (
                    <Handshake size={13} />
                  ) : (
                    <Users size={13} />
                  )}
                  {item.teamUp.mode === "apply-together" ? "Apply together with " : "Meet there: "}
                  <b>{item.teamUp.company.name}</b>
                  <span>brings {item.teamUp.brings.join(", ")}</span>
                </button>
              )}
              {canMarkInterest && (
                <div className="digest-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={isSaved}
                    onClick={() => onToggleSave(item.id)}
                  >
                    {isSaved ? <Check /> : <Bookmark />}
                    {isSaved ? "Saved" : "Interested"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDismissed((d) => [...d, item.id])}
                  >
                    <X />
                    Not for us
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {canMarkInterest && dismissed.length > 0 && (
        <button type="button" className="digest-reset" onClick={() => setDismissed([])}>
          <RotateCcw size={12} /> {dismissed.length} hidden · your feedback re-ranks this list ·
          undo
        </button>
      )}
    </section>
  );
}
