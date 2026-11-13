// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { inlineBrowserCloudEnv } from "./tooling/browser-cloud-env";

export default defineConfig({
  vite: {
    plugins: [{
      name: "bsp:browser-cloud-env",
      enforce: "pre",
      configResolved(config) {
        thisPublicEnv = config.env;
      },
      transform(source, id) {
        if (!id.replaceAll("\\", "/").endsWith("/src/integrations/supabase/client.ts")) return;
        if (this.environment?.config.consumer !== "client") return;
        const code = inlineBrowserCloudEnv(source, thisPublicEnv);
        return code === source ? undefined : { code, map: null };
      },
    }],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

let thisPublicEnv: Record<string, string | undefined> = {};
