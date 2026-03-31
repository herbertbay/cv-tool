/** Canonical site origin (no trailing slash). Set NEXT_PUBLIC_SITE_URL in production. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  return raw || 'https://optimalcv.com';
}
