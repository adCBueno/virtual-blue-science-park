/** Only these public values may be embedded in browser source. Never inline server credentials. */
const publicKeys = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;

export function inlineBrowserCloudEnv(source: string, env: Record<string, string | undefined>): string {
  return publicKeys.reduce((code, key) => {
    const value = env[key];
    if (!value) return code;
    const pattern = new RegExp(`import\\.meta\\.env(?:\\.${key}\\b|\\[\\s*(["'])${key}\\1\\s*\\])`, "g");
    return code.replace(pattern, () => JSON.stringify(value));
  }, source);
}