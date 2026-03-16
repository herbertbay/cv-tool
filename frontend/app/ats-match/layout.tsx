import type { Metadata } from 'next';
import { AtsMatchHeader } from './components/AtsMatchHeader';

export const metadata: Metadata = {
  title: 'CV ATS Match Score — Check How Your CV Matches the Job',
  description: 'Upload your CV and job description. Get an ATS match score and see how much you can improve with a tailored CV. Free tool by Optimal CV.',
};

export default function AtsMatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AtsMatchHeader />
      {children}
    </div>
  );
}
