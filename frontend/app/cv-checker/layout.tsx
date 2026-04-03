import type { Metadata } from 'next';
import { CvCheckerHeader } from './components/CvCheckerHeader';
import { getSiteUrl } from '../lib/site';

export const metadata: Metadata = {
  title: 'Resume Checker — See How Your Resume Matches the Job',
  description: 'Upload your resume and job description. Get a match score and see how much you can improve with a tailored resume. Free tool by Optimal CV.',
  alternates: { canonical: '/cv-checker' },
  openGraph: {
    title: 'Free resume & job match checker | Optimal CV',
    description:
      'Upload your resume and job description (or URL). See your match score and improve with a tailored resume.',
    url: `${getSiteUrl()}/cv-checker`,
  },
};

export default function CvCheckerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <CvCheckerHeader />
      {children}
    </div>
  );
}
