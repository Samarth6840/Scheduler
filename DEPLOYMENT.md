# Deployment

Architecture: **backend on Render, frontend on Vercel**.

- `scheduler-api` — Render Docker web service: Express API + BullMQ worker + Redis sidecar + managed Postgres. This must stay on a platform with persistent processes (Vercel can't run the worker).
- Frontend — static Vite site on Vercel, calling the API via `VITE_API_URL`.
- Elasticsearch search is off in the free setup (see below).

## 1. Backend (Render) — one time

1. Push this repo to GitHub (done: `Samarth6840/Scheduler`).
2. render.com → **New → Blueprint** → paste the repo URL. `render.yaml` provisions one Postgres + one Docker web service.
3. In `scheduler-api` → **Environment**, set:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (deploy as empty placeholders), and
   - `FRONTEND_URL` = the Vercel app URL, e.g. `https://your-app.vercel.app` (Render starts with `https://YOUR-APP.vercel.app` — replace after creating the Vercel project).
4. Redeploy. In the Google Cloud Console OAuth client, add redirect URI `https://scheduler-api.onrender.com/api/auth/google/callback`.

## 2. Frontend (Vercel) — one time

1. vercel.com → **Add New → Project** → import `Samarth6840/Scheduler`.
2. In project settings: **Root Directory** = `scheduler`, Framework = Vite (build `npm run build`, output `dist` — read from `scheduler/vercel.json`).
3. Add environment variable `VITE_API_URL = https://scheduler-api.onrender.com`, then redeploy.
4. Open the Vercel URL → **Connect Google** → schedule an email.

> `FRONTEND_URL` (Render) and `VITE_API_URL` (Vercel) must point at each other. Both are used by the OAuth flow: Connect Google → `api/auth/google` (Render) → Google → `/google/callback` (Render) → redirects to `FRONTEND_URL/?token=…` (Vercel).

## Free tier limits

- Render web service sleeps after 15 min idle; while asleep the worker runs nothing, so scheduled emails don't fire until the app is opened. First visit cold-starts in ~30–60 s.
- 512 MB RAM — fits Node + Redis, not Elasticsearch.
- Free Postgres is 1 GB, expires after 30 days. Upgrade before then to keep data.
- Vercel static preview/production deployments call the Render API cross-origin; CORS only allows `FRONTEND_URL`, so preview URLs can't log in until you set `FRONTEND_URL` to that preview URL (or move to a custom domain).

## Enabling Elasticsearch search (paid)

1. Uncomment the `elasticsearch` service block in `render.yaml` (uses `backend/Dockerfile.es`, 2 GB plan, 2 GB disk) and set `scheduler-api` env `ES_URL` to the ES service URL.
2. Deploy. New sends are indexed automatically. Existing rows are not re-indexed (not implemented).