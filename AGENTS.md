## Application architecture

- Use Bun and keep bun.lock in sync with package.json.
- Keep business data in validated JSON fixtures and map positions in the universe visual configuration.
- Preserve TanStack Start routing, SSR, and server boundaries for future authenticated operations.
- Use the root account provider for session transitions. Mock accounts simulate roles. The team API must enforce real permissions.
- Keep profile field definitions and provenance shared. Keep private drafts separate from published profiles.
- Preserve the responsive DOM/SVG universe, keyboard access, and reduced motion.
- Keep credentials on the server and local environment files out of Git.
- Keep historical database migrations, schema, generated types, and Supabase configuration as backend references.