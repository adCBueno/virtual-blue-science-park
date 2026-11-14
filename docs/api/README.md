# Virtual Science Park data contracts

[The JSON Schema](./ecosystem.schema.json) uses Draft 2020-12. Validate a payload against the named definition, for example `ecosystem.schema.json#/$defs/ChatResponse`. The root is a collection of definitions. The source validators and inferred TypeScript types live in [ecosystem.ts](../../src/contracts/ecosystem.ts).

## Examples

- [Companies](../../src/data/fixtures/companies.json) and [published profiles](../../src/data/fixtures/company-profiles.json) join on `companyId`. The profile owns the display name. Map layout and styling live separately under `features/universe`.
- [Opportunities](../../src/data/fixtures/opportunities.json) retain their illustrative scheduling labels. Structured dates come from those labels. Source publication and retrieval dates are omitted where unknown. Empty industry lists mean the demo lists no industries.
- [Collaboration recommendations](../../src/data/fixtures/collaboration-matches.json) capture the existing directed matches and technology overlap. [Example payloads](./examples.json) show an opportunity match and a request/reply pair for Blue.

## Contract semantics

| Definition                             | Required data and key optional fields                                                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Company                                | ID, industry, sector, and demo flag.                                                                                                                                         |
| CompanyProfile                         | Company ID, display name, technologies and interests arrays, evidence map, and published visibility. Descriptive sections such as customer groups are optional.              |
| PrivateCompanyProfile                  | Same profile fields with private visibility and optional notes. The published schema rejects private notes.                                                                  |
| ProfileEvidence                        | Classification is required. Source label, URL, retrieval date, and uncertainty are optional. An absent entry means the source supplied no evidence metadata.                 |
| Opportunity                            | ID, title, description, category, technologies, industries, source label and URL, eligibility, and demo flag. Scheduling dates, display label, and uncertainty are optional. |
| Recommendation                         | Company ID, target type and ID, explanation, factors, suggested status, and demo flag. Score is optional.                                                                    |
| User                                   | ID, name, role, and company association. Representatives require a company ID. Staff and unassigned users use null. A visitor has no user record.                            |
| ProfileReviewRequest                   | ID, company, requester, recipient, status, and creation timestamp.                                                                                                           |
| ChatMessage, ChatRequest, ChatResponse | A message supplies role and text. A request supplies question, active company ID or null, and history. A response supplies answer, action, sources, and the simulated flag.  |

Date-only fields use ISO calendar dates. Review creation timestamps carry a time zone. Shapes are strict. Foreign-key relationships, access checks, publication rules, and action visibility also need service-level validation.

Regenerate the schema after changing its Zod source with Node 22 or later:

```sh
node --experimental-strip-types tooling/generate-ecosystem-schema.mjs
```

## Open integration decisions

Agree on ID format, optional versus nullable information, controlled category and sector values, provenance and uncertainty vocabulary, match scores, and review transitions. Agree on authorization and publication semantics, the chat history limit and action validation, and the eventual transport and endpoint mapping before connecting the API.
