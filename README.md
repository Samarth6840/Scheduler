# Scheduler

Production-grade email scheduling system: schedule future emails, process them through a BullMQ worker with rate limiting, index them in Elasticsearch, and manage everything from a SaaS-style dashboard.

## Stack

- **Backend** (`backend/`) — Node.js + TypeScript + Express, BullMQ (Redis), PostgreSQL, Elasticsearch, Nodemailer (Ethereal for dev), Google OAuth
- **Frontend** (`scheduler/`) — React 19 + TypeScript + Vite, shadcn/ui + Tailwind

## Quick start

Infra: `docker compose up -d` in `backend/` (Redis, Elasticsearch) and start PostgreSQL.

```
cd backend
cp .env.example .env   # add Google OAuth credentials
npm install
npm run start

cd ../scheduler
npm install
npm run dev            # http://localhost:5173 (proxies /api to :5001)
```

## Features

- Schedule emails at a future time (BullMQ delayed jobs)
- Worker with per-sender + global hourly rate limits and inter-send spacing
- Status tracking: scheduled / sent / failed / rate_limited
- Full-text search over sent email content (Elasticsearch)
- Admin queue view at `/admin/queues`
- Google OAuth sign-in; light, dense B2B dashboard with sortable email log

See `backend/README`-equivalent docs in `backend/.env.example` for all configuration options.