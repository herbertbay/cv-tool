# Next steps for fast organic growth — Optimal CV

Ideas to grow Optimal CV through SEO, content, and word-of-mouth without (or before) paid spend.

For **business model** (profitable pricing given short usage windows) and **retention after they find a job**, see [BUSINESS-MODEL.md](./BUSINESS-MODEL.md).

---

## Immediate next steps (recommended order)

| Step | Action | Why |
|------|--------|-----|
| **1** | **Stabilize & monitor** | Fix any remaining auth/PDF issues; confirm ATS → signup → create CV flow works end-to-end. Watch Railway logs and a few real runs. |
| **2** | **SEO / content next** (Share CTA done) | **Share CTA** is live (Create CV modal + ATS flow). Next lever: **first 2–3 SEO pages** or “how to” articles (see checklist below)—still the highest-impact gap vs technical polish. |
| **3** | **Then add payment** | See **[STEP-3-PAYMENT.md](./STEP-3-PAYMENT.md)** for your detailed checklist. Once you have ~50–100 signups or 2–4 weeks of steady traffic, add a paid tier. By then you’ll have feedback and a clear value moment to monetize. |

**Payment — recommendation:**  
Adding payment now is possible but adds friction before you’ve validated demand. Better sequence: (1) get the ATS tool and core flow stable and shared a bit, (2) add one lightweight growth lever (share or SEO), (3) introduce payment (e.g. “Unlimited CVs + no branding” or “Pro templates”) so you’re monetizing people who already see the value. If you prefer to add payment earlier, keep a **generous free tier** (e.g. 3–5 CVs/month free) so the ATS tool and first CV remain a strong lead magnet.

---

## Things to implement (checklist)

### Product & in-app

- [x] **CV/ATS match score tool** — Standalone page: upload CV (PDF) + job description (text or URL), get match score; sign up to view and get optimized version; create tailored CV from result. *Done.*
- [ ] **Job description keyword extractor** — Paste job ad → list of suggested keywords for your CV. Free, no account; CTA to Optimal CV.
- [x] **Share CTA after generating a CV** — “Share Optimal CV with a friend” with one-click copy link in Create CV modal and ATS done step. *Done.*
- [x] **“Powered by Optimal.cv” on PDFs** — Footer on generated CV and motivation letter PDFs when `show_powered_by` is on (non‑premium users); omitted for premium (hardcoded allowlist in backend). *Not* a user-facing settings toggle yet—only the premium gate.
- [ ] **Referral tracking** — Referral codes or UTM params; track which channel/user drives signups.
- [ ] **Welcome email sequence** — (1) Confirm + “Create your first tailored CV”; (2) “Tip: paste the job description”; (3) “Your CV is ready — use it for the next application.”
- [ ] **Re-engagement email** — If no generation in 2–3 weeks: “Ready for your next application? Add a new job and we’ll tailor your CV again.”
- [ ] **Monthly email** — One short career/CV tip or product update.

### Website & SEO

- [x] **Technical SEO baseline (code)** — `robots.ts`, `sitemap.ts`, dynamic **`/llms.txt`**, `getSiteUrl()` / **`NEXT_PUBLIC_SITE_URL`**, `noindex` on dashboard/profile/auth/admin/get-started. *Ongoing:* Core Web Vitals monitoring, **[SEO-ASO-TODO.md](./SEO-ASO-TODO.md)** (registrations, Search Console, etc.).
- [x] **“Resources” hub** — `/resources` with guides + job-title pages; linked from landing footer and CV checker header.
- [x] **10 “CV for [Job Title]” pages** — Under `/resources/cv-for/…` (static generation + sitemap + Article JSON-LD).
- [x] **3 “how to” articles** — `/resources/guides/how-to-tailor-cv-to-job-description`, `how-to-pass-ats-screening`, `best-cv-format-2026` (+ CTAs to register / CV checker).
- [x] **Internal linking** — Each resource page CTA to **Get started** / **CV checker**; hub links all children.
- [x] **Sitemap** — `app/sitemap.ts` lists `/`, `/cv-checker`, `/resources`, and all resource URLs. *You still:* submit in Search Console / Bing (see **[SEO-REGISTRATIONS.md](./SEO-REGISTRATIONS.md)**).
- [x] **Schema markup** — Root `@graph`: Service + Organization (linked), FAQPage (aligned with landing FAQ). Resource articles use **Article** JSON-LD.
- [x] **Canonicals & indexability** — Resource pages + CV checker set `alternates.canonical`; private areas `robots: noindex`. *Verify in production:* `NEXT_PUBLIC_SITE_URL` matches live domain.

### Social proof & content

- [ ] **Testimonials** — Collect 3–5 one-sentence quotes from users (with permission). Add to landing and/or app.
- [ ] **“X people have created tailored CVs”** — Add counter or line on landing if you have the number.
- [ ] **Founder story post** — “Why I built a CV tool that tailors to every job” on Medium, LinkedIn, or your blog.
- [ ] **Comparison page** — “Optimal CV vs. [X]” or “Best tools to tailor your CV in [year]” (fair, factual).
- [ ] **Templates/examples page** — e.g. “10 CV summary examples for [role]” or “Cover letter openings that get read” with CTA to Optimal CV.
- [ ] **One data-led piece per quarter** — e.g. “State of hiring” or “CV screening” with original data; pitch to career sites/newsletters.
- [ ] **“Featured in” / “As used by”** — When you get a mention, add logo or quote to the site.

### Community & distribution

- [ ] **Reddit presence** — r/resumes, r/careerguidance, r/jobs, etc. Helpful comments first; mention Optimal CV only when it fits. Aim for one valuable comment per day.
- [x] **LinkedIn** — Short posts (“One change that made my CV get more callbacks”, “Why I tailor my CV for every application”); link to tool or product in comment/bio.
- [ ] **Quora / Q&A** — Answer “How do I improve my CV?” and “How do I tailor my resume?” with actionable answers + soft plug where relevant.

### Messaging (already on landing; reuse elsewhere)

- [ ] **Pain-point lines in ads/social** — Reuse the same angles as the landing (ghosted / ignored / silence after applying) in paid and organic social; landing already embodies them below.
- [x] **Hero, why-tailor, and final CTA** — Implemented on `LandingPage.tsx` (ghosted hook, “Stop getting ignored…”, “Tired of silence…” / “impossible to ignore”). Keep in sync when you edit the **Messaging (pain → solution)** section below.

---

## Messaging (pain → solution)

Use the “ghosted / ignored” angle consistently so people recognize the problem and the fix:

- **Hero / above the fold:** “Tired of being ghosted by recruiters? Get a resume that gets you noticed.”
- **Why tailor:** “Stop getting ignored—stand out with Optimal CV.”
- **Final CTA:** “Tired of silence after applying? Make your next resume impossible to ignore.”
- **Alternatives for ads or social:** “Ghosted after applying? Your resume might be the reason.” / “Stop sending the same resume to every job. Stand out with Optimal CV.”

Keep the tone direct and empathetic; avoid sounding preachy or desperate.

---

## 1. Double down on SEO and intent capture

- **Target one job per page.** Create thin, high-intent pages: “CV for [Job Title]” (e.g. “CV for Software Engineer”, “CV for Marketing Manager”). Each page: short intro, 3–5 tailored tips, strong CTA to use Optimal CV. Use job titles as H1s and in meta titles/descriptions.
- **Answer “how to” queries.** Publish 1–2 posts per month that match real search demand: “How to tailor your CV to a job description”, “How to pass ATS screening”, “Best CV format for [year]”, “How to write a cover letter for [industry]”. Keep articles practical and link to the product where it solves the problem.
- **Internal linking.** Link from every article and job page to the main app (Get started / Build your CV). Add a “Resources” or “Blog” section on the site and link to it from the footer.
- **Technical SEO.** Landing has default metadata, OG/Twitter, `Service` + `Organization` JSON-LD, and `robots` allow. Add a **sitemap** (and `llms.txt` if desired—see [SEO-ASO-TODO.md](./SEO-ASO-TODO.md)); add FAQ/HowTo schema only where content matches guidelines.

---

## 2. One “viral” free tool (lead magnet)

- **CV / ATS “score” or “check”.** A single page: paste job description + CV text (or upload), get a short “match score” and 3–5 improvement tips. No signup for the check; optional “Save full report” or “Get a tailored CV” → signup. Shareable and linkable.
- **Job description keyword extractor.** Paste a job ad → get a list of suggested keywords to use in a CV. Free, no account; CTA: “Use these in a CV tailored by Optimal CV”.
- **Simple, shareable result.** Design the result so people can share it (“I got 78% match”) or at least talk about it. Add “Share” or “Try with your CV” to encourage loops.

---

## 3. Content that gets backlinks and shares

- **Data-led content.** One “state of hiring” or “CV screening” piece per quarter: survey or scrape public data (e.g. what keywords appear in job posts, how long applications are open). Pitch to career/job sites and newsletters for links and mentions.
- **Comparison pages.** “Optimal CV vs. [X]” or “Best tools to tailor your CV in [year]” — fair, factual, and include Optimal CV. These often rank and get shared in forums and Reddit.
- **Templates and examples.** “10 CV summary examples for [role]” or “Cover letter opening lines that get read.” Host on your site, optimize for search, and add a CTA to generate a full CV/letter with Optimal CV.

---

## 4. Community and “where they already are”

- **Subreddits and forums.** r/resumes, r/careerguidance, r/jobs, r/cscareerquestions, etc. Be helpful first (answer questions, give feedback), mention Optimal CV only when it directly solves the ask. Avoid spam; aim for one valuable comment per day.
- **LinkedIn.** Short posts: “One change that made my CV get more callbacks”, “Why I tailor my CV for every application.” Link to the free tool or the product in the first comment or bio.
- **Quora / similar Q&A.** Answer “How do I improve my CV?” and “How do I tailor my resume?” with clear, actionable answers and a soft plug for Optimal CV where relevant.

---

## 5. Referral and sharing built into the product

- **“Share your result.”** *[Done — baseline]* After generating a CV / in the flow: “Share Optimal CV with a friend” + copy link (Create CV modal; ATS checker share line exists too). *Optional next:* referral rewards or native share to LinkedIn/X.
- **Light branding on free tier.** *[Done — via premium gate]* PDF footer “Powered by Optimal.cv” on CV and letter when not premium; hidden for premium accounts. *Still optional:* user-facing toggle in profile/settings instead of email allowlist only.
- **Referral tracking.** Simple referral codes or UTM links so you can measure which channels and users bring signups. Double down on what works.

---

## 6. Email and retention (so organic traffic converts)

- **Welcome sequence.** After signup: 1) confirm + “Create your first tailored CV”; 2) “Tip: paste the job description for best results”; 3) “Your CV is ready — here’s how to use it for the next application.”
- **Re-engagement.** If they haven’t generated in 2–3 weeks: “Ready for your next application? Add a new job and we’ll tailor your CV again.” Keeps the product top of mind.
- **One valuable email per month.** Short career/CV tip or product update. Builds habit and gives a reason to reopen the app.

---

## 7. PR and “social proof” without a big budget

- **Founder story.** “Why I built a CV tool that tailors to every job” — Medium, LinkedIn, or your blog. Easy to pick up by indie/product newsletters.
- **Testimonials.** Ask early users for one sentence + permission to use name/role. Put 3–5 on the landing and in the app. “X people have created tailored CVs” (if true) adds credibility.
- **“As used by” or “Featured in”.** When you get a single mention (newsletter, blog, forum), add it to the site. One logo or quote is enough to start.

---

## 8. Prioritization for “fast” organic growth

| Priority | Action | Why |
|----------|--------|-----|
| 1 | ~~Launch one free “viral” tool (score or keyword extractor)~~ Done. | Drives signups and shares. |
| 2 | ~~Share CTA + PDF footer branding~~ **Done** (share + “Powered by” for non‑premium). **Next:** referral tracking / UTM discipline + optional settings toggle for branding. |
| 3 | Publish 5–10 “CV for [Job Title]” pages + 2–3 “how to” posts | Captures high-intent search and builds topical authority. |
| 4 | Show up in 1–2 communities (e.g. r/resumes, LinkedIn) | Builds trust and direct traffic without ads. |
| 5 | Simple email sequence + one re-engagement email | Converts and brings back organic signups. |
| 6 | **Add payment** (after some traction) | Monetize users who already get value; keep free tier strong. |

Start with one item from the top two rows; measure signups and shares; then add the next. Organic growth compounds when you consistently ship one lever at a time and keep the product easy to try and share.
