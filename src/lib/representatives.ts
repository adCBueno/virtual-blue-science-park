import { useEffect, useRef, useState } from "react";
import users from "@/data/fixtures/users.json";
import type { Company } from "@/lib/ecosystem";
import { backendRepresentative } from "@/data/api/backend.functions";
import { backendState, readSession } from "@/data/api/store";

/**
 * Who receives an outreach email: the company's representative account.
 * Team-API mode asks the backend (BSP admin session only); demo mode uses the fixture users.
 */
export type Representative =
  | { state: "loading" }
  | { state: "found"; email: string; name?: string }
  | { state: "none" }
  | { state: "login" }
  | { state: "error"; message: string };

export const recipientLabels = {
  loading: "Looking up…",
  none: "No representative account",
  login: "Log in as BSP staff to see recipients",
} as const;

/** Demo mode only: the representative from the fixture users. */
function fixtureRepresentative(company: Pick<Company, "id">): Representative {
  const user = users.find((u) => u.role === "representative" && u.companyId === company.id);
  return user ? { state: "found", email: user.email, name: user.name } : { state: "none" };
}

export async function representativeFor(company: Pick<Company, "id">): Promise<Representative> {
  if (!backendState.enabled) return fixtureRepresentative(company);
  const session = readSession();
  if (!session || session.user.role !== "admin") return { state: "login" };
  try {
    const result = await backendRepresentative({
      data: { token: session.token, companyId: company.id },
    });
    if (result.status === "found") return { state: "found", email: result.email };
    if (result.status === "error") return { state: "error", message: result.message };
    return { state: result.status };
  } catch {
    return { state: "error", message: "Could not look up the representative." };
  }
}

/**
 * Looks up every listed company's representative in parallel, once per company for the
 * lifetime of the component (the panel), and returns the current state of each.
 */
export function useRepresentatives(companies: Pick<Company, "id">[]) {
  const cache = useRef(new Map<string, Representative>());
  const [, rerender] = useState(0);
  const ids = companies.map((c) => c.id).join(",");
  useEffect(() => {
    const missing = companies.filter((c) => !cache.current.has(c.id));
    if (!missing.length) return;
    for (const c of missing) cache.current.set(c.id, { state: "loading" });
    rerender((n) => n + 1);
    void Promise.all(
      missing.map(async (c) => {
        cache.current.set(c.id, await representativeFor(c));
        rerender((n) => n + 1);
      }),
    );
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  return (id: string): Representative => cache.current.get(id) ?? { state: "loading" };
}
