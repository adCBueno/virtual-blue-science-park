import {
  assistantService,
  authService,
  companyRepository,
  opportunityRepository,
  recommendationService,
  reviewService,
} from "./mock";

// The current client is fixture-backed. The future team adapter will call
// authenticated Start endpoints for remote reads and writes.
export const services = {
  assistantService,
  authService,
  companyRepository,
  opportunityRepository,
  recommendationService,
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
