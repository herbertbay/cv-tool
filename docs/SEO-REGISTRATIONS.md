# Where to register for SEO & discovery (3rd-party tools)

Use this after your production domain and **`NEXT_PUBLIC_SITE_URL`** match (e.g. `https://optimal.cv`).

## Essential (search)

1. **[Google Search Console](https://search.google.com/search-console)**  
   - Verify domain (DNS TXT or HTML file).  
   - Submit **`https://YOUR_DOMAIN/sitemap.xml`**.  
   - Monitor coverage, Core Web Vitals (CrUX), and queries.

2. **[Bing Webmaster Tools](https://www.bing.com/webmasters)**  
   - Import from Google or verify separately.  
   - Submit the same sitemap (Bing + Yahoo syndication).

3. **Google Business Profile** — Only if you have a **physical customer-facing location**; not required for a typical SaaS.

## Analytics (pick at least one)

4. **[Google Analytics 4](https://analytics.google.com)** (or **Plausible** / **Fathom** / **PostHog** for privacy-first).  
   - Install on the Next.js app; define conversions (signup, CV generated).

5. **[Google Tag Manager](https://tagmanager.google.com)** — Optional; use if marketing needs frequent pixel changes without deploys.

## Rich results & validation

6. **[Rich Results Test](https://search.google.com/test/rich-results)** — Paste public URLs to validate FAQ / Article / WebApplication JSON-LD.

7. **[Schema Markup Validator](https://validator.schema.org/)** — Paste JSON-LD snippets or URLs.

## Performance & quality

8. **[PageSpeed Insights](https://pagespeed.web.dev/)** — Lab + field (CrUX) for LCP, INP, CLS on key URLs (`/`, `/cv-checker`, `/resources/...`).

9. **[Cloudflare](https://www.cloudflare.com)** or your host’s CDN — Optional but common for TLS, caching, and security headers.

## Social / sharing (optional)

10. **[Open Graph / Twitter Card debuggers](https://developers.facebook.com/tools/debug/)** — Refresh OG cache after changing meta images or titles.

## App Store (ASO) — only if you ship iOS/Android

11. **[Apple App Store Connect](https://appstoreconnect.apple.com)** — App listing, keywords, screenshots, ASA.  
12. **[Google Play Console](https://play.google.com/console)** — Store listing, custom store listing experiments.

## LLM / AI discovery (optional)

13. No single “register for ChatGPT” step. **`/llms.txt`** is already served; keep it accurate.  
14. **Bing Chat / Copilot** — Indirectly influenced by Bing Webmaster indexing.  
15. **Perplexity / others** — No standard registration; good content + backlinks help.

---

**Checklist after go-live:** Search Console verified → sitemap submitted (Google + Bing) → spot-check 3–5 URLs in Rich Results Test → note baseline GA4 events.
