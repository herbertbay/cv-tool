import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started — Create Your Tailored CV | Optimal CV',
  description: 'Start building your profile and create CVs tailored to each job. Upload your resume or enter your experience to get started.',
};

export default function GetStartedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
