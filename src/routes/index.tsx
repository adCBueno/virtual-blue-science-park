import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, CalendarDays, Check, ChevronDown, CircleHelp, ExternalLink, FlaskConical, Globe2, Handshake, Layers3, MapPin, Maximize, Minus, Network, Plus, Search, Settings2, SlidersHorizontal, Sparkles, Users, Wallet, Waves, X, Zap, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { companies, categories, collaborators, recommendations, opportunities as opportunityCatalog, fitLabel, type Company, type Opportunity, type Category, type Sector } from "@/lib/ecosystem";
import logo from "@/assets/bsp-logo.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/account-provider";
import { CompanyEditor } from "@/components/company-editor";
import { CompanyProfilePanel } from "@/components/company-profile-panel";
import { AiAssistant } from "@/components/ai-assistant";
import { ExportMenu } from "@/components/export-menu";
import { OpportunityMatchPanel } from "@/components/opportunity-match-panel";
import { ActionBriefCard } from "@/components/action-brief-card";
import { ImpactReports } from "@/components/impact-reports";
import { StaffBriefing } from "@/components/staff-briefing";
import { WeeklyDigest } from "@/components/weekly-digest";
import { SendEmailButton, type EmailViewer } from "@/components/send-email-dialog";
import { buildReport, type ReportAudience } from "@/lib/report";
import { applyProfile, canEditCompany, type Account } from "@/lib/account";
import type { AssistantAction } from "@/lib/assistant";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Explore the Universe · Blue Science Park" },
    { name: "description", content: "Explore companies, discover relevant opportunities, and find complementary expertise in the Blue Science Park innovation ecosystem." },
    { property: "og:title", content: "Explore the Universe · Blue Science Park" },
    { property: "og:description", content: "A living ecosystem of companies and innovation opportunities. Find your next connection." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const icons = { Funding: Wallet, Events: CalendarDays, Workshops: Zap, Networking: Users, Testing: FlaskConical, Collaborations: Handshake };
type ScoredOpportunity = Opportunity & { score: number };
type Connection = ReturnType<typeof collaborators>[number];
type Detail = { kind: "opportunity"; item: ScoredOpportunity } | { kind: "connection"; item: Connection };
const slots = [{ x: 31, y: 22 }, { x: 71, y: 26 }, { x: 79, y: 61 }, { x: 53, y: 83 }, { x: 20, y: 67 }, { x: 16, y: 40 }];
// Mobile focused view: all connected nodes at once, arranged radially around the centre company.
function phoneNodeSlot(index: number, total: number) {
  if (total <= 1) return { x: 50, y: 16 };
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  const rx = total <= 3 ? 30 : 32;
  const ry = total <= 3 ? 32 : 34;
  return { x: 50 + rx * Math.cos(angle), y: 50 + ry * Math.sin(angle) };
}
const phoneCompanies = [{ x: 23, y: 10 }, { x: 77, y: 10 }, { x: 23, y: 34 }, { x: 77, y: 34 }, { x: 23, y: 64 }, { x: 77, y: 64 }, { x: 23, y: 88 }];

function CompanyMark({ company }: { company: Company }) {
  return <span className={`company-mark mark-${company.mark}`} aria-hidden="true">{company.id === "nord" ? <><span className="nord-symbol">n</span><small>nord</small></> : company.id === "ocean" ? <><Waves /><small>ocean</small></> : company.id === "aether" ? <><span className="aether-symbol">a.</span><small>AETHER AI</small></> : company.id === "modul" ? <><Layers3 /><small>modul</small></> : company.id === "baltic" ? <><Waves /><small>baltic blue</small></> : company.id === "pulse" ? <><span className="pulse-symbol">p<span>+</span></span><small>pulse health</small></> : <><Network /><small>connective</small></>}</span>;
}

function Index() {
  const isMobile = useIsMobile();
  const { account, privateProfiles, reviews, refresh, signOut, error: accountError } = useAccount();
  const [publicProfiles, setPublicProfiles] = useState<Tables<"company_public_profiles">[]>([]);
  const [previewRole, setPreviewRole] = useState<"guest" | "representative" | "staff">("guest");
  const [opportunitySearch, setOpportunitySearch] = useState("");
  const previewAccount: Account | null = import.meta.env.DEV && !account && previewRole !== "guest" ? { id: "demo", name: "Demo preview", email: "", role: previewRole, companyId: previewRole === "representative" ? "nord" : null } : null;
  const displayAccount = account ?? previewAccount;
  const refreshPublic = async () => { const { data, error } = await supabase.from("company_public_profiles").select("*"); if (!error) setPublicProfiles(data ?? []); };
  useEffect(() => { void refreshPublic(); }, []);
  const companyList = companies.map(c => applyProfile(c, publicProfiles.find(p => p.company_id === c.id)));
  const [selected, setSelected] = useState<Company | null>(null);
  const [sector, setSector] = useState<Sector>("All sectors");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [matchFor, setMatchFor] = useState<Opportunity | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [focusTab, setFocusTab] = useState<"map" | "info">("map");
  const [chatOpen, setChatOpen] = useState(false);
  const [highlight, setHighlight] = useState<{ opportunityIds: string[]; companyIds: string[] }>({ opportunityIds: [], companyIds: [] });
  const [view, setView] = useState<"universe" | "opportunities" | "reports" | "briefing">("universe");
  const [saved, setSaved] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [help, setHelp] = useState(false);
  const accessiblePrivate = selected && canEditCompany(account, selected.id) ? privateProfiles.find(p => p.company_id === selected.id) : undefined;
  const focusedCompany = selected ? applyProfile(companyList.find(c => c.id === selected.id) ?? selected, accessiblePrivate) : null;
  const interests = focusedCompany ? focusedCompany.interests : [];
  const matches = focusedCompany ? recommendations(focusedCompany, interests, category) : [];
  const connections = selected ? collaborators(selected) : [];
  const boostedOpportunities = matches.filter(o => highlight.opportunityIds.includes(o.id));
  const visibleOpportunities = [...boostedOpportunities, ...matches.filter(o => !highlight.opportunityIds.includes(o.id))].slice(0, category === "All" ? 4 : 6);
  const boostedConnections = connections.filter(c => highlight.companyIds.includes(c.id));
  const visibleConnections = selected && (category === "All" || category === "Collaborations") ? [...boostedConnections, ...connections.filter(c => !highlight.companyIds.includes(c.id))] : [];
  const nodes = [...visibleOpportunities.map(item => ({ kind: "opportunity" as const, item })), ...visibleConnections.map(item => ({ kind: "connection" as const, item }))].slice(0, 6);
  const shownNodes = nodes;
  const nodeSlot = (index: number, priority: boolean) => {
    if (isMobile) return phoneNodeSlot(index, nodes.length);
    const slot = slots[index];
    if (!slot) return undefined;
    return priority ? { x: 50 + (slot.x - 50) * 0.82, y: 50 + (slot.y - 50) * 0.82 } : slot;
  };
  const companySlot = (company: Company, index: number) => isMobile ? (phoneCompanies[index] ?? company) : company;
  const visibleCompanies = companyList.filter(c => (sector === "All sectors" || c.sector === sector) && `${c.name} ${c.industry} ${c.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const focus = (company: Company) => { setSelected(company); setDetail(null); setCategory("All"); setZoom(1); setView("universe"); setEditing(false); setFocusTab("map"); setHighlight({ opportunityIds: [], companyIds: [] }); };
  const back = () => { setSelected(null); setDetail(null); setCategory("All"); setView("universe"); setZoom(1); setEditing(false); setFocusTab("map"); setHighlight({ opportunityIds: [], companyIds: [] }); };
  const openMyCompany = () => { const own = companyList.find(c => c.id === displayAccount?.companyId); if (own) { focus(own); if (isMobile) setEditing(true); else setProfileOpen(true); } };
  const applyAssistantAction = (action: AssistantAction) => {
    if (action.kind === "filter") { setCategory(action.category); setHighlight({ opportunityIds: [], companyIds: [] }); }
    if (action.kind === "focus") { const target = companyList.find(c => c.id === action.companyId); if (target) focus(target); }
    if (action.kind === "highlight") { setHighlight({ opportunityIds: action.opportunityIds, companyIds: action.companyIds }); setView("universe"); }
  };
  useEffect(() => { if (account?.role === "representative" && account.companyId) { const own = companies.find(c => c.id === account.companyId); if (own) setSelected(own); } }, [account?.id]);
  useEffect(() => { if (!account) { setProfileOpen(false); setSaved([]); setEditing(false); } }, [account?.id]);
  const updated = async () => { await refresh(); await refreshPublic(); };
  const allOpportunities = (selected ? matches : displayAccount?.role === "staff" ? opportunityCatalog.filter(o => category === "All" || o.category === category).map(o => ({ ...o, score: 0 })) : recommendations(companies[0], [], category)).filter(o => `${o.title} ${o.category} ${o.source}`.toLowerCase().includes(opportunitySearch.toLowerCase()));
  /* Export + "Send as email": one report builder so the file, the email and the screen always agree. */
  const audience: ReportAudience = displayAccount?.role === "staff" ? "staff" : displayAccount?.role === "representative" ? "representative" : "public";
  const reportFor = (c: Company | null) => {
    if (!c) return buildReport({ company: null, opportunities: opportunityCatalog, companies: companyList, audience });
    const target = focusedCompany && focusedCompany.id === c.id ? focusedCompany : c;
    return buildReport({ company: target, opportunities: recommendations(target, target.interests), connections: collaborators(target), audience });
  };
  const emailViewer: EmailViewer = { audience, name: displayAccount?.name ?? "", companyId: displayAccount?.companyId ?? null };
  const canEmail = audience !== "public";
  const shareActions = (placement = "") => <span className={`share-actions ${placement}`}><ExportMenu compact={isMobile} getReport={() => reportFor(view === "opportunities" ? selected : focusedCompany)} />{canEmail && <SendEmailButton live={Boolean(account)} compact={isMobile} companies={companyList} initialCompanyId={selected?.id ?? null} viewer={emailViewer} reportFor={reportFor} />}</span>;
  const roleSwitch = (placement = "") => import.meta.env.DEV && !account ? <label className={`demo-role-switch ${placement}`}>Demo role preview<select aria-label="Demo role preview" value={previewRole} onChange={e => { setPreviewRole(e.target.value as typeof previewRole); setProfileOpen(false); }}><option value="guest">Public visitor</option><option value="representative">Company representative</option><option value="staff">Park staff</option></select><small>Simulated · no real permissions</small></label> : null;

  return <div className={`app-shell fullscreen-ecosystem ${view !== "universe" ? "directory-view" : ""} ${selected ? "company-focused" : ""} ${editing ? "profile-editing" : ""} ${chatOpen ? "chat-open" : ""}`}>
    <header className="topbar">
      <a href="/" className="brand" aria-label="Blue Science Park home"><img src={logo.url} alt="Blue Science Park Karlskrona" /></a>
      <span className="brand-divider" /><span className="product-name">Virtual Science Park</span>
      <nav className="main-nav" aria-label="Main navigation">
        <Button variant="nav" data-active={view === "universe"} onClick={() => setView("universe")}><Globe2 />Universe</Button>
        <Button variant="nav" data-active={view === "opportunities"} onClick={() => setView("opportunities")}><Sparkles />Opportunities</Button>
        {displayAccount?.role === "representative" && <Button variant="nav" onClick={openMyCompany}><Settings2 />My Company</Button>}
        {displayAccount?.role === "staff" && <Button variant="nav" data-active={view === "briefing"} onClick={() => { setView("briefing"); setDetail(null); setMatchFor(null); setSelected(null); }}><Newspaper />Briefing</Button>}
        {displayAccount?.role === "staff" && <Button variant="nav" data-active={view === "reports"} onClick={() => { setView("reports"); setDetail(null); setMatchFor(null); }}><Layers3 />Reports</Button>}
      </nav>
      <div className="account">{account ? <><span className="account-label">{account.name}<small>{account.role === "staff" ? "Blue Science Park Staff" : account.role === "representative" ? "Company Representative" : "Account awaiting assignment"}</small></span><Button variant="nav" onClick={() => void signOut()}>Log Out</Button></> : <Button variant="nav" asChild><Link to="/auth">Log In<ArrowUpRight /></Link></Button>}</div>
    </header>

    <main className="main-content">
      <div className="page-heading">
        <div><div className="eyebrow"><span /> THE BLUE SCIENCE PARK ECOSYSTEM</div><h1>{view === "briefing" ? "What happened in the park." : view === "reports" ? "From suggestion to outcome." : view === "opportunities" ? "A world of opportunity." : selected ? "Your next connection starts here." : "Great ideas don’t grow alone."}</h1><p>{selected ? `Explore the people and possibilities around ${selected.name}.` : "Discover companies, connect expertise, and find what’s next."}</p></div>
        <div className="ecosystem-location"><MapPin size={15} /> Karlskrona, Sweden <span className="live-status"><span /> A living ecosystem</span></div>
      </div>

      <section className={`universe-section ${selected ? "is-focused" : ""}`} aria-label="Interactive innovation ecosystem">
        {view !== "reports" && view !== "briefing" && <div className="universe-toolbar">
          <div className="toolbar-left">{selected ? <Button variant="ghost" onClick={back} className="back-button"><ArrowLeft />Back to Universe</Button> : <><label className="search-field"><Search size={17} /><input aria-label="Search companies" placeholder="Search the ecosystem" value={search} onChange={e => setSearch(e.target.value)} /><span>⌕</span></label><label className="sector-select"><SlidersHorizontal size={15} /><select aria-label="Filter by sector" value={sector} onChange={e => setSector(e.target.value as Sector)}>{["All sectors", "Marine technology", "Digital solutions", "Industry & engineering"].map(s => <option key={s}>{s}</option>)}</select><ChevronDown size={14} /></label></> }</div>
          <div className="toolbar-right">{view === "universe" && shareActions()}<span className="company-count">{selected ? `${matches.length + connections.length} relevant connections` : `${visibleCompanies.length} companies in your universe`}</span><Button variant="tool" size="icon" aria-label="About this prototype" title="About this prototype" onClick={() => setHelp(true)}><CircleHelp /></Button></div>
        </div>}

        {isMobile && selected && view === "universe" && <div className="mobile-focus-head">
          <span className="eyebrow">COMPANY IN FOCUS</span>
          <h2>{focusedCompany?.name ?? selected.name}</h2>
          <span className="industry-label">{selected.industry}</span>
          {roleSwitch("focus-role-switch")}
          <div className="focus-tabs" role="tablist" aria-label="Company view">
            <button type="button" role="tab" aria-selected={focusTab === "map"} data-active={focusTab === "map"} onClick={() => setFocusTab("map")}>Map</button>
            <button type="button" role="tab" aria-selected={focusTab === "info"} data-active={focusTab === "info"} onClick={() => { setFocusTab("info"); setDetail(null); }}>Company Info</button>
          </div>
        </div>}


        {view === "briefing" && displayAccount?.role === "staff" ? <StaffBriefing companies={companyList} opportunities={opportunityCatalog} staffName={displayAccount.name} profileChanges={[...privateProfiles.map(p => ({ companyId: p.company_id, at: p.updated_at, label: `Profile draft updated (${p.review_status})` })), ...reviews.filter(r => r.status === "Pending").map(r => ({ companyId: r.company_id, at: r.created_at, label: "Profile sent for company review" }))]} onOpenCompany={c => focus(c)} /> : view === "reports" && displayAccount?.role === "staff" ? <ImpactReports companies={companyList} opportunities={opportunityCatalog} /> : view === "opportunities" ? <div className="opportunity-directory"><div className="directory-heading"><div><span className="eyebrow">CURATED POSSIBILITIES</span><h2>{selected ? `For ${selected.name}` : "Explore opportunities"}</h2></div><div className="directory-tools">{shareActions("directory-share")}<span className="demo-label">Illustrative demo opportunities</span></div></div><label className="editor-field opportunity-search">Search opportunities<input aria-label="Search opportunities" value={opportunitySearch} onChange={e => setOpportunitySearch(e.target.value)} /></label><div className="directory-grid">{allOpportunities.map(item => { const Icon = icons[item.category]; return <Button variant="ghost" className="opportunity-card" key={item.id} onClick={() => { if (displayAccount?.role === "staff") { setDetail(null); setMatchFor(item); return; } if (!selected) setSelected(companies[0]); setDetail({ kind: "opportunity", item }); }}><span className={`category-icon category-${item.category.toLowerCase()}`}><Icon /></span><span className="opportunity-card-content"><small>{item.category} · {item.source}</small><strong>{item.title}</strong><span>{item.date}</span>{displayAccount?.role === "staff" && <span className="card-match-hint">Find companies that fit →</span>}</span><ArrowUpRight /></Button>; })}</div></div> : <div className={`ecosystem-space ${isMobile && selected ? (focusTab === "info" ? "show-info" : "show-map") : ""}`}>
          {selected && <CompanyProfilePanel company={focusedCompany ?? selected} profile={publicProfiles.find(p => p.company_id === selected.id)} privateProfile={accessiblePrivate} canEdit={canEditCompany(displayAccount, selected.id)} isStaff={displayAccount?.role === "staff"} preview={Boolean(previewAccount)} previewStaff={previewAccount?.role === "staff"} editing={editing} setEditing={setEditing} updated={updated} pendingReview={reviews.some(r => r.company_id === selected.id && r.status === "Pending")} onClose={back}  digest={<WeeklyDigest company={focusedCompany ?? selected} companies={companyList} saved={saved} onToggleSave={id => setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])} onOpen={item => { setDetail({ kind: "opportunity", item }); setChatOpen(false); if (isMobile) setFocusTab("map"); }} onFocusCompany={focus} />} />}

          <div className={`graph-stage zoom-${zoom}`}>
            <svg className="connection-map" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              <ellipse className="orbit-ring ring-one" cx="500" cy="310" rx="190" ry="135" /><ellipse className="orbit-ring ring-two" cx="500" cy="310" rx="335" ry="233" /><ellipse className="orbit-ring ring-three" cx="500" cy="310" rx="465" ry="305" />
              {!selected ? visibleCompanies.map((company, index) => { const c = companySlot(company, index); return <g key={company.id}><path className="company-line" d={`M 500 310 Q ${(c.x * 10 + 500) / 2 + 30} ${(c.y * 6.2 + 310) / 2 - 40} ${c.x * 10} ${c.y * 6.2}`} /><circle className="connection-dot" cx={(c.x * 10 + 500) / 2} cy={(c.y * 6.2 + 310) / 2 - 20} r="3" /></g>; }) : shownNodes.map((node, index) => { const slot = nodeSlot(index, node.kind === "opportunity" && interests.includes(node.item.category)); if (!slot) return null; const { x, y } = slot; return <path key={node.item.id} className={`company-line focused-line ${detail?.item.id === node.item.id ? "selected-line" : ""} ${node.kind === "connection" ? "suggested-line" : ""}`} d={`M 500 310 Q ${(x * 10 + 500) / 2 + 25} ${(y * 6.2 + 310) / 2 - 20} ${x * 10} ${y * 6.2}`} />; })}
            </svg>

            <div className={`ecosystem-centre ${selected ? "focused-centre" : ""}`}>
              <div className="centre-disc">{selected ? <CompanyMark company={selected} /> : <div className="park-symbol"><span /><span /><span /><span /><span /><span /></div>}</div>
              <strong>{selected ? selected.name : "Blue Science Park"}</strong><span>{selected ? "YOUR INNOVATION ECOSYSTEM" : "WHERE POSSIBILITIES CONNECT"}</span>
              {!selected && <span className="centre-live"><span /> Connected by possibility</span>}
            </div>

            {!selected ? visibleCompanies.map((company, index) => <div key={company.id} className={`positioned-node company-position tone-${company.tone}`} style={{ "--node-x": `${companySlot(company, index).x}%`, "--node-y": `${companySlot(company, index).y}%`, "--float-delay": `${index * -0.8}s` } as React.CSSProperties}>
              <Button variant="node" className="company-node" aria-label={`Explore ${company.name}`} onClick={() => focus(company)}><CompanyMark company={company} /><span className="node-open"><ArrowUpRight size={13} /></span></Button><span className="node-company-name">{company.name}</span><span className="node-industry">{company.industry}</span><span className="company-hover">Explore company <ArrowRight size={12} /></span>
            </div>) : shownNodes.map((node, index) => {
              const prominent = node.kind === "opportunity" && interests.includes(node.item.category);
              const slot = nodeSlot(index, prominent);
              if (!slot) return null;
              const lit = node.kind === "opportunity" ? highlight.opportunityIds.includes(node.item.id) : highlight.companyIds.includes(node.item.id);
              const Icon = node.kind === "opportunity" ? icons[node.item.category] : Handshake;
              return <div key={node.item.id} className={`positioned-node opportunity-position ${prominent ? "is-priority" : ""} ${lit ? "is-highlighted" : ""} ${detail?.item.id === node.item.id ? "node-selected" : ""}`} style={{ "--node-x": `${slot.x}%`, "--node-y": `${slot.y}%`, "--float-delay": `${index * -1.2}s` } as React.CSSProperties}>
                <Button variant="node" className={`opportunity-node ${node.kind === "opportunity" ? `category-${node.item.category.toLowerCase()}` : "category-collaborations"}`} aria-label={node.kind === "opportunity" ? `View ${node.item.title}` : `Explore collaboration with ${node.item.name}`} onClick={() => { setDetail(node); setChatOpen(false); }}><Icon />{prominent && <span className="priority-spark"><Sparkles size={11} /></span>}</Button><span className="node-category">{node.kind === "opportunity" ? node.item.category : "Suggested collaboration"}</span><span className="opportunity-title">{node.kind === "opportunity" ? node.item.title : node.item.name}</span><span className="opportunity-preview">{node.kind === "opportunity" ? `${fitLabel(node.item.score)} · ${node.item.source}` : `${node.item.shared.length} shared areas of expertise`}</span>
              </div>;
            })}
            {!selected && visibleCompanies.length === 0 && <div className="empty-results"><Search /><h3>No companies found</h3><p>Try another name, expertise, or sector.</p><Button variant="outline" onClick={() => { setSearch(""); setSector("All sectors"); }}>Clear filters</Button></div>}
          </div>

          {!selected && <div className="canvas-caption"><span className="caption-line" /><span>Independent ideas. Shared possibilities.</span></div>}
          {selected && !detail && <div className="recommendation-note"><Sparkles size={16} /><span>Matched to your expertise<span>{interests.length ? `Prioritising ${interests.join(" & ").toLowerCase()}` : "A balanced mix of possibilities"}</span></span><span className="demo-label">Demo matching</span></div>}
          <div className="canvas-tools"><span className="zoom-label">{Math.round(zoom * 100)}%</span><Button variant="tool" size="icon" aria-label="Zoom out" title="Zoom out" disabled={zoom === 0.85} onClick={() => setZoom(z => Math.max(0.85, +(z - 0.15).toFixed(2)))}><Minus /></Button><Button variant="tool" size="icon" aria-label="Zoom in" title="Zoom in" disabled={zoom === 1.3} onClick={() => setZoom(z => Math.min(1.3, +(z + 0.15).toFixed(2)))}><Plus /></Button><span /><Button variant="tool" size="icon" aria-label="Reset view" title="Reset view" onClick={() => setZoom(1)}><Maximize /></Button></div>
        </div>}

        <div className="universe-footer"><div className="legend"><span><i className="legend-company" />Companies</span><span><i className="legend-opportunity" />Opportunities</span><span><i className="legend-connection" />Suggested connections</span></div><span className="powered-by"><Sparkles size={13} /> Powered by shared ambition</span></div>
      </section>

    </main>

    {detail && selected && <aside className="detail-panel" aria-label="Connection details"><div className="detail-top"><span className="eyebrow">{detail.kind === "opportunity" ? "YOUR NEXT OPPORTUNITY" : "A POTENTIAL CONNECTION"}</span><Button variant="ghost" size="icon" aria-label="Close details" onClick={() => setDetail(null)}><X /></Button></div>
      {detail.kind === "opportunity" ? <><span className={`detail-icon category-${detail.item.category.toLowerCase()}`}>{(() => { const Icon = icons[detail.item.category]; return <Icon />; })()}</span><span className="detail-category">{detail.item.category}<span>{fitLabel(detail.item.score)}</span></span><h2>{detail.item.title}</h2><p>{detail.item.summary}</p><div className="why-match"><Sparkles size={17} /><div><h3>Why it’s relevant to {selected.name}</h3><p>Your expertise in {detail.item.tags.filter(t => selected.tags.includes(t)).join(" and ")} aligns with this opportunity.{interests.includes(detail.item.category) ? ` It also matches your ${detail.item.category.toLowerCase()} priority.` : " It opens a complementary path for your next stage of growth."}</p></div></div><dl><div><dt><CalendarDays size={15} />Date</dt><dd>{detail.item.date}</dd></div><div><dt><Globe2 size={15} />Source</dt><dd>{detail.item.source}</dd></div><div><dt><Check size={15} />Requirements</dt><dd>{detail.item.requirements}</dd></div></dl><ActionBriefCard opportunity={detail.item} /><span className="detail-demo">Thematic fit, not eligibility: check the requirements at the source. Illustrative demo listing — dates and requirements are not verified; source links lead to the organisation’s website.</span><Button asChild className="source-button"><a href={detail.item.url} target="_blank" rel="noreferrer">Visit information source<ExternalLink /></a></Button><Button variant="outline" onClick={() => setSaved(s => s.includes(detail.item.id) ? s.filter(id => id !== detail.item.id) : [...s, detail.item.id])}>{saved.includes(detail.item.id) ? <Check /> : <Bookmark />}{saved.includes(detail.item.id) ? "Saved for this session" : "Save opportunity"}</Button>{displayAccount?.role === "staff" && <Button variant="outline" onClick={() => { setMatchFor(detail.item); setDetail(null); }}><Users />Find all companies that fit</Button>}</> : <><div className={`collaborator-mark tone-${detail.item.tone}`}><CompanyMark company={detail.item} /></div><span className="suggested-badge"><Sparkles size={12} />Suggested · Not a confirmed partnership</span><h2>{selected.name}<span className="connection-pair"><ArrowRight />{detail.item.name}</span></h2><p>{detail.item.description}</p><div className="why-match"><Handshake size={19} /><div><h3>Complementary by nature</h3><p>Both companies work with {detail.item.shared.join(" and ")}. {selected.name} brings {selected.industry.toLowerCase()} expertise, while {detail.item.name} adds {detail.item.industry.toLowerCase()} capabilities.</p></div></div><h3 className="detail-subheading">What you could build together</h3><p>A joint pilot combining your technology with {detail.item.name}’s expertise. Start with a shared validation challenge, exchange data and insights, and explore a co-developed prototype.</p><h3 className="detail-subheading">Why this connection is suggested</h3><p>Demo matching identified {detail.item.shared.length} shared expertise areas and complementary specialisms. This is a rule-based suggestion, not a live AI recommendation.</p><Button onClick={() => focus(detail.item)}>Explore {detail.item.name}<ArrowUpRight /></Button></>}
      <Button variant="ghost" className="return-link" onClick={() => setDetail(null)}><ArrowLeft />Return to company ecosystem</Button>
    </aside>}

    {matchFor && displayAccount?.role === "staff" && <OpportunityMatchPanel key={matchFor.id} live={Boolean(account)} opportunity={matchFor} companies={companyList} sender={displayAccount.name} onClose={() => setMatchFor(null)} onFocusCompany={c => { setMatchFor(null); focus(c); }} />}
    {profileOpen && selected && <CompanyEditor key={selected.id} company={focusedCompany ?? selected} profile={publicProfiles.find(p => p.company_id === selected.id)} privateProfile={accessiblePrivate} close={() => setProfileOpen(false)} updated={updated} preview={Boolean(previewAccount)} previewStaff={previewAccount?.role === "staff"} />}
    {roleSwitch()}
    <AiAssistant company={focusedCompany ?? selected} onAction={applyAssistantAction} shifted={Boolean(detail || matchFor)} open={chatOpen} setOpen={setChatOpen} />
    {accountError && <div role="alert" className="account-error">{accountError}</div>}
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={e => e.stopPropagation()}><div className="detail-top"><span className="eyebrow">BLUE SCIENCE PARK</span><Button variant="ghost" size="icon" aria-label="Close about" onClick={() => setHelp(false)}><X /></Button></div><h2 id="about-title">A glimpse of what’s possible.</h2><p>This is an interactive prototype. Companies, opportunity dates, and requirements are illustrative. Recommendations use shared expertise and selected interests, not live AI. Suggested collaborations are not confirmed partnerships.</p><p>Authorised company profile changes are saved to your account. Saved opportunities last for this session only.</p><Button onClick={() => setHelp(false)}>Back to exploring<ArrowRight /></Button></section></div>}
  </div>;
}
