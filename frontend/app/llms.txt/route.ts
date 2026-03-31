import { NextResponse } from 'next/server';
import { getSiteUrl } from '../lib/site';
import { CV_FOR_ROLES, GUIDE_ARTICLES } from '../lib/resources-data';

export function GET() {
  const base = getSiteUrl();
  const lines = [
    '# Optimal CV',
    '',
    '> Job-specific CV builder and motivation letter generator. One profile; tailored PDFs per job description.',
    '',
    '## Main',
    `- ${base}/`,
    `- ${base}/cv-checker`,
    '',
    '## Resources',
    `- ${base}/resources`,
    ...CV_FOR_ROLES.map((r) => `- ${base}/resources/cv-for/${r.slug}`),
    ...GUIDE_ARTICLES.map((g) => `- ${base}/resources/guides/${g.slug}`),
    '',
    '## Policy',
    'Public marketing and resource pages are intended for indexing. Authenticated areas (/dashboard, /profile, /admin) are not.',
    '',
  ];
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
