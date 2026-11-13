import { describe, expect, it } from "vitest";
import { inlineBrowserCloudEnv } from "../../tooling/browser-cloud-env";

describe("public Cloud environment injection", () => {
  it("embeds bracket and dot public settings before browser bundling", () => {
    expect(inlineBrowserCloudEnv("import.meta.env['VITE_SUPABASE_URL']; import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY", {
      VITE_SUPABASE_URL: "https://example.test", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    })).toBe('"https://example.test"; "sb_publishable_test"');
  });
  it("never embeds server credentials or rewrites server runtime reads", () => {
    const source = "process.env['SUPABASE_URL']; import.meta.env['SUPABASE_SERVICE_ROLE_KEY']";
    expect(inlineBrowserCloudEnv(source, { SUPABASE_SERVICE_ROLE_KEY: "must-not-be-inlined", SUPABASE_URL: "server-only" })).toBe(source);
  });
});