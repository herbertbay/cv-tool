# SEO, LLM discovery & ASO: technical + content checklist

Ordered todos to rank well in search engines (web) and app stores (ASO), including sitemaps, `robots.txt`, and LLM-oriented files.

**Suggested sequence:** crawlability → technical quality → content → authority → measurement → ASO (if you ship a mobile app).

---

## Phase 1: Crawling & indexation

1. **Decide primary domain** (www vs apex, one canonical host); **301** redirect all variants to canonical.
2. **`robots.txt`**: allow public marketing pages; block admin, auth, drafts, and low-value query-param URLs; reference sitemap URL(s).
3. **XML sitemap(s)**: include all indexable URLs, `lastmod` where accurate; split if approaching 50k URLs; submit in **Google Search Console** and **Bing Webmaster Tools**.
4. **Canonical tags** on every page template; resolve duplicates (trailing slash, tracking params, use GSC URL parameter tool or consistent canonicals).
5. **`noindex`** on thin or utility pages (login, internal tools, thank-you pages) where they should not compete in search.

---

## Phase 2: Technical SEO & performance

6. **Core Web Vitals** (LCP, INP, CLS) on key templates, **mobile first**; optimize images (dimensions, `fetchpriority`, modern formats), fonts, and JS budget.
7. **HTTPS** everywhere; **HSTS** when configuration is stable.
8. **Structured data (`JSON-LD`)**: `Organization` / `WebSite` (+ `SearchAction` if you have site search); `SoftwareApplication` if the product is an app; `FAQPage` / `HowTo` only where content truly matches Google’s guidelines.
9. **Clean URLs**, sensible **heading hierarchy** (one logical `h1` per page), internal links from high-traffic pages to conversion pages.
10. **Internationalization** (if multi-locale): `hreflang`, localized sitemaps or `x-default` as appropriate.

---

## Phase 3: Content & on-page

11. **Keyword / intent map**: one primary intent per URL; avoid cannibalization (merge or differentiate overlapping pages).
12. **Title tags + meta descriptions** per page type; unique, within reasonable pixel limits; aligned with search intent.
13. **Landing pages** for main jobs-to-be-done (e.g. “Resume for [role]”, “ATS checker”, “tailor resume to job”): clear H1, FAQ, proof (trust signals).
14. **E-E-A-T**: about/org pages, contact, privacy/terms; refresh dates where they improve trust.
15. **Image SEO**: descriptive filenames, meaningful `alt` text; **Open Graph / Twitter** images for sharing.

---

## Phase 4: LLM & AI-oriented discovery

16. **`/llms.txt`** (site root): short explanation of the site, links to key public URLs and docs; optional high-level policy on crawling/training (align with legal/comms).
17. **Clear product/about page**: factual, quotable copy (what it is, for whom, how it’s offered) that models and crawlers can summarize accurately.
18. **Keep sitemap and `llms.txt` aligned** when adding important public pages.
19. **Optional**: `humans.txt` if it fits brand; avoid conflicting statements across policy files.

---

## Phase 5: Off-site & authority

20. **Brand presence**: accurate listings on reputable directories where it makes sense (quality over quantity).
21. **Backlinks**: integrations, partners, original research or free tools worth citing.
22. **Social proof** on-site: case studies, testimonials, recognizable logos where authentic.

---

## Phase 6: Measurement & iteration

23. **Google Search Console + analytics**: monitor organic landings, queries, and CTR after title/meta experiments.
24. **Monitor** crawl errors, coverage issues, and manual actions.
25. **Quarterly refresh** of top organic URLs (stats, examples, screenshots, outdated claims).

---

## ASO (iOS / Android apps)

26. **Store listing**: keyword field (iOS), subtitle, short/long description; localized store strings where relevant.
27. **Creative**: screenshots and optional preview video; run store listing experiments where platforms allow.
28. **Ratings & reviews**: well-timed in-app prompts; respond to reviews.
29. **Deep links / universal links**; consistent naming and messaging vs web.
30. **Paid discovery (optional)**: Apple Search Ads, Google UAC, aligned with organic keyword themes.

---

## One-line order

**Robots + sitemap + canonicals → performance + schema → page content → `llms.txt` + key URLs → links → GSC loops → ASO in parallel if you have an app.**

---

*See also: [ORGANIC-GROWTH.md](./ORGANIC-GROWTH.md) for product-led growth and content ideas specific to Optimal CV.*

*Accounts to create (Search Console, Bing, analytics, etc.): [SEO-REGISTRATIONS.md](./SEO-REGISTRATIONS.md).*
