# Virtual Science Park

Virtual Science Park runs on TanStack Start, React, Vite, and Tailwind. The default
workspace uses validated JSON fixtures and browser-session mock services. It
requires no Supabase or Lovable credentials.

## Run locally

Use Bun for dependency installation. The repository tracks `bun.lock`.

```sh
bun install --frozen-lockfile
bun run dev
```

For verification, run `bun run lint`, `bun run test`, `bun run build`, and
`bun run tsc --noEmit`. Node 22 can run the installed package scripts as well.

## Demo workspace

The site opens in public visitor mode. To enter the company or staff view, use `demo-nord@example.test` and
`demo-staff@example.test` with the password field blank. Recovery is simulated.
Accounts, private drafts, published edits, and in-app reviews last for the
browser tab's session. To reset the demo, clear this site's session storage or
run `sessionStorage.removeItem("bsp-demo-workspace"); location.reload()` in the
browser console. Demo roles and private state simulate application behavior.

Staff can save a Nord Sensor draft and send it for review. The Nord Sensor
representative sees the pending request. Blue uses deterministic replies based
on the active company and the current demo role.

## Connect the team API

See [the shared contract](docs/api/README.md). The active service facade is
`src/data/services.ts`. Canonical schemas live under `src/contracts`, with
fixture records under `src/data/fixtures` and map configuration under
`src/features/universe`.

To enable the team backend, implement the six service groups in the facade
against the agreed operations. Route protected operations through TanStack Start
server functions. Use `createTeamApiTransport` on the server with
`TEAM_API_BASE_URL` and supply endpoint mapping, per-request credentials, and
response schemas. Add server-side selection for `DATA_PROVIDER=api` once those
operations are available. Until then the app uses its mock services.
