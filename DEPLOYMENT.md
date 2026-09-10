# Deployment (Render)

Live-link deployment on the free tier: Node backend + Redis sidecar + managed Postgres + static frontend. Elasticsearch-backed content search is the only feature that stays off until you add the paid ES container (upgrade path below). All ES failures are soft—scheduling, sending, and the email log keep working.

## One-time deploy

1. Push this repo to GitHub (done: `Samarth6840/Scheduler`).
2. Create a free account at render.com, then **New → Blueprint**.
3. Paste the repo URL. Render reads `render.yaml` and provisions 3 services:
   - `scheduler-db` — free PostgreSQL
   - `scheduler-api` — Docker web service (Express + BullMQ worker + Redis sidecar)
   - `scheduler-ui` — static site (Vite build, calls the API via `VITE_API_URL`)
4. Give it ~3–5 minutes for the first build/deploy.

## After deploy

1. In `scheduler-api` → **Environment**, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (they deploy as empty placeholders), then redeploy.
2. In the Google Cloud Console OAuth client, add a redirect URI: `https://scheduler-api.onrender.com/api/auth/google/callback`.
3. Open `https://scheduler-ui.onrender.com` → click **Connect Google**.

> If you rename a service, its `.onrender.com` subdomain changes. Update the exact-URL env vars that reference it: `FRONTEND_URL` and `VITE_API_URL` (ui), and `GOOGLE_CALLBACK_URL` (api).

## Free tier limits (expected)

- Web service sleeps after 15 min idle; first visit cold-starts in ~30–60 s. While asleep the worker runs nothing, so scheduled emails do not fire until someone opens the app.
- 512 MB RAM — fine for Node + Redis, not for Elasticsearch.
- Free Postgres is 1 GB and expires after 30 days. Upgrade to a paid Postgres before then to keep data.

## Enabling Elasticsearch search (paid)

1. Uncomment the `elasticsearch` service block in `render.yaml` (uses `backend/Dockerfile.es`, 2 GB plan, 2 GB disk) and set `scheduler-api` env `ES_URL` to the ES service URL.
2. Deploy. Emails get indexed on send automatically; content search lightens up.
3. Optional: on first boot after enabling, existing rows are not re-indexed automatically (only new sends are). Re-indexing past emails is not implemented.