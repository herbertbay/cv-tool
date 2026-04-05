import type { Metadata } from 'next';
import Link from 'next/link';
import { CV_FOR_ROLES, GUIDE_ARTICLES } from '../lib/resources-data';

export const metadata: Metadata = {
  title: 'Resources',
  alternates: { canonical: '/resources' },
};

export default function ResourcesIndexPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Resources</h1>
      <p className="mt-4 text-lg text-slate-600">
        Practical guides and role-specific resume tips. Every page links to{' '}
        <Link href="/register" className="text-blue-800 font-medium hover:underline">
          Optimal CV
        </Link>{' '}
        so you can turn advice into a tailored PDF in minutes.
      </p>

      <section className="mt-12" aria-labelledby="guides-heading">
        <h2 id="guides-heading" className="text-xl font-semibold text-slate-900">
          How-to guides
        </h2>
        <ul className="mt-4 space-y-3">
          {GUIDE_ARTICLES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/resources/guides/${g.slug}`}
                className="text-blue-800 font-medium hover:underline"
              >
                {g.title}
              </Link>
              <p className="text-sm text-slate-600 mt-0.5">
                {g.metaDescription.length > 130 ? `${g.metaDescription.slice(0, 130).trim()}…` : g.metaDescription}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="roles-heading">
        <h2 id="roles-heading" className="text-xl font-semibold text-slate-900">
          Resume tips by job title
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {CV_FOR_ROLES.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/resources/cv-for/${r.slug}`}
                className="text-blue-800 font-medium hover:underline"
              >
                Resume for {r.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 text-slate-600">
        <Link href="/cv-checker" className="text-blue-800 font-medium hover:underline">
          Free ATS resume checker
        </Link>
        {': '}upload your resume and a job description to see how well you match before you apply.
      </p>
    </article>
  );
}
