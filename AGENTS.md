<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture
- Inline only allowlisted VITE public Cloud settings in the browser compilation before transforms; keep generated clients untouched and server credentials runtime-only.
- Below the desktop breakpoint, keep major ecosystem sections in page flow; phone node positions and pagination share the SVG connection coordinates to avoid clipping.
- Keep prototype companies and recommendation scoring in a browser-safe domain module so every view and test uses the same matching rules.
- Company drafts persist through authenticated server functions and database-authorised RPCs; public and private profiles live in separate tables, and demo previews never call write operations.
- Keep roles and immutable company account associations in the protected user_roles table; never derive permissions from user-editable metadata.
- Use one root account provider for session transitions and private-state cleanup; roleless accounts have no company-editing access.
- Use a responsive DOM/SVG ecosystem with CSS-defined depth and motion so nodes remain keyboard-accessible and respect reduced motion.
- Build assistant context server-side from the caller's own database client, so a reply can only ever use rows that caller is allowed to read; the browser never assembles the prompt or the sources.
- Keep profile section shapes and provenance in one browser-safe module, and the editing form in one shared component, so the inline panel, the wider editor and the assistant all read and write the same fields.
