import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Resources: Resume tips, job titles & guides',
  description:
    'Free guides: tailor your resume to a job description, pass ATS screening, and role-specific tips for software engineers, marketers, nurses, and more. Optimal CV.',
  openGraph: {
    title: 'Resources: Resume tips & guides | Optimal CV',
    description:
      'How-to articles and resume tips by job title. Build job-specific resumes and motivation letters with Optimal CV.',
  },
};

export default function ResourcesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold text-slate-900 hover:text-blue-800">
            Optimal CV
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/resources" className="text-blue-800">
              Resources
            </Link>
            <Link href="/cv-checker" className="hover:text-slate-900">
              Resume checker
            </Link>
            <Link href="/register" className="text-blue-800 hover:text-blue-900">
              Get started free
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-slate-200 bg-white py-8 mt-12">
        <div className="mx-auto max-w-3xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <span>Ready for a resume tailored to your next job?</span>
          <Link
            href="/register"
            className="inline-flex rounded-lg bg-blue-800 px-4 py-2 font-medium text-white hover:bg-blue-900"
          >
            Build your tailored resume
          </Link>
        </div>
      </footer>
    </div>
  );
}
