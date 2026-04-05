import Script from 'next/script';
import { GA_MEASUREMENT_ID, GTM_ID, isAnalyticsEnabled } from '../lib/analytics';

/** GTM bootstrap (head, early). Shares `window.dataLayer` with gtag below. */
const gtmInline = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

const gtagInit = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`;

/**
 * Google Tag Manager + GA4 (gtag). Render once in root layout.
 * Avoid duplicate GA4: do not add a GA4 Configuration tag in GTM for the same
 * measurement ID as GA_MEASUREMENT_ID, or page_view will fire twice.
 */
export function AnalyticsScripts() {
  if (!isAnalyticsEnabled()) return null;

  return (
    <>
      <Script id="google-tag-manager" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: gtmInline }} />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-gtag" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: gtagInit }} />
    </>
  );
}

/** GTM noscript fallback: first child inside `<body>`. */
export function GoogleTagManagerNoScript() {
  if (!isAnalyticsEnabled()) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height={0}
        width={0}
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
