import { categories, type Category, type Company } from "@/lib/ecosystem";
import type { Tables } from "@/integrations/supabase/types";
import type { ProfileRecord } from "@/lib/profile-sections";
export type Account = { id: string; name: string; email: string; role: "staff" | "representative" | "unassigned"; companyId: string | null };
export type ProfileDraft = {
  name: string; description: string; interests: Category[]; technologies: string[]; priorities: string; private_notes: string;
  products_services: string; markets: string; geographical_focus: string; projects: string;
};
export function canEditCompany(account: Account | null, companyId: string) {
  return account?.role === "staff" || (account?.role === "representative" && account.companyId === companyId);
}
/** A draft always starts from what the company can currently see: its own private draft, else the published profile, else the demo baseline. */
export function draftFrom(company: Company, profile?: ProfileRecord, privateNotes = ""): ProfileDraft {
  return {
    name: profile?.name ?? company.name,
    description: profile?.description ?? company.description,
    interests: profile ? categories.filter(c => profile.interests.includes(c)) : company.interests,
    technologies: profile?.technologies ?? company.tags,
    priorities: profile?.priorities ?? "",
    private_notes: privateNotes,
    products_services: profile?.products_services ?? "",
    markets: profile?.markets ?? "",
    geographical_focus: profile?.geographical_focus ?? "",
    projects: profile?.projects ?? "",
  };
}
export function applyProfile(company: Company, profile: Tables<"company_public_profiles"> | Tables<"company_private_profiles"> | undefined): Company {
  return profile ? { ...company, name: profile.name, description: profile.description, interests: categories.filter(c => profile.interests.includes(c)), tags: profile.technologies } : company;
}
