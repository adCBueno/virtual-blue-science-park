import type { Company } from "@/lib/ecosystem";

/**
 * Each member company has exactly one representative account. Outreach goes to that account's
 * email — staff never type addresses by hand.
 *
 * BACKEND HOOK: replace `representativeFor` with a lookup of the company's representative account
 * (user_roles → auth user email) through an authenticated server function. Until then the demo
 * companies use clearly fictional addresses on the reserved `.example` domain.
 */
export type Representative = { companyId: string; name: string; email: string; simulated?: boolean };

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function representativeFor(company: Pick<Company, "id" | "name">): Representative | null {
  return { companyId: company.id, name: `${company.name} representative`, email: `representative@${slug(company.name)}.example`, simulated: true };
}
