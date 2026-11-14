import users from "@/data/fixtures/users.json";
import type { Company } from "@/lib/ecosystem";

export function representativeFor(company: Pick<Company, "id" | "name">) {
  const user = users.find(
    (user) => user.role === "representative" && user.companyId === company.id,
  );
  return user
    ? { companyId: company.id, name: user.name, email: user.email, simulated: false }
    : null;
}
