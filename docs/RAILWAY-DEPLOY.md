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

The backend uses **WeasyPrint** for PDFs, which needs system libraries (Pango, Cairo) not in Railway’s default image. Use the **Dockerfile** in `backend/` so those are installed.

- **Root directory:** `backend`.
- **Use Dockerfile:** In Railway, the backend service should build from the Dockerfile in `backend/`. If Railway asks for a build type or “Dockerfile path”, use the Dockerfile in the service root (no extra path). Do **not** set a custom Build Command when using the Dockerfile; the Dockerfile defines the build and start.
- If you are **not** using the Dockerfile (no custom image):  
  Build: `pip install -r requirements.txt`.  
  Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.  
  (Without the Dockerfile, the app will crash on import with WeasyPrint/system library errors.)
- **Environment variables (Settings → Variables):**
  - `OPENAI_API_KEY` = your OpenAI key
  - `SECRET_KEY` = random string (e.g. `openssl rand -hex 32`)
  - `FRONTEND_URL` = your **frontend** Railway URL (set this after you create the frontend service and generate its domain; e.g. `https://cv-tool-web-production-xxxx.up.railway.app`) so the API allows CORS from the frontend
  - If you add Postgres later: `DATABASE_URL`
  - (Optional) **GENERATED_PDFS_DIR** = path for stored CV/letter PDFs (e.g. `/data/generated_pdfs`). If set, generated PDFs are saved there and listed on the default page; add a Volume mounted at that path so they survive redeploys.
- After deploy, open the backend service → **Settings → Generate Domain**. Copy the URL (e.g. `https://cv-tool-api-production-xxxx.up.railway.app`). You need it for the frontend.

---

## 3. Frontend service

- **Root directory:** `frontend`.
- **Build command:**  
  `npm ci && npm run build`
- **Start command:**  
  `npm start`  
  (This runs `next start -p $PORT` so Railway’s `PORT` is used.)
- **Environment variables:**
  - `NEXT_PUBLIC_API_URL` = your **backend** URL from step 2, with no trailing slash.
  - (Optional) **`ADMIN_SECRET`** = same value as on the backend. Enables `/admin/stats` on the frontend: opens the page and check the browser **Console** for `[Optimal CV] User stats:` and user count. The secret stays server-side in `/api/admin/stats`.  
    Example: `https://cv-tool-api-production-xxxx.up.railway.app`  
    The frontend calls `/api/...` on that host, so do **not** add `/api` to this value.
- After deploy, open the frontend service → **Settings → Generate Domain**. That URL is your app.

---

## 4. CORS (backend)

Set the **backend** env var `FRONTEND_URL` to your frontend’s full URL (e.g. `https://cv-tool-web-production-xxxx.up.railway.app`). The API uses this for CORS so the browser allows requests from your frontend. No code change needed. The frontend proxies API requests through same-origin `/api-proxy/*` so session cookies work (browsers block third-party cookies on cross-origin requests).

---

## 5. Why accounts disappear (SQLite is not persisted)

The backend uses **SQLite** and stores the database file (`cv_tool.db`) inside the container. On Railway, the container filesystem is **ephemeral**: every **deploy** or **restart** can start a new container with an empty filesystem, so the database (and all user accounts and profiles) is **lost**. You are not being “logged out and account deleted” by the app — the whole DB is reset.

- **Symptom:** You had an account, then after a while (or after a redeploy) you are logged out and “Sign in” says the email is not recognized (account no longer exists).
- **Fix (choose one):**
  1. **Railway volume:** In the backend service, add a **Volume** and mount it to a path (e.g. `/data`). Set the backend env var **`DB_PATH=/data/cv_tool.db`**. The app will store the SQLite file there so it survives restarts and redeploys.
  2. **PostgreSQL:** Add a Postgres database in your Railway project, set `DATABASE_URL` on the backend, and switch the app to use Postgres for users and profiles instead of SQLite. (The app does not support Postgres yet; it would require code changes.)

Until you add a volume or Postgres, treat the deployed app as **demo-only**: accounts and data can be lost at any deploy or restart.

---

## 6. Why you saw 502

- **`start.sh`** is for your machine only. It uses `venv/bin/activate` (no venv on Railway) and runs two processes. Railway runs **one** process per service and sets `PORT`.
- If the start command was `./start.sh`, the container failed (venv missing) and nothing listened on `PORT` → 502.
- Fix: use **two services** as above, with the backend and frontend **start commands** from this doc (no `start.sh`).

---

## 7. PDF parsing (uploaded CVs)

- **Same code as local:** PDF text extraction and AI structuring run the same on Railway. No separate “scraping” service.
- **Best results:** Set `OPENAI_API_KEY` on the backend. CV uploads are parsed with GPT first; if that fails (e.g. timeout, rate limit), the app falls back to heuristic parsing and logs a warning.
- **Empty or poor extraction:** Some PDFs (e.g. image-only/scanned, or unusual encodings) yield little or no text. The backend tries default extraction then layout-mode extraction; if the PDF is still empty, the user sees an error suggesting a text-based PDF (e.g. LinkedIn “Save as PDF” or Word export).
- **Railway logs:** If PDF parsing is “not working at its fullest”, check backend logs for `PDF parse: AI structuring failed` or `OPENAI_API_KEY not set` to see whether AI is being used or heuristics only.

---

## 8. Count users on Railway

### Why `railway run` often fails with `/data/cv_tool.db`

If `DB_PATH=/data/cv_tool.db` is set and you use a **volume**, the **running** service has that file. But **`railway run`** starts a **one-off** container; Railway often does **not** attach the same volume there, so the path does not exist and the script exits with “No database file at: /data/cv_tool.db”.

### Option A: Admin stats endpoint (recommended)

The running app **does** use the volume. Add a secret and call the API from your machine:

1. In the **backend** service on Railway, set variable **`ADMIN_SECRET`** to a long random string (e.g. `openssl rand -hex 24`).
2. Redeploy the backend.
3. From your machine:
   ```bash
   curl "https://YOUR-BACKEND-URL/api/admin/stats?secret=YOUR_ADMIN_SECRET"
   ```
   Response example: `{"users":12,"profiles":10,"cv_generations":45}`

If `ADMIN_SECRET` is not set, the endpoint returns 404 so it is not discoverable by default.

### Option B: Local script with `railway run` (only if DB is on ephemeral FS)

If you **do not** use a volume and the DB lives in the container filesystem, `railway run` might still not see the **same** file as the live deployment. Prefer Option A.

If you have a **local** copy of the DB:
```bash
DB_PATH=/path/to/cv_tool.db python backend/scripts/count_users.py
```

### Option C: Shell into the running deployment

If Railway provides a shell/SSH into the **running** instance where the volume is mounted, run `python scripts/count_users.py` there (with `DB_PATH` unchanged).

---

## 8b. Count users (local script only)

See **Option A** above for production counts. The shell script below only works when `railway run` can see the DB file (often it cannot with a volume).

```bash
./scripts/count-users-railway.sh
```

---

## 9. Checklist

- [ ] Backend service: root `backend`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, env `OPENAI_API_KEY` and `SECRET_KEY`.
- [ ] Backend domain generated; URL copied.
- [ ] Frontend service: root `frontend`, build `npm ci && npm run build`, start `npm start`, env `NEXT_PUBLIC_API_URL` = backend URL.
- [ ] Frontend domain generated.
- [ ] Backend env `FRONTEND_URL` set to frontend URL (for CORS).
- [ ] Open frontend URL in browser and test.
- [ ] (Optional) Verify `OPENAI_API_KEY`: `curl https://your-backend.up.railway.app/health` should include `"openai_configured": true`.
- [ ] (Optional) Test CV upload: PDF parsing uses OpenAI when `OPENAI_API_KEY` is set; check logs if results are weak.
- [ ] (Optional) Count users on Railway: `./scripts/count-users-railway.sh` after `railway link` (see section 8).
