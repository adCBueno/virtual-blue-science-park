import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import {
  CHAT_MAX_CHARS,
  type BackendChatResponse,
  type BackendEcosystem,
  type BackendLogin,
  type BackendUser,
} from "./contract";

/** Browser-callable endpoints that forward to the team backend (see backend.server.ts). */

const token = z.string().min(1).max(512);
const slug = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
  .max(80);

export type BackendSnapshot =
  | { enabled: false }
  | {
      enabled: true;
      data: BackendEcosystem;
      user: BackendUser | null;
      sessionExpired: boolean;
      error?: string;
    };

export const loadBackend = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: string | null }) =>
    z.object({ token: token.nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<BackendSnapshot> => {
    const api = await import("./backend.server");
    if (!api.apiUrl()) return { enabled: false };
    let user: BackendUser | null = null;
    let sessionExpired = false;
    if (data.token) {
      try {
        user = await api.me(data.token);
      } catch (err) {
        if (err instanceof api.BackendError && err.status === 401) sessionExpired = true;
        else throw err;
      }
    }
    try {
      const ecosystem = await api.loadEcosystem(user ? data.token : null);
      return { enabled: true, data: ecosystem, user, sessionExpired };
    } catch (err) {
      return {
        enabled: true,
        data: { profiles: [], opportunities: [], recommendations: [] },
        user,
        sessionExpired,
        error: err instanceof Error ? err.message : "The backend is not reachable right now.",
      };
    }
  });

export const backendLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) =>
    z
      .object({ email: z.string().trim().min(1).max(254), password: z.string().min(1).max(256) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<BackendLogin> => {
    const api = await import("./backend.server");
    return api.login(data.email, data.password);
  });

export const backendLogout = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => z.object({ token }).parse(input))
  .handler(async ({ data }) => {
    const api = await import("./backend.server");
    await api.logout(data.token).catch(() => undefined);
    return { ok: true };
  });

const claimOp = z.discriminatedUnion("op", [
  z.object({ op: z.literal("patch"), claimId: slug, value: z.string().trim().min(1).max(4000) }),
  z.object({
    op: z.literal("add"),
    field: z.string().regex(/^[a-z_]+$/),
    value: z.string().trim().min(1).max(4000),
  }),
]);

export const backendSaveProfile = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      token: string;
      companyId: string;
      ops: z.infer<typeof claimOp>[];
      visibility: "private" | "published" | null;
    }) =>
      z
        .object({
          token,
          companyId: slug,
          ops: z.array(claimOp).max(60),
          visibility: z.enum(["private", "published"]).nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const api = await import("./backend.server");
    await api.saveProfile(data.token, data.companyId, data.ops, data.visibility);
    return { ok: true };
  });

export const backendFeedback = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      token: string;
      opportunityId: string;
      verdict: "save" | "relevant" | "not_relevant";
    }) =>
      z
        .object({
          token,
          opportunityId: slug,
          verdict: z.enum(["save", "relevant", "not_relevant"]),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const api = await import("./backend.server");
    await api.sendFeedback(data.token, data.opportunityId, data.verdict);
    return { ok: true };
  });

export type ChatResult =
  { ok: true; reply: BackendChatResponse } | { ok: false; status: number; message: string };

/** Forwards one chat message with the user's token. Errors come back as a status so the UI can explain them. */
export const backendChat = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; message: string }) =>
    z.object({ token, message: z.string().trim().min(1).max(CHAT_MAX_CHARS) }).parse(input),
  )
  .handler(async ({ data }): Promise<ChatResult> => {
    const api = await import("./backend.server");
    try {
      return { ok: true, reply: await api.chat(data.token, data.message) };
    } catch (err) {
      if (err instanceof api.BackendError)
        return { ok: false, status: err.status, message: err.message };
      return { ok: false, status: 500, message: "The assistant is unavailable right now." };
    }
  });

export type { RepresentativeResult } from "./backend.server";

/** Staff-only lookup of a company's representative email (see lookupRepresentative). */
export const backendRepresentative = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; companyId: string }) =>
    z.object({ token, companyId: slug }).parse(input),
  )
  .handler(async ({ data }) => {
    const api = await import("./backend.server");
    return api.lookupRepresentative(data.token, data.companyId);
  });
