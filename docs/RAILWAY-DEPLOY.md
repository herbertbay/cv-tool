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

## 6. PDF parsing (uploaded CVs)

- **Same code as local:** PDF text extraction and AI structuring run the same on Railway. No separate “scraping” service.
- **Best results:** Set `OPENAI_API_KEY` on the backend. CV uploads are parsed with GPT first; if that fails (e.g. timeout, rate limit), the app falls back to heuristic parsing and logs a warning.
- **Empty or poor extraction:** Some PDFs (e.g. image-only/scanned, or unusual encodings) yield little or no text. The backend tries default extraction then layout-mode extraction; if the PDF is still empty, the user sees an error suggesting a text-based PDF (e.g. LinkedIn “Save as PDF” or Word export).
- **Railway logs:** If PDF parsing is “not working at its fullest”, check backend logs for `PDF parse: AI structuring failed` or `OPENAI_API_KEY not set` to see whether AI is being used or heuristics only.

---

## 7. Checklist

- [ ] Backend service: root `backend`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, env `OPENAI_API_KEY` and `SECRET_KEY`.
- [ ] Backend domain generated; URL copied.
- [ ] Frontend service: root `frontend`, build `npm ci && npm run build`, start `npm start`, env `NEXT_PUBLIC_API_URL` = backend URL.
- [ ] Frontend domain generated.
- [ ] Backend env `FRONTEND_URL` set to frontend URL (for CORS).
- [ ] Open frontend URL in browser and test.
- [ ] (Optional) Verify `OPENAI_API_KEY`: `curl https://your-backend.up.railway.app/health` should include `"openai_configured": true`.
- [ ] (Optional) Test CV upload: PDF parsing uses OpenAI when `OPENAI_API_KEY` is set; check logs if results are weak.
