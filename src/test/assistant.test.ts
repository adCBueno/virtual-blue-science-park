import { describe, expect, it } from "vitest";
import { detectIntent, greeting, ruleBasedReply, sourcesFor, suggestedQuestions, validateAction, type AssistantContext } from "@/lib/assistant";
import { companies } from "@/lib/ecosystem";

const context: AssistantContext = {
  visibility: "public",
  company: { id: "baltic", name: "Baltic Blue", industry: "Sustainable ocean energy", description: "Clean energy, powered by the sea.", tags: ["marine", "energy"], interests: ["Funding", "Events"] },
  sections: [
    { key: "about", label: "About the Company", body: "Clean energy, powered by the sea.", status: "inferred", source: "AI-generated baseline", retrieved_at: "2026-11-13" },
    { key: "geography", label: "Geographical Focus", body: "Baltic Sea.", status: "source", source: "Blue Science Park member location", url: "https://www.bluesciencepark.se/", retrieved_at: "2026-11-13" },
  ],
  opportunities: [
    { id: "ocean-funding", title: "Blue economy innovation call", category: "Funding", summary: "Funding pathways for ocean technologies.", date: "Demo deadline · 22 January 2027", source: "Horizon Europe", url: "https://research-and-innovation.ec.europa.eu/", score: 87 },
    { id: "marine-event", title: "Marine Innovation Day", category: "Events", summary: "A meeting point for marine technology.", date: "Demo event · 11 February 2027", source: "Blue Science Park", url: "https://www.bluesciencepark.se/", score: 84 },
  ],
  collaborators: [{ id: "ocean", name: "Ocean Collective", industry: "Marine technology", description: "Autonomous ocean monitoring.", shared: ["marine", "sustainability"] }],
};

describe("assistant guardrails", () => {
  it("accepts only categories the universe can actually filter", () => {
    expect(validateAction({ kind: "filter", category: "Funding" }, context)).toEqual({ kind: "filter", category: "Funding" });
    expect(validateAction({ kind: "filter", category: "Homework" }, context)).toEqual({ kind: "none" });
  });
  it("drops highlights for opportunities and companies the user is not allowed to see", () => {
    const action = validateAction({ kind: "highlight", opportunityIds: ["ocean-funding", "secret-row"], companyIds: ["ocean", "nord"] }, context);
    expect(action).toEqual({ kind: "highlight", opportunityIds: ["ocean-funding"], companyIds: ["ocean"] });
  });
  it("refuses to focus a company that is not in the supplied context", () => {
    expect(validateAction({ kind: "focus", companyId: "nord" }, context)).toEqual({ kind: "none" });
    expect(validateAction({ kind: "focus", companyId: "ocean" }, context)).toEqual({ kind: "focus", companyId: "ocean" });
  });
  it("ignores malformed actions", () => {
    expect(validateAction("filter everything", context)).toEqual({ kind: "none" });
    expect(validateAction({ kind: "highlight" }, context)).toEqual({ kind: "none" });
  });
  it("names the funding intent and answers with the company's own opportunities", () => {
    expect(detectIntent("What funding opportunities are relevant?")).toBe("Funding");
    const reply = ruleBasedReply("Show me funding opportunities for Baltic Blue.", context);
    expect(reply.answer).toContain("Blue economy innovation call");
    expect(reply.action).toEqual({ kind: "highlight", opportunityIds: ["ocean-funding"], companyIds: [] });
    expect(reply.simulated).toBe(true);
  });
  it("answers collaborator questions with suggested companies, never confirmed partnerships", () => {
    const reply = ruleBasedReply("Which companies could Baltic Blue collaborate with?", context);
    expect(reply.answer).toContain("Ocean Collective");
    expect(reply.answer).toContain("not confirmed partnerships");
    expect(reply.action).toEqual({ kind: "highlight", opportunityIds: [], companyIds: ["ocean"] });
  });
  it("shows sources taken from the data, including the retrieval link", () => {
    const sources = sourcesFor(context, { kind: "highlight", opportunityIds: ["ocean-funding"], companyIds: ["ocean"] });
    expect(sources[0]).toEqual({ label: "Horizon Europe · Blue economy innovation call", url: "https://research-and-innovation.ec.europa.eu/" });
    expect(sources[1]?.label).toContain("Ocean Collective");
    expect(sourcesFor(context, { kind: "none" })[0]?.url).toBe("https://www.bluesciencepark.se/");
  });
  it("suggests questions for the company in focus and for the whole park", () => {
    expect(suggestedQuestions(context.company)[0]).toContain("Baltic Blue");
    expect(suggestedQuestions(null)).toEqual(["Explore member companies", "Discover innovation opportunities", "Find potential collaborations"]);
  });
  it("greets visitors as Blue, naming the company in focus when there is one", () => {
    expect(greeting("Baltic Blue")).toBe("Hi! I'm Blue, your innovation companion. Want to explore Baltic Blue's opportunities?");
    expect(greeting(null)).toBe("Hi! I'm Blue. Let's discover what's happening across the Science Park!");
  });
  it("introduces Blue when the visitor has nothing selected yet", () => {
    const reply = ruleBasedReply("What can you do?", { ...context, company: null });
    expect(reply.answer).toContain("I'm Blue");
    expect(reply.action).toEqual({ kind: "none" });
  });
});
