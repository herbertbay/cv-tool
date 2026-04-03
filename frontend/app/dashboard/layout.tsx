import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — Your Resumes & Motivation Letters | Optimal CV',
  description: 'View and download your tailored resumes and motivation letters. Your history lives on the dashboard.',
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
