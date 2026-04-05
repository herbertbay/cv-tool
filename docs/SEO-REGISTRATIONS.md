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

3. **Google Business Profile**: Only if you have a **physical customer-facing location**; not required for a typical SaaS.

## Analytics

4. **GA4 + Tag Manager (in app)**: Root layout loads **both**:
   - **gtag.js** with measurement ID `G-PQ51Y7SHD6` (override: `NEXT_PUBLIC_GA_MEASUREMENT_ID`)
   - **GTM** `GTM-MB75ZCML` (override: `NEXT_PUBLIC_GTM_ID`)
   - Scripts run in **production** only. Local testing: `NEXT_PUBLIC_ANALYTICS_DEV=1`. Disable anywhere: `NEXT_PUBLIC_DISABLE_ANALYTICS=true`.

5. **Avoid double-counting GA4**: The site already sends page views via **gtag**. In the GTM web UI, **do not** add a second **Google Analytics: GA4 Configuration** tag for the same measurement ID, or every page view will be duplicated. Use GTM for **other** tags (Google Ads, Meta, etc.), or remove gtag from the app and configure GA4 **only** inside GTM (pick one source of truth for GA4).

6. **[Google Analytics 4](https://analytics.google.com)**: Define conversions (e.g. signup, resume generated).

7. **[Google Tag Manager](https://tagmanager.google.com)**: Publish non-GA tags here; use Preview mode to verify before publishing.

## Rich results & validation

8. **[Rich Results Test](https://search.google.com/test/rich-results)**: Paste public URLs to validate FAQ / Article / Service + Organization JSON-LD.

9. **[Schema Markup Validator](https://validator.schema.org/)**: Paste JSON-LD snippets or URLs.

## Performance & quality

10. **[PageSpeed Insights](https://pagespeed.web.dev/)**: Lab + field (CrUX) for LCP, INP, CLS on key URLs (`/`, `/cv-checker`, `/resources/...`).

11. **[Cloudflare](https://www.cloudflare.com)** or your host’s CDN: Optional but common for TLS, caching, and security headers.

## Social / sharing (optional)

12. **[Open Graph / Twitter Card debuggers](https://developers.facebook.com/tools/debug/)**: Refresh OG cache after changing meta images or titles.

## App Store (ASO): only if you ship iOS/Android

13. **[Apple App Store Connect](https://appstoreconnect.apple.com)**: App listing, keywords, screenshots, ASA.  
14. **[Google Play Console](https://play.google.com/console)**: Store listing, custom store listing experiments.

## LLM / AI discovery (optional)

15. No single “register for ChatGPT” step. **`/llms.txt`** is already served; keep it accurate.  
16. **Bing Chat / Copilot**: Indirectly influenced by Bing Webmaster indexing.  
17. **Perplexity / others**: No standard registration; good content + backlinks help.

---

**Checklist after go-live:** Search Console verified → sitemap submitted (Google + Bing) → spot-check 3–5 URLs in Rich Results Test → note baseline GA4 events.
