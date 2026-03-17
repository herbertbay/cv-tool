import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — Your CVs & Motivation Letters | Optimal CV',
  description: 'View and download your tailored CVs and motivation letters. Your history lives on the dashboard.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
