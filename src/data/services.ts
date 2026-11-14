import * as mock from "./mock";
import { apiAssistant, apiAuth, apiCompanies, apiReviews } from "./api/adapter";
import { backendState } from "./api/store";
import type { ProfileDraft } from "@/lib/account";
import type { PublishField } from "@/lib/profile-sections";

/**
 * One facade, two providers. With API_URL set on the server the app uses the team backend
 * (companies, profiles, opportunities, recommendations, login, profile edits); otherwise it
 * runs on the validated fixtures and browser-session mock services.
 */
const api = () => backendState.enabled;

const authService = {
  accountEmails: () => (api() ? apiAuth.accountEmails() : mock.authService.accountEmails()),
  currentUser: () => (api() ? apiAuth.currentUser() : mock.authService.currentUser()),
  /* The mock path stays synchronous (it throws right away); the API path returns a promise. */
  signIn: (email: string, password = ""): void | Promise<void> =>
    api() ? apiAuth.signIn(email, password) : mock.authService.signIn(email),
  signOut: (): void | Promise<void> => (api() ? apiAuth.signOut() : mock.authService.signOut()),
  reset: () => (api() ? apiAuth.reset() : mock.authService.reset()),
};

const companyRepository = {
  list: () => (api() ? apiCompanies.list() : mock.companyRepository.list()),
  get: (id: string) => (api() ? apiCompanies.get(id) : mock.companyRepository.get(id)),
  baselineProfiles: () =>
    api() ? apiCompanies.baselineProfiles() : mock.companyRepository.baselineProfiles(),
  publicProfiles: () =>
    api() ? apiCompanies.publicProfiles() : mock.companyRepository.publicProfiles(),
  privateProfiles: () =>
    api() ? apiCompanies.privateProfiles() : mock.companyRepository.privateProfiles(),
  save: (id: string, draft: ProfileDraft, fields: PublishField[]): void | Promise<void> =>
    api() ? apiCompanies.save(id, draft, fields) : mock.companyRepository.save(id, draft, fields),
};

const reviewService = {
  list: () => (api() ? apiReviews.list() : mock.reviewService.list()),
  resolveRecipient: (id: string) =>
    api() ? apiReviews.resolveRecipient(id) : mock.reviewService.resolveRecipient(id),
  request: (id: string) => (api() ? apiReviews.request(id) : mock.reviewService.request(id)),
};

/* With the team API, Blue always answers through POST /chat; the mock is only for demo mode. */
const assistantService = {
  reply: (input: Parameters<typeof mock.assistantService.reply>[0]) =>
    api() ? apiAssistant.reply(input as { question: string }) : mock.assistantService.reply(input),
};

export const services = {
  assistantService,
  authService,
  companyRepository,
  opportunityRepository: mock.opportunityRepository,
  recommendationService: mock.recommendationService,
  reviewService,
};
export type DataServices = typeof services;
export const {
  assistantService: assistant,
  authService: auth,
  companyRepository: company,
  opportunityRepository: opportunity,
  recommendationService: recommendation,
  reviewService: review,
} = services;
export { backendState };
