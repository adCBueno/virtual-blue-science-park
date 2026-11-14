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

Set `API_URL` on the server (for example `API_URL=http://localhost:8000 bun run dev`, or
`-e API_URL=http://api:8000` for the Docker image). The app then loads companies, profiles,
opportunities and recommendations from the team backend, logs in against `/auth/login`, and saves
profile edits as claims. The browser calls Start server functions (`src/data/api/backend.functions.ts`)
that forward to the backend, so no CORS or public API URL is needed. Without `API_URL` the app
uses its fixtures and mock services (UI contract: [docs/api](docs/api/README.md)). Mapping between the two contracts lives in
`src/data/api/mapping.ts`; see [DOCKER.md](./DOCKER.md) for the endpoint table.

## Docker

See [DOCKER.md](./DOCKER.md).
