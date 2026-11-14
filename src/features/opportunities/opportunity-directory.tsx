import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Opportunity } from "@/lib/ecosystem";
import { opportunityIcons as icons } from "./opportunity-icons";

type Item = Opportunity & { score: number };
type Props = {
  actions?: ReactNode;
  staff?: boolean;
  companyName: string | undefined;
  search: string;
  onSearch: (value: string) => void;
  items: Item[];
  onSelect: (item: Item) => void;
};

export function OpportunityDirectory({
  companyName,
  search,
  onSearch,
  items,
  onSelect,
  actions,
  staff,
}: Props) {
  return (
    <div className="opportunity-directory">
      <div className="directory-heading">
        <div>
          <span className="eyebrow">CURATED POSSIBILITIES</span>
          <h2>{companyName ? `For ${companyName}` : "Opportunity listings"}</h2>
        </div>
        <div className="directory-tools">
          {actions}
        </div>
      </div>
      <label className="editor-field opportunity-search">
        <span className="text-base font-semibold">Search opportunities</span>
        <input
          placeholder="Search by title, category, or source"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </label>
      <div className="directory-grid">
        {items.map((item) => {
          const Icon = icons[item.category];
          return (
            <Button
              variant="ghost"
              className="opportunity-card"
              key={item.id}
              onClick={() => onSelect(item)}
            >
              <span className={`category-icon category-${item.category.toLowerCase()}`}>
                <Icon />
              </span>
              <span className="opportunity-card-content">
                <small>
                  {item.category} · {item.source}
                </small>
                <strong>{item.title}</strong>
                <span>{item.date}</span>
                {staff && <span className="card-match-hint">Find companies that fit →</span>}
              </span>
              <ArrowUpRight />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
