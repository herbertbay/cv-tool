import type { Metadata } from 'next';
import { CvCheckerHeader } from './components/CvCheckerHeader';

export const metadata: Metadata = {
  title: 'CV Checker — Check How Your CV Matches the Job',
  description: 'Upload your CV and job description. Get a match score and see how much you can improve with a tailored CV. Free tool by Optimal CV.',
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
