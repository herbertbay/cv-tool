# Deploy CV-Tool on Railway (backend + frontend)

**Do not use `start.sh` on Railway.** That script is for local development (venv, two processes). On Railway you run **two separate services** from the same repo.

---

## 1. Two services

Create **two** services in your Railway project:

| Service   | Name (e.g.) | Root directory | What it runs        |
|----------|-------------|----------------|---------------------|
| Backend  | `cv-tool-api`  | `backend`     | FastAPI (uvicorn)   |
| Frontend | `cv-tool-web`  | `frontend`    | Next.js (next start) |

---

## 2. Backend service

- **Root directory:** `backend` (in Railway: Settings → set "Root Directory" to `backend`).
- **Build command:**  
  `pip install -r requirements.txt`  
  (Railway may auto-detect this for Python.)
- **Start command:**  
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`  
  Or leave start empty and add a **Procfile** in `backend/` with:  
  `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment variables (Settings → Variables):**
  - `OPENAI_API_KEY` = your OpenAI key
  - `SECRET_KEY` = random string (e.g. `openssl rand -hex 32`)
  - `FRONTEND_URL` = your **frontend** Railway URL (set this after you create the frontend service and generate its domain; e.g. `https://cv-tool-web-production-xxxx.up.railway.app`) so the API allows CORS from the frontend
  - If you add Postgres later: `DATABASE_URL`
- After deploy, open the backend service → **Settings → Generate Domain**. Copy the URL (e.g. `https://cv-tool-api-production-xxxx.up.railway.app`). You need it for the frontend.

---

## 3. Frontend service

- **Root directory:** `frontend`.
- **Build command:**  
  `npm ci && npm run build`
- **Start command:**  
  `npm start`  
  (This runs `next start -p $PORT` so Railway’s `PORT` is used.)
- **Environment variable:**
  - `NEXT_PUBLIC_API_URL` = your **backend** URL from step 2, with no trailing slash.  
    Example: `https://cv-tool-api-production-xxxx.up.railway.app`  
    The frontend calls `/api/...` on that host, so do **not** add `/api` to this value.
- After deploy, open the frontend service → **Settings → Generate Domain**. That URL is your app.

---

## 4. CORS (backend)

Set the **backend** env var `FRONTEND_URL` to your frontend’s full URL (e.g. `https://cv-tool-web-production-xxxx.up.railway.app`). The API uses this for CORS so the browser allows requests from your frontend. No code change needed.

---

## 5. Why you saw 502

- **`start.sh`** is for your machine only. It uses `venv/bin/activate` (no venv on Railway) and runs two processes. Railway runs **one** process per service and sets `PORT`.
- If the start command was `./start.sh`, the container failed (venv missing) and nothing listened on `PORT` → 502.
- Fix: use **two services** as above, with the backend and frontend **start commands** from this doc (no `start.sh`).

---

## 6. Checklist

- [ ] Backend service: root `backend`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, env `OPENAI_API_KEY` and `SECRET_KEY`.
- [ ] Backend domain generated; URL copied.
- [ ] Frontend service: root `frontend`, build `npm ci && npm run build`, start `npm start`, env `NEXT_PUBLIC_API_URL` = backend URL.
- [ ] Frontend domain generated.
- [ ] Backend env `FRONTEND_URL` set to frontend URL (for CORS).
- [ ] Open frontend URL in browser and test.
