import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CV_FOR_ROLES, getCvForRole } from '../../../lib/resources-data';
import { getSiteUrl } from '../../../lib/site';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return CV_FOR_ROLES.map((r) => ({ slug: r.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const role = getCvForRole(params.slug);
  if (!role) return { title: 'Not found' };
  const title = `Resume for ${role.title}`;
  return {
    title,
    description: role.metaDescription,
    alternates: { canonical: `/resources/cv-for/${role.slug}` },
    openGraph: {
      title: `${title} | Optimal CV`,
      description: role.metaDescription,
    },
  };
}

export default function CvForRolePage({ params }: Props) {
  const role = getCvForRole(params.slug);
  if (!role) notFound();

  const site = getSiteUrl();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Resume for ${role.title}`,
    description: role.metaDescription,
    url: `${site}/resources/cv-for/${role.slug}`,
    author: { '@type': 'Organization', name: 'Optimal CV' },
    publisher: { '@type': 'Organization', name: 'Optimal CV' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-slate-500">
          <Link href="/resources" className="hover:text-blue-800">
            Resources
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700">Resume for {role.title}</span>
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Resume for {role.title}
        </h1>
        <p className="mt-6 text-lg text-slate-600 leading-relaxed">{role.intro}</p>

        <h2 className="mt-10 text-xl font-semibold text-slate-900">Tips for this role</h2>
        <ol className="mt-4 space-y-4">
          {role.tips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-slate-700 leading-relaxed">
              <span className="font-semibold text-blue-800 tabular-nums shrink-0">{i + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-xl border border-blue-200 bg-blue-50/80 p-6">
          <p className="font-medium text-slate-900">Turn this into a tailored resume</p>
          <p className="mt-2 text-sm text-slate-600">
            Paste your next job description—Optimal CV rewrites your summary and experience to match, and exports a
            professional PDF.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
            >
              Get started free
            </Link>
            <Link
              href="/cv-checker"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Try the resume checker
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
