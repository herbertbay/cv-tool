# 1. Ship — What to prepare beforehand

Checklist of everything you need **before** deploying (frontend + backend + DB + domain).

---

## Accounts & access

- [ ] **GitHub** — Repo is pushed and you have access (you already have this).

### Option A: One service for both frontend and backend (same repo)

These platforms let you deploy **frontend and backend from the same repo** as two services (or one monorepo). One account, one dashboard.

- [ ] **[Railway](https://railway.app)** — Connect your repo, add two services: one for `frontend` (Next.js), one for `backend` (Python/FastAPI). Add Postgres in the same project. Simple, good free tier. **Recommended.**
- [ ] **[Render](https://render.com)** — Same idea: one repo, add a **Web Service** for the backend (root or `backend/`), add another **Web Service** for the frontend (`frontend/`). Can add Postgres on Render. Free tier with cold starts.
- [ ] **[Fly.io](https://fly.io)** — Two apps from the same repo (e.g. one `Dockerfile` per app or `fly.toml` per app). More config, full control.

With Option A you only need **one account** (Railway or Render) plus a **Postgres** provider (or Postgres from the same provider).

### Option B: Split (frontend on Vercel, backend elsewhere)

- [ ] **Vercel** — [vercel.com](https://vercel.com). Best-in-class for Next.js; connect repo and set root to `frontend/`.
- [ ] **Backend host** — Railway, Render, or Fly.io for the Python API only.
- [ ] **PostgreSQL** — Neon, Supabase, or from Railway/Render.

Use Option B if you want Vercel’s Next.js DX and don’t mind two dashboards.

---

## Secrets & keys (do not commit; use env vars in each platform)

- [ ] **OpenAI API key** — From [platform.openai.com](https://platform.openai.com/api-keys). You already have one; keep it for production or create a separate key for prod.
- [ ] **Secret key for auth** — Random string for signing session cookies (e.g. run `openssl rand -hex 32` and save it somewhere safe).
- [ ] **Database URL** — You’ll get this when you create the Postgres database (format: `postgresql://user:password@host:port/dbname`). Have it ready to paste into backend env.

---

## Domain (optional but recommended for “real” product)

- [ ] **Domain name** — Buy one (e.g. Namecheap, Google Domains, Cloudflare). Example: `cv-tool.com` or `getcvtool.com`.
- [ ] **DNS access** — You’ll need to add records (A/CNAME) where you bought the domain. No need to configure until you connect it in Vercel and your backend host.

---

## Local prep (so deploy config matches your app)

- [ ] **Backend**: decide how it will run in production  
  - Either: keep **SQLite** for the first deploy (simplest; no DB host yet), then add Postgres later.  
  - Or: add **Postgres** support in code now (connection string from env, run migrations), then deploy with a hosted Postgres.
- [ ] **Frontend**: confirm what the backend URL will be  
  - Set `NEXT_PUBLIC_API_URL` in your frontend’s env (Vercel, or Railway/Render frontend service) to your deployed backend URL (e.g. `https://your-backend.railway.app`). You’ll know this after the backend is deployed first.

---

## One-time decisions

- [ ] **Region** — Choose a region for backend and DB (e.g. same as most users: US, EU). Affects which data center you pick in Railway/Render/Neon.
- [ ] **Branch to deploy** — Usually `main`. Vercel and most hosts deploy from a branch; ensure your latest code is on that branch.

---

## Summary table

| Item                    | Where to get it / example                          |
|-------------------------|-----------------------------------------------------|
| **Option A (both in one)** | **Railway** or **Render** — one account, frontend + backend + optional Postgres from same repo |
| Option B (split)        | Vercel (frontend) + Railway/Render (backend)        |
| Neon / Supabase Postgres| neon.tech, supabase.com (or Postgres from Railway/Render) |
| OpenAI API key          | platform.openai.com                                 |
| Auth secret key         | `openssl rand -hex 32`                              |
| Database URL            | From Neon/Supabase/Railway/Render after creating a DB |
| Domain (optional)       | Any registrar                                       |

Once these are checked off, you’re ready to follow the actual deployment steps (connect repo, set env vars, deploy backend then frontend, then optional domain).
