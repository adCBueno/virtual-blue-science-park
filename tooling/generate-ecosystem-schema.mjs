import { writeFileSync } from "node:fs";
import { z } from "zod/v4";
import {
  chatMessageSchema,
  chatRequestSchema,
  chatResponseSchema,
  companyProfileSchema,
  companySchema,
  evidenceSchema,
  opportunitySchema,
  privateCompanyProfileSchema,
  profileReviewRequestSchema,
  recommendationSchema,
  userSchema,
} from "../src/contracts/ecosystem.ts";

const schemas = {
  Company: companySchema,
  CompanyProfile: companyProfileSchema,
  PrivateCompanyProfile: privateCompanyProfileSchema,
  ProfileEvidence: evidenceSchema,
  Opportunity: opportunitySchema,
  Recommendation: recommendationSchema,
  User: userSchema,
  ProfileReviewRequest: profileReviewRequestSchema,
  ChatMessage: chatMessageSchema,
  ChatRequest: chatRequestSchema,
  ChatResponse: chatResponseSchema,
};

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Virtual Science Park ecosystem contracts",
  $defs: Object.fromEntries(
    Object.entries(schemas).map(([name, validator]) => {
      const { $schema, ...definition } = z.toJSONSchema(validator);
      return [name, definition];
    }),
  ),
};

writeFileSync(
  new URL("../docs/api/ecosystem.schema.json", import.meta.url),
  JSON.stringify(schema, null, 2) + "\n",
);
