/** Google Analytics 4 measurement ID (gtag.js). Override with NEXT_PUBLIC_GA_MEASUREMENT_ID. */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || 'G-PQ51Y7SHD6';

/** Google Tag Manager container ID. Override with NEXT_PUBLIC_GTM_ID. */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() || 'GTM-MB75ZCML';

/**
 * Whether to inject GTM + gtag. Off on localhost unless NEXT_PUBLIC_ANALYTICS_DEV=1.
 * Set NEXT_PUBLIC_DISABLE_ANALYTICS=true to turn off in any environment.
 */
export function isAnalyticsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DISABLE_ANALYTICS === 'true') return false;
  if (process.env.NODE_ENV === 'production') return true;
  return process.env.NEXT_PUBLIC_ANALYTICS_DEV === '1';
}
