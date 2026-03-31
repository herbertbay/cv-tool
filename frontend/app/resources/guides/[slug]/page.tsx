import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GUIDE_ARTICLES, getGuide } from '../../../lib/resources-data';
import { getSiteUrl } from '../../../lib/site';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return GUIDE_ARTICLES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const guide = getGuide(params.slug);
  if (!guide) return { title: 'Not found' };
  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: { canonical: `/resources/guides/${guide.slug}` },
    openGraph: {
      title: `${guide.title} | Optimal CV`,
      description: guide.metaDescription,
    },
  };
}

export default function GuidePage({ params }: Props) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const site = getSiteUrl();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.metaDescription,
    url: `${site}/resources/guides/${guide.slug}`,
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
          <span className="text-slate-700">Guides</span>
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{guide.title}</h1>
        <p className="mt-6 text-lg text-slate-600 leading-relaxed">{guide.intro}</p>

        <div className="mt-10 space-y-10">
          {guide.sections.map((sec) => (
            <section key={sec.heading}>
              <h2 className="text-xl font-semibold text-slate-900">{sec.heading}</h2>
              <p className="mt-3 text-slate-700 leading-relaxed">{sec.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-blue-200 bg-blue-50/80 p-6">
          <p className="font-medium text-slate-900">Apply this with Optimal CV</p>
          <p className="mt-2 text-sm text-slate-600">
            Save one profile, paste any job description, and download a tailored CV and motivation letter as PDFs.
          </p>
          <Link
            href="/register"
            className="mt-4 inline-flex rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            Create your tailored CV
          </Link>
        </div>
      </article>
    </>
  );
}
