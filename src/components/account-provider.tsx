import { createContext, useContext, useEffect, useCallback, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { accountWorkspace } from "@/lib/accounts.functions";
import type { Account } from "@/lib/account";
import type { Tables } from "@/integrations/supabase/types";
type AccountState = { account: Account | null; loading: boolean; error: string; privateProfiles: Tables<"company_private_profiles">[]; reviews: Tables<"profile_review_requests">[]; refresh: () => Promise<void>; signOut: () => Promise<void> };
const Context = createContext<AccountState | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [privateProfiles, setPrivateProfiles] = useState<Tables<"company_private_profiles">[]>([]);
  const [reviews, setReviews] = useState<Tables<"profile_review_requests">[]>([]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const fetchWorkspace = useServerFn(accountWorkspace);
  const clear = useCallback(() => { setAccount(null); setPrivateProfiles([]); setReviews([]); }, []);
  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { clear(); setLoading(false); return; }
    try {
      const workspace = await fetchWorkspace();
      setAccount({ id: user.id, email: user.email ?? "", name: workspace.name || user.email || "Account", role: workspace.role, companyId: workspace.companyId });
      setPrivateProfiles(workspace.privateProfiles); setReviews(workspace.reviews); setError("");
    } catch (err) { clear(); setError(err instanceof Error ? err.message : "Account details are unavailable."); }
    setLoading(false);
  }, [clear, fetchWorkspace]);
  useEffect(() => {
    void refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      if (event === "SIGNED_OUT") { clear(); setLoading(false); }
      router.invalidate();
      if (event !== "SIGNED_OUT") { queryClient.invalidateQueries(); setTimeout(() => { void refresh(); }, 0); }
    });
    return () => subscription.unsubscribe();
  }, [refresh, router, queryClient, clear]);
  const signOut = async () => { await queryClient.cancelQueries(); queryClient.clear(); clear(); await supabase.auth.signOut(); await router.navigate({ to: "/auth", replace: true }); };
  return <Context.Provider value={{ account, loading, error, privateProfiles, reviews, refresh, signOut }}>{children}</Context.Provider>;
}
export function useAccount() { const value = useContext(Context); if (!value) throw new Error("Account provider missing"); return value; }