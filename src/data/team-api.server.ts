import type { z } from "zod/v4";

export type ApiOperation<Input, Output> = {
  request: (input: Input) => { path: string; init?: RequestInit };
  response: z.ZodType<Output>;
};

/** Endpoint mapping and authenticated headers are supplied by the team adapter. */
export function createTeamApiTransport(
  baseUrl = process.env["TEAM_API_BASE_URL"],
  fetcher: typeof fetch = fetch,
) {
  if (!baseUrl) throw new Error("TEAM_API_BASE_URL is required for the team API.");
  const base = new URL(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password) {
    throw new Error("Configure an HTTP(S) team API base URL without credentials.");
  }

  return async function request<Input, Output>(
    operation: ApiOperation<Input, Output>,
    input: Input,
  ) {
    const { path, init } = operation.request(input);
    const url = new URL(path, base);
    if (url.origin !== base.origin) throw new Error("Team API operation targets another origin.");
    const response = await fetcher(url, { ...init, redirect: "error" });
    if (!response.ok) throw new Error(`Team API request failed (${response.status}).`);
    return operation.response.parse(await response.json());
  };
}
