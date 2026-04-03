import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started — Create Your Tailored Resume | Optimal CV',
  description: 'Start building your profile and create resumes tailored to each job. Upload your resume or enter your experience to get started.',
  robots: { index: false, follow: false },
};

export default function GetStartedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
