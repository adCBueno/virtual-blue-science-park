# Running the frontend with Docker

The frontend (TanStack Start) ships as one self-contained image, **`adcbueno1/virtual-science-park`**,
configured with environment variables — like pulling Home Assistant.

| Variable | Default | Meaning |
|---|---|---|
| `API_URL` | empty | Team backend base URL. Empty = demo mode on the built-in fixtures. |
| `PORT` | `3000` | Port inside the container. |

The browser never talks to the backend directly: the frontend server forwards each request to
`API_URL`. The backend can therefore stay on the internal Docker network, and no CORS setup is needed.

## With the team backend (backend repo's `docker-compose.yml`)

```yaml
  ui:
    image: adcbueno1/virtual-science-park:1.2.0
    ports:
      - "3000:3000"
    environment:
      API_URL: http://api:8000
    depends_on:
      api:
        condition: service_healthy
```

Log in with the backend's accounts (for the mock seed: `admin@bsp.example.com` is Blue Science Park
staff, `demo@nordsense.example.com` a company representative; passwords are in the backend's
`fixtures/mock/users.json`).

## Standalone

```bash
docker run -p 3000:3000 adcbueno1/virtual-science-park:1.2.0                         # demo data
docker run -p 3000:3000 -e API_URL=http://host.docker.internal:8000 \
  --add-host host.docker.internal:host-gateway adcbueno1/virtual-science-park:1.2.0  # backend on your machine
```

## What comes from the backend

| UI | Backend endpoint |
|---|---|
| Companies in the universe, company profiles with evidence (stated / inferred / company-confirmed, source link, date, confidence) | `GET /companies`, `GET /companies/{id}/profile` |
| Opportunities (funding, events, testbeds) with source and dates | `GET /opportunities` |
| Recommendations, "why it's relevant", reverse matching (opportunity → companies) | `GET /companies/{id}/recommendations` |
| Login / logout, roles (admin → staff, company → representative) | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Profile edits (saved as `user_confirmed` claims) and publishing | `PATCH`/`POST /companies/{id}/claims`, `PATCH /companies/{id}/visibility` |

Not yet backed by the API (still simulated in the UI, clearly labelled): Blue's chat replies
(`/chat` is not built yet), profile review requests, outreach tracking and the staff briefing's member news.

## Publish a new version

- Windows: double-click `publish-docker.bat` (publishes `1.2.0` + `latest`), or `publish-docker.bat 1.3.0`.
- CI: `.github/workflows/docker-publish.yml` publishes on push to `master`/`main` and on `v*.*.*` tags.
  Needs the repo secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

## Test against a live backend

```bash
# in the backend repo
SEED_DIR=fixtures/mock OPPORTUNITY_REFRESH=off uvicorn api.main:app --port 8000
# here
BACKEND_TEST_URL=http://127.0.0.1:8000 bun run test
```
