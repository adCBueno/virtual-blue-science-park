import { z } from "zod/v4";
import {
  companySchema,
  companyProfileSchema,
  opportunitySchema,
  recommendationSchema,
} from "@/contracts/ecosystem";
import companyFixtures from "./fixtures/companies.json";
import profileFixtures from "./fixtures/company-profiles.json";
import opportunityFixtures from "./fixtures/opportunities.json";
import matchFixtures from "./fixtures/collaboration-matches.json";

export const catalogue = {
  companies: z.array(companySchema).parse(companyFixtures),
  profiles: z.array(companyProfileSchema).parse(profileFixtures),
  opportunities: z.array(opportunitySchema).parse(opportunityFixtures),
  matches: z.array(recommendationSchema).parse(matchFixtures),
};

const companyIds = new Set(catalogue.companies.map(({ id }) => id));
const opportunityIds = new Set(catalogue.opportunities.map(({ id }) => id));
const profileIds = new Set(catalogue.profiles.map(({ companyId }) => companyId));
if (
  companyIds.size !== catalogue.companies.length ||
  opportunityIds.size !== catalogue.opportunities.length ||
  profileIds.size !== catalogue.profiles.length ||
  profileIds.size !== companyIds.size ||
  [...profileIds].some((id) => !companyIds.has(id)) ||
  catalogue.matches.some(
    ({ companyId, target }) =>
      !companyIds.has(companyId) ||
      (target.kind === "opportunity"
        ? !opportunityIds.has(target.opportunityId)
        : target.targetCompanyId === companyId || !companyIds.has(target.targetCompanyId)),
  )
)
  throw new Error("Invalid ecosystem fixture references.");
