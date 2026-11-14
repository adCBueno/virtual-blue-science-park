import { OpportunityDirectory } from "@/features/opportunities/opportunity-directory";
import { opportunityIcons as icons } from "@/features/opportunities/opportunity-icons";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Globe2,
  Handshake,
  Layers3,
  MapPin,
  Maximize,
  Minus,
  Network,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Users,
  Waves,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { companyPosition, matchPosition } from "@/features/universe/layout";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  companies,
  collaborators,
  type Company,
  type Opportunity,
  type Category,
  type Sector,
} from "@/lib/ecosystem";

import {
  auth as authService,
  company as companyRepository,
  recommendation as recommendationService,
} from "@/data/services";
import { useAccount } from "@/components/account-provider";
import { CompanyEditor } from "@/components/company-editor";
import { CompanyProfilePanel } from "@/components/company-profile-panel";
import { AiAssistant } from "@/components/ai-assistant";
import { applyProfile, canEditCompany } from "@/lib/account";
import type { AssistantAction } from "@/lib/assistant";

type ScoredOpportunity = Opportunity & { score: number };
type Connection = ReturnType<typeof collaborators>[number];
type Detail =
  { kind: "opportunity"; item: ScoredOpportunity } | { kind: "connection"; item: Connection };
function CompanyMark({ company }: { company: Company }) {
  return (
    <span className={`company-mark mark-${company.mark}`} aria-hidden="true">
      {company.id === "nord" ? (
        <>
          <span className="nord-symbol">n</span>
          <small>nord</small>
        </>
      ) : company.id === "ocean" ? (
        <>
          <Waves />
          <small>ocean</small>
        </>
      ) : company.id === "aether" ? (
        <>
          <span className="aether-symbol">a.</span>
          <small>AETHER AI</small>
        </>
      ) : company.id === "modul" ? (
        <>
          <Layers3 />
          <small>modul</small>
        </>
      ) : company.id === "baltic" ? (
        <>
          <Waves />
          <small>baltic blue</small>
        </>
      ) : company.id === "pulse" ? (
        <>
          <span className="pulse-symbol">
            p<span>+</span>
          </span>
          <small>pulse health</small>
        </>
      ) : (
        <>
          <Network />
          <small>connective</small>
        </>
      )}
    </span>
  );
}

export function UniversePage() {
  const isMobile = useIsMobile();
  const { account, isPreview, privateProfiles, publicProfiles, reviews, refresh, signOut } =
    useAccount();
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [opportunitySearch, setOpportunitySearch] = useState("");
  const previewRole =
    account?.role === "staff" || account?.role === "representative" ? account.role : "guest";
  const previewAccount = isPreview ? account : null;
  const displayAccount = account;
  const companyList = companyRepository.list().map((c) =>
    applyProfile(
      c,
      publicProfiles.find((p) => p.company_id === c.id),
    ),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = companyList.find((company) => company.id === selectedId) ?? null;
  const [sector, setSector] = useState<Sector>("All sectors");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [focusTab, setFocusTab] = useState<"map" | "info">("map");
  const [chatOpen, setChatOpen] = useState(false);
  const [highlight, setHighlight] = useState<{ opportunityIds: string[]; companyIds: string[] }>({
    opportunityIds: [],
    companyIds: [],
  });
  const [view, setView] = useState<"universe" | "opportunities">("universe");
  const [saved, setSaved] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [help, setHelp] = useState(false);
  const accessiblePrivate =
    selected && canEditCompany(account, selected.id)
      ? privateProfiles.find((p) => p.company_id === selected.id)
      : undefined;
  const focusedCompany = selected ? applyProfile(selected, accessiblePrivate) : null;
  const interests = focusedCompany ? focusedCompany.interests : [];
  const matches = focusedCompany
    ? recommendationService.recommendations(focusedCompany, interests, category)
    : [];
  const connections = focusedCompany
    ? recommendationService.collaborators(focusedCompany, companyList)
    : [];
  const boostedOpportunities = matches.filter((o) => highlight.opportunityIds.includes(o.id));
  const visibleOpportunities = [
    ...boostedOpportunities,
    ...matches.filter((o) => !highlight.opportunityIds.includes(o.id)),
  ].slice(0, category === "All" ? 4 : 6);
  const boostedConnections = connections.filter((c) => highlight.companyIds.includes(c.id));
  const visibleConnections =
    selected && (category === "All" || category === "Collaborations")
      ? [...boostedConnections, ...connections.filter((c) => !highlight.companyIds.includes(c.id))]
      : [];
  const nodes = [
    ...visibleOpportunities.map((item) => ({ kind: "opportunity" as const, item })),
    ...visibleConnections.map((item) => ({ kind: "connection" as const, item })),
  ].slice(0, 6);
  const nodeSlot = (index: number, priority: boolean) =>
    matchPosition(index, nodes.length, priority, isMobile);
  const companySlot = (company: Company, index: number) =>
    companyPosition(company, index, isMobile);
  const visibleCompanies = companyList.filter(
    (c) =>
      (sector === "All sectors" || c.sector === sector) &&
      `${c.name} ${c.industry} ${c.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase()),
  );
  const focus = (company: Company) => {
    setSelectedId(company.id);
    setDetail(null);
    setCategory("All");
    setZoom(1);
    setView("universe");
    setEditing(false);
    setFocusTab("map");
    setHighlight({ opportunityIds: [], companyIds: [] });
  };
  const back = () => {
    setSelectedId(null);
    setDetail(null);
    setCategory("All");
    setView("universe");
    setZoom(1);
    setEditing(false);
    setFocusTab("map");
    setHighlight({ opportunityIds: [], companyIds: [] });
  };
  const openMyCompany = () => {
    const own = companyList.find((c) => c.id === displayAccount?.companyId);
    if (own) {
      focus(own);
      if (isMobile) {
        setEditing(true);
        setFocusTab("info");
      } else setProfileOpen(true);
    }
  };
  const applyAssistantAction = (action: AssistantAction) => {
    if (action.kind === "filter") {
      setCategory(action.category);
      setHighlight({ opportunityIds: [], companyIds: [] });
    }
    if (action.kind === "focus") {
      const target = companyList.find((c) => c.id === action.companyId);
      if (target) focus(target);
    }
    if (action.kind === "highlight") {
      setHighlight({ opportunityIds: action.opportunityIds, companyIds: action.companyIds });
      setView("universe");
    }
  };
  const representativeCompanyId = account?.role === "representative" ? account.companyId : null;
  useEffect(() => {
    if (representativeCompanyId && companyRepository.get(representativeCompanyId))
      setSelectedId(representativeCompanyId);
  }, [representativeCompanyId]);
  useEffect(() => {
    setProfileOpen(false);
    setStaffOpen(false);
    setSaved([]);
    setEditing(false);
    setDetail(null);
    setHighlight({ opportunityIds: [], companyIds: [] });
  }, [account?.id]);
  const updated = async () => {
    await refresh();
  };
  const allOpportunities = (
    selected
      ? matches
      : recommendationService.recommendations(companyList[0] ?? companies[0], [], category)
  ).filter((o) =>
    `${o.title} ${o.category} ${o.source}`.toLowerCase().includes(opportunitySearch.toLowerCase()),
  );
  const roleSwitch = (placement = "") =>
    (!account || isPreview) && (
      <label className={`demo-role-switch ${placement}`}>
        Demo role preview
        <select
          aria-label="Demo role preview"
          value={previewRole}
          onChange={(e) => {
            authService.preview(e.target.value as typeof previewRole);
            void refresh();
            setEditing(false);
            setSaved([]);
            setProfileOpen(false);
            setStaffOpen(false);
          }}
        >
          <option value="guest">Public visitor</option>
          <option value="representative">Company representative</option>
          <option value="staff">Park staff</option>
        </select>
        <small>Simulated · no real permissions</small>
      </label>
    );

  return (
    <div
      className={`app-shell fullscreen-ecosystem ${view === "opportunities" ? "directory-view" : ""} ${selected ? "company-focused" : ""} ${editing ? "profile-editing" : ""} ${chatOpen ? "chat-open" : ""}`}
    >
      <header className="topbar">
        <a href="/" className="brand" aria-label="Blue Science Park home">
          <img src="/bsp-logo.png" alt="Blue Science Park Karlskrona" />
        </a>
        <span className="brand-divider" />
        <span className="product-name">Virtual Science Park</span>
        <nav className="main-nav" aria-label="Main navigation">
          <Button
            variant="nav"
            data-active={view === "universe"}
            onClick={() => setView("universe")}
          >
            <Globe2 />
            Universe
          </Button>
          <Button
            variant="nav"
            data-active={view === "opportunities"}
            onClick={() => setView("opportunities")}
          >
            <Sparkles />
            Opportunities
          </Button>
          {displayAccount?.role === "representative" && (
            <Button variant="nav" onClick={openMyCompany}>
              <Settings2 />
              My Company
            </Button>
          )}
          {displayAccount?.role === "staff" && (
            <Button variant="nav" onClick={() => setStaffOpen(true)}>
              <Users />
              Staff Workspace
            </Button>
          )}
        </nav>
        <div className="account">
          {account && !isPreview ? (
            <>
              <span className="account-label">
                {account.name}
                <small>
                  {account.role === "staff"
                    ? "Blue Science Park Staff"
                    : account.role === "representative"
                      ? "Company Representative"
                      : "Account awaiting assignment"}
                </small>
              </span>
              <Button variant="nav" onClick={() => void signOut()}>
                Log Out
              </Button>
            </>
          ) : (
            <Button variant="nav" asChild>
              <Link to="/auth">
                Log In
                <ArrowUpRight />
              </Link>
            </Button>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span /> THE BLUE SCIENCE PARK ECOSYSTEM
            </div>
            <h1>
              {view === "opportunities"
                ? "A world of opportunity."
                : selected
                  ? "Your next connection starts here."
                  : "Great ideas don’t grow alone."}
            </h1>
            <p>
              {focusedCompany
                ? `Explore the people and possibilities around ${focusedCompany.name}.`
                : "Discover companies, connect expertise, and find what’s next."}
            </p>
          </div>
          <div className="ecosystem-location">
            <MapPin size={15} /> Karlskrona, Sweden{" "}
            <span className="live-status">
              <span /> A living ecosystem
            </span>
          </div>
        </div>

        <section
          className={`universe-section ${selected ? "is-focused" : ""}`}
          aria-label="Interactive innovation ecosystem"
        >
          <div className="universe-toolbar">
            <div className="toolbar-left">
              {selected ? (
                <Button variant="ghost" onClick={back} className="back-button">
                  <ArrowLeft />
                  Back to Universe
                </Button>
              ) : (
                <>
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      aria-label="Search companies"
                      placeholder="Search the ecosystem"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <span>⌕</span>
                  </label>
                  <label className="sector-select">
                    <SlidersHorizontal size={15} />
                    <select
                      aria-label="Filter by sector"
                      value={sector}
                      onChange={(e) => setSector(e.target.value as Sector)}
                    >
                      {[
                        "All sectors",
                        "Marine technology",
                        "Digital solutions",
                        "Industry & engineering",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </label>
                </>
              )}
            </div>
            <div className="toolbar-right">
              <span className="company-count">
                {selected
                  ? `${matches.length + connections.length} relevant connections`
                  : `${visibleCompanies.length} companies in your universe`}
              </span>
              <Button
                variant="tool"
                size="icon"
                aria-label="About this prototype"
                title="About this prototype"
                onClick={() => setHelp(true)}
              >
                <CircleHelp />
              </Button>
            </div>
          </div>

          {isMobile && selected && view === "universe" && (
            <div className="mobile-focus-head">
              <span className="eyebrow">COMPANY IN FOCUS</span>
              <h2>{focusedCompany?.name ?? selected.name}</h2>
              <span className="industry-label">{selected.industry}</span>
              {roleSwitch("focus-role-switch")}
              <div className="focus-tabs" role="tablist" aria-label="Company view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={focusTab === "map"}
                  data-active={focusTab === "map"}
                  onClick={() => setFocusTab("map")}
                >
                  Map
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={focusTab === "info"}
                  data-active={focusTab === "info"}
                  onClick={() => {
                    setFocusTab("info");
                    setDetail(null);
                  }}
                >
                  Company Info
                </button>
              </div>
            </div>
          )}

          {view === "opportunities" ? (
            <OpportunityDirectory
              companyName={focusedCompany?.name}
              search={opportunitySearch}
              onSearch={setOpportunitySearch}
              items={allOpportunities}
              onSelect={(item) => {
                if (!selected) setSelectedId(companyList[0]?.id ?? null);
                setDetail({ kind: "opportunity", item });
              }}
            />
          ) : (
            <div
              className={`ecosystem-space ${isMobile && selected ? (focusTab === "info" ? "show-info" : "show-map") : ""}`}
            >
              {selected && (
                <CompanyProfilePanel
                  key={selected.id}
                  company={focusedCompany ?? selected}
                  profile={publicProfiles.find((p) => p.company_id === selected.id)}
                  privateProfile={accessiblePrivate}
                  canEdit={canEditCompany(displayAccount, selected.id)}
                  isStaff={displayAccount?.role === "staff"}
                  preview={Boolean(previewAccount)}
                  previewStaff={account?.role === "staff"}
                  editing={editing}
                  setEditing={setEditing}
                  updated={updated}
                  pendingReview={reviews.some(
                    (r) => r.companyId === selected.id && r.status === "pending",
                  )}
                  onClose={back}
                />
              )}

              <div className={`graph-stage zoom-${zoom}`}>
                <svg
                  className="connection-map"
                  viewBox="0 0 1000 620"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <ellipse className="orbit-ring ring-one" cx="500" cy="310" rx="190" ry="135" />
                  <ellipse className="orbit-ring ring-two" cx="500" cy="310" rx="335" ry="233" />
                  <ellipse className="orbit-ring ring-three" cx="500" cy="310" rx="465" ry="305" />
                  {!selected
                    ? visibleCompanies.map((company, index) => {
                        const c = companySlot(company, index);
                        return (
                          <g key={company.id}>
                            <path
                              className="company-line"
                              d={`M 500 310 Q ${(c.x * 10 + 500) / 2 + 30} ${(c.y * 6.2 + 310) / 2 - 40} ${c.x * 10} ${c.y * 6.2}`}
                            />
                            <circle
                              className="connection-dot"
                              cx={(c.x * 10 + 500) / 2}
                              cy={(c.y * 6.2 + 310) / 2 - 20}
                              r="3"
                            />
                          </g>
                        );
                      })
                    : nodes.map((node, index) => {
                        const slot = nodeSlot(
                          index,
                          node.kind === "opportunity" && interests.includes(node.item.category),
                        );
                        if (!slot) return null;
                        const { x, y } = slot;
                        return (
                          <path
                            key={node.item.id}
                            className={`company-line focused-line ${detail?.item.id === node.item.id ? "selected-line" : ""} ${node.kind === "connection" ? "suggested-line" : ""}`}
                            d={`M 500 310 Q ${(x * 10 + 500) / 2 + 25} ${(y * 6.2 + 310) / 2 - 20} ${x * 10} ${y * 6.2}`}
                          />
                        );
                      })}
                </svg>

                <div className={`ecosystem-centre ${selected ? "focused-centre" : ""}`}>
                  <div className="centre-disc">
                    {selected ? (
                      <CompanyMark company={selected} />
                    ) : (
                      <div className="park-symbol">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                  </div>
                  <strong>{focusedCompany?.name ?? "Blue Science Park"}</strong>
                  <span>
                    {selected ? "YOUR INNOVATION ECOSYSTEM" : "WHERE POSSIBILITIES CONNECT"}
                  </span>
                  {!selected && (
                    <span className="centre-live">
                      <span /> Connected by possibility
                    </span>
                  )}
                </div>

                {!selected
                  ? visibleCompanies.map((company, index) => (
                      <div
                        key={company.id}
                        className={`positioned-node company-position tone-${company.tone}`}
                        style={
                          {
                            "--node-x": `${companySlot(company, index).x}%`,
                            "--node-y": `${companySlot(company, index).y}%`,
                            "--float-delay": `${index * -0.8}s`,
                          } as React.CSSProperties
                        }
                      >
                        <Button
                          variant="node"
                          className="company-node"
                          aria-label={`Explore ${company.name}`}
                          onClick={() => focus(company)}
                        >
                          <CompanyMark company={company} />
                          <span className="node-open">
                            <ArrowUpRight size={13} />
                          </span>
                        </Button>
                        <span className="node-company-name">{company.name}</span>
                        <span className="node-industry">{company.industry}</span>
                        <span className="company-hover">
                          Explore company <ArrowRight size={12} />
                        </span>
                      </div>
                    ))
                  : nodes.map((node, index) => {
                      const prominent =
                        node.kind === "opportunity" && interests.includes(node.item.category);
                      const slot = nodeSlot(index, prominent);
                      if (!slot) return null;
                      const lit =
                        node.kind === "opportunity"
                          ? highlight.opportunityIds.includes(node.item.id)
                          : highlight.companyIds.includes(node.item.id);
                      const Icon =
                        node.kind === "opportunity" ? icons[node.item.category] : Handshake;
                      return (
                        <div
                          key={node.item.id}
                          className={`positioned-node opportunity-position ${prominent ? "is-priority" : ""} ${lit ? "is-highlighted" : ""} ${detail?.item.id === node.item.id ? "node-selected" : ""}`}
                          style={
                            {
                              "--node-x": `${slot.x}%`,
                              "--node-y": `${slot.y}%`,
                              "--float-delay": `${index * -1.2}s`,
                            } as React.CSSProperties
                          }
                        >
                          <Button
                            variant="node"
                            className={`opportunity-node ${node.kind === "opportunity" ? `category-${node.item.category.toLowerCase()}` : "category-collaborations"}`}
                            aria-label={
                              node.kind === "opportunity"
                                ? `View ${node.item.title}`
                                : `Explore collaboration with ${node.item.name}`
                            }
                            onClick={() => {
                              setDetail(node);
                              setChatOpen(false);
                            }}
                          >
                            <Icon />
                            {prominent && (
                              <span className="priority-spark">
                                <Sparkles size={11} />
                              </span>
                            )}
                          </Button>
                          <span className="node-category">
                            {node.kind === "opportunity"
                              ? node.item.category
                              : "Suggested collaboration"}
                          </span>
                          <span className="opportunity-title">
                            {node.kind === "opportunity" ? node.item.title : node.item.name}
                          </span>
                          <span className="opportunity-preview">
                            {node.kind === "opportunity"
                              ? `${node.item.score}% match · ${node.item.source}`
                              : `${node.item.shared.length} shared areas of expertise`}
                          </span>
                        </div>
                      );
                    })}
                {!selected && visibleCompanies.length === 0 && (
                  <div className="empty-results">
                    <Search />
                    <h3>No companies found</h3>
                    <p>Try another name, expertise, or sector.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setSector("All sectors");
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>

              {!selected && (
                <div className="canvas-caption">
                  <span className="caption-line" />
                  <span>Independent ideas. Shared possibilities.</span>
                </div>
              )}
              {selected && !detail && (
                <div className="recommendation-note">
                  <Sparkles size={16} />
                  <span>
                    Matched to your expertise
                    <span>
                      {interests.length
                        ? `Prioritising ${interests.join(" & ").toLowerCase()}`
                        : "A balanced mix of possibilities"}
                    </span>
                  </span>
                  <span className="demo-label">Demo matching</span>
                </div>
              )}
              <div className="canvas-tools">
                <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="tool"
                  size="icon"
                  aria-label="Zoom out"
                  title="Zoom out"
                  disabled={zoom === 0.85}
                  onClick={() => setZoom((z) => Math.max(0.85, +(z - 0.15).toFixed(2)))}
                >
                  <Minus />
                </Button>
                <Button
                  variant="tool"
                  size="icon"
                  aria-label="Zoom in"
                  title="Zoom in"
                  disabled={zoom === 1.3}
                  onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.15).toFixed(2)))}
                >
                  <Plus />
                </Button>
                <span />
                <Button
                  variant="tool"
                  size="icon"
                  aria-label="Reset view"
                  title="Reset view"
                  onClick={() => setZoom(1)}
                >
                  <Maximize />
                </Button>
              </div>
            </div>
          )}

          <div className="universe-footer">
            <div className="legend">
              <span>
                <i className="legend-company" />
                Companies
              </span>
              <span>
                <i className="legend-opportunity" />
                Opportunities
              </span>
              <span>
                <i className="legend-connection" />
                Suggested connections
              </span>
            </div>
            <span className="powered-by">
              <Sparkles size={13} /> Powered by shared ambition
            </span>
          </div>
        </section>
      </main>

      {detail && selected && (
        <aside className="detail-panel" aria-label="Connection details">
          <div className="detail-top">
            <span className="eyebrow">
              {detail.kind === "opportunity" ? "YOUR NEXT OPPORTUNITY" : "A POTENTIAL CONNECTION"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close details"
              onClick={() => setDetail(null)}
            >
              <X />
            </Button>
          </div>
          {detail.kind === "opportunity" ? (
            <>
              <span className={`detail-icon category-${detail.item.category.toLowerCase()}`}>
                {(() => {
                  const Icon = icons[detail.item.category];
                  return <Icon />;
                })()}
              </span>
              <span className="detail-category">
                {detail.item.category}
                <span>{detail.item.score}% match</span>
              </span>
              <h2>{detail.item.title}</h2>
              <p>{detail.item.summary}</p>
              <div className="why-match">
                <Sparkles size={17} />
                <div>
                  <h3>Why it’s relevant to {(focusedCompany ?? selected).name}</h3>
                  <p>
                    Your expertise in{" "}
                    {detail.item.tags
                      .filter((t) => (focusedCompany ?? selected).tags.includes(t))
                      .join(" and ")}{" "}
                    aligns with this opportunity.
                    {interests.includes(detail.item.category)
                      ? ` It also matches your ${detail.item.category.toLowerCase()} priority.`
                      : " It opens a complementary path for your next stage of growth."}
                  </p>
                </div>
              </div>
              <dl>
                <div>
                  <dt>
                    <CalendarDays size={15} />
                    Date
                  </dt>
                  <dd>{detail.item.date}</dd>
                </div>
                <div>
                  <dt>
                    <Globe2 size={15} />
                    Source
                  </dt>
                  <dd>{detail.item.source}</dd>
                </div>
                <div>
                  <dt>
                    <Check size={15} />
                    Requirements
                  </dt>
                  <dd>{detail.item.requirements}</dd>
                </div>
              </dl>
              <span className="detail-demo">
                Illustrative demo listing. Dates and requirements are not verified; source links
                lead to the organisation’s website.
              </span>
              <Button asChild className="source-button">
                <a href={detail.item.url} target="_blank" rel="noreferrer">
                  Visit information source
                  <ExternalLink />
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setSaved((s) =>
                    s.includes(detail.item.id)
                      ? s.filter((id) => id !== detail.item.id)
                      : [...s, detail.item.id],
                  )
                }
              >
                {saved.includes(detail.item.id) ? <Check /> : <Bookmark />}
                {saved.includes(detail.item.id) ? "Saved for this session" : "Save opportunity"}
              </Button>
            </>
          ) : (
            <>
              <div className={`collaborator-mark tone-${detail.item.tone}`}>
                <CompanyMark company={detail.item} />
              </div>
              <span className="suggested-badge">
                <Sparkles size={12} />
                Suggested · Not a confirmed partnership
              </span>
              <h2>
                {selected.name}
                <span className="connection-pair">
                  <ArrowRight />
                  {detail.item.name}
                </span>
              </h2>
              <p>{detail.item.description}</p>
              <div className="why-match">
                <Handshake size={19} />
                <div>
                  <h3>Complementary by nature</h3>
                  <p>
                    Both companies work with {detail.item.shared.join(" and ")}. {selected.name}{" "}
                    brings {selected.industry.toLowerCase()} expertise, while {detail.item.name}{" "}
                    adds {detail.item.industry.toLowerCase()} capabilities.
                  </p>
                </div>
              </div>
              <h3 className="detail-subheading">What you could build together</h3>
              <p>
                A joint pilot combining your technology with {detail.item.name}’s expertise. Start
                with a shared validation challenge, exchange data and insights, and explore a
                co-developed prototype.
              </p>
              <h3 className="detail-subheading">Why this connection is suggested</h3>
              <p>
                Demo matching identified {detail.item.shared.length} shared expertise areas and
                complementary specialisms. This is a rule-based suggestion, not a live AI
                recommendation.
              </p>
              <Button onClick={() => focus(detail.item)}>
                Explore {detail.item.name}
                <ArrowUpRight />
              </Button>
            </>
          )}
          <Button variant="ghost" className="return-link" onClick={() => setDetail(null)}>
            <ArrowLeft />
            Return to company ecosystem
          </Button>
        </aside>
      )}

      {profileOpen && selected && (
        <CompanyEditor
          key={selected.id}
          company={focusedCompany ?? selected}
          profile={publicProfiles.find((p) => p.company_id === selected.id)}
          privateProfile={accessiblePrivate}
          close={() => setProfileOpen(false)}
          updated={updated}
          preview={Boolean(previewAccount)}
          previewStaff={account?.role === "staff"}
        />
      )}
      {staffOpen && displayAccount?.role === "staff" && (
        <aside className="detail-panel staff-workspace" aria-label="Staff workspace">
          <div className="detail-top">
            <span className="eyebrow">
              {previewAccount ? "SIMULATED STAFF PREVIEW" : "BLUE SCIENCE PARK STAFF"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close staff workspace"
              onClick={() => setStaffOpen(false)}
            >
              <X />
            </Button>
          </div>
          <h2>Member companies</h2>
          <label className="editor-field">
            Search companies
            <input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} />
          </label>
          <p>{reviews.filter((r) => r.status === "pending").length} pending profile reviews</p>
          {companyList
            .filter((c) => c.name.toLowerCase().includes(staffSearch.toLowerCase()))
            .map((c) => {
              const privateProfile = privateProfiles.find((p) => p.company_id === c.id);
              return (
                <div className="staff-company-row" key={c.id}>
                  <strong>{c.name}</strong>
                  <span className="review-status">
                    {privateProfile?.review_status ?? "Not reviewed"}
                  </span>
                  <small>
                    {privateProfile
                      ? `Updated ${new Date(privateProfile.updated_at).toLocaleDateString()}`
                      : "Baseline profile · Not yet updated"}
                  </small>
                  <small>
                    Source:{" "}
                    {publicProfiles.find((p) => p.company_id === c.id)?.provenance ??
                      "Illustrative demo baseline"}
                  </small>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      focus(c);
                      setStaffOpen(false);
                      setProfileOpen(true);
                    }}
                  >
                    Edit Profile / Send to Company
                    <ArrowUpRight />
                  </Button>
                </div>
              );
            })}
        </aside>
      )}
      {roleSwitch()}
      <AiAssistant
        key={account?.id ?? "guest"}
        company={focusedCompany ?? selected}
        onAction={applyAssistantAction}
        shifted={Boolean(detail)}
        open={chatOpen}
        setOpen={setChatOpen}
      />
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="detail-top">
              <span className="eyebrow">BLUE SCIENCE PARK</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close about"
                onClick={() => setHelp(false)}
              >
                <X />
              </Button>
            </div>
            <h2 id="about-title">A glimpse of what’s possible.</h2>
            <p>
              This is an interactive prototype. Companies, opportunity dates, and requirements are
              illustrative. Recommendations use shared expertise and selected interests, not live
              AI. Suggested collaborations are not confirmed partnerships.
            </p>
            <p>
              Authorised company profile changes are saved to your account. Saved opportunities last
              for this session only.
            </p>
            <Button onClick={() => setHelp(false)}>
              Back to exploring
              <ArrowRight />
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
