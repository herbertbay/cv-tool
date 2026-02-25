# CV-Tool — Tailored CVs & Motivation Letters

Full-stack web app to generate **tailored CVs and motivation letters** for specific job postings. Uses a LinkedIn profile (URL scrape, PDF import, or JSON), job description (text or URL), optional extra URLs (e.g. Wikipedia), and an AI model to produce a professional PDF.

## Features

- **Inputs:** LinkedIn profile URL (scrape public page), PDF (LinkedIn “Save as PDF” or your CV), or custom profile JSON; personal summary; up to 5 additional URLs; job description (paste or URL); optional profile photo; language (EN/DE/FR).
- **Backend:** Scrape LinkedIn URL, parse PDF or JSON into profile; fetch job/URL content; extract keywords; OpenAI-based tailoring and motivation letter; session storage; PDF generation (WYSIWYG).
- **Frontend:** Responsive forms, progress indicator, preview of summary and letter, PDF download, editable profile page (dates, experience, education, skills, photo).

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS
- **Backend:** Python 3.10+, FastAPI
- **AI:** OpenAI GPT (e.g. `gpt-4o-mini`)
- **PDF:** WeasyPrint (HTML/CSS → PDF)

## Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+
- **WeasyPrint system deps** (see below)
- **OpenAI API key**

### WeasyPrint system dependencies

**macOS (Homebrew):**
```bash
brew install cairo pango gdk-pixbuf libffi
```

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential python3-dev libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info
```

**Windows:** See [WeasyPrint installation](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html).

## Quick start (local)

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
uvicorn app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**. Docs: http://localhost:8000/docs.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**. It proxies `/api-backend/*` to `http://localhost:8000/api/*` (see `next.config.js`).

### 3. Use the app

1. Open http://localhost:3000.
2. **LinkedIn:** Enter your profile URL (e.g. `linkedin.com/in/username`) and click **Fetch**, or upload a PDF (LinkedIn “Save as PDF” or your CV) or JSON file.
3. Optionally add personal summary, extra URLs, job description (paste or URL and click “Fetch from URL”), profile photo, and language.
4. Click **Generate CV & motivation letter**. When done, use **Download PDF** and review the preview.

Profile data is stored in the browser (localStorage). Use **Edit profile** to change experience, education, skills, photo, etc., then return to the generator.

## Project layout

```
CV-Tool/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, routes
│   │   ├── config.py         # Settings (e.g. OPENAI_API_KEY)
│   │   ├── models.py         # Pydantic request/response & Profile
│   │   ├── linkedin_parser.py
│   │   ├── url_fetcher.py
│   │   ├── ai_service.py     # OpenAI tailoring + motivation letter
│   │   ├── pdf_generator.py  # WeasyPrint + Jinja HTML
│   │   ├── session_store.py
│   │   └── pdf_templates/
│   │       └── cv_base.html
│   ├── requirements.txt
│   ├── .env.example
│   └── example_linkedin_export.json
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Main generator UI
│   │   ├── profile/page.tsx   # Editable profile
│   │   ├── lib/api.ts        # Backend API client
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── package.json
│   └── next.config.js        # Rewrites to backend
└── README.md
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/parse-linkedin` | Upload JSON file → parsed `Profile` |
| POST   | `/api/fetch-job-description` | Body `{ "url" }` or `{ "text" }` → job text |
| POST   | `/api/fetch-additional-urls` | Body `{ "urls": ["..."] }` → map of URL → text |
| POST   | `/api/generate-cv` | Body `GenerateCVRequest` → session ID + tailored content |
| GET    | `/api/session/{id}` | Session data for preview |
| GET    | `/api/download-pdf/{id}` | PDF file |

## Deployment

- **Frontend:** Deploy to **Vercel**. Set `NEXT_PUBLIC_API_URL` to your backend base URL (e.g. `https://your-api.render.com/api`). Remove or adjust the `rewrites` in `next.config.js` so API calls go to that URL.
- **Backend:** Deploy to **Render**, **Railway**, **Heroku**, or any host that supports Python. Set `OPENAI_API_KEY` and CORS origins in FastAPI to your frontend origin. Use a proper session store (e.g. Redis) and file storage for PDFs if you need persistence beyond in-memory.

## Optional / future

- Multiple CV versions per user
- ATS keyword scoring
- More PDF templates (e.g. executive, creative)
- QR code linking to LinkedIn profile

## License

MIT.
