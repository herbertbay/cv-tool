import type { MetadataRoute } from 'next';
import { getSiteUrl } from './lib/site';
import { CV_FOR_ROLES, GUIDE_ARTICLES } from './lib/resources-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/cv-checker`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/resources`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ];

  for (const r of CV_FOR_ROLES) {
    entries.push({
      url: `${base}/resources/cv-for/${r.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  for (const g of GUIDE_ARTICLES) {
    entries.push({
      url: `${base}/resources/guides/${g.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    });
  }

  return entries;
}
