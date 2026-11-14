import { createContext, useContext, useEffect, useCallback, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  auth as authService,
  company as companyRepository,
  review as reviewService,
} from "@/data/services";
import { profileRecord } from "@/data/mock";

function snapshot() {
  const reviews = reviewService.list();
  return {
    account: authService.currentUser(),
    publicProfiles: companyRepository.publicProfiles().map((profile) => ({
      ...profileRecord(profile),
      provenance: Object.keys(profile.evidence).length
        ? "Company-provided information"
        : "Imported profile",
    })),
    privateProfiles: companyRepository.privateProfiles().map((profile) => ({
      ...profileRecord(profile),
      private_notes: profile.privateNotes ?? "",
      review_status: reviews.some(
        (review) => review.companyId === profile.companyId && review.status === "pending",
      )
        ? "Sent for review"
        : "Not reviewed",
      updated_at: profile.updatedAt ?? "",
    })),
    reviews,
  };
}

type AccountState = ReturnType<typeof snapshot> & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<AccountState | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<ReturnType<typeof snapshot>>(() => ({
    ...snapshot(),
    account: null,
    privateProfiles: [],
    reviews: [],
    publicProfiles: companyRepository.baselineProfiles().map((profile) => ({
      ...profileRecord(profile),
      provenance: "Imported profile",
    })),
  }));
  const router = useRouter();
  const refresh = useCallback(async () => {
    setWorkspace(snapshot());
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const signOut = async () => {
    authService.signOut();
    await refresh();
    await router.navigate({ to: "/auth", replace: true });
  };
  return <Context.Provider value={{ ...workspace, refresh, signOut }}>{children}</Context.Provider>;
}

export function useAccount() {
  const value = useContext(Context);
  if (!value) throw new Error("Account provider missing");
  return value;
}
