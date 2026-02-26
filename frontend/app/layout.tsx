import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './lib/auth-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://optimalcv.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Optimal CV — Job-Specific Resume Builder & Cover Letter Generator',
    template: '%s | Optimal CV',
  },
  description: 'Create a CV tailored to every job you apply to. Free resume builder that adapts your experience to each role so you pass applicant tracking and get shortlisted. Professional PDFs and cover letters included.',
  keywords: ['resume builder', 'CV builder', 'job-specific resume', 'tailored CV', 'cover letter generator', 'ATS resume', 'applicant tracking system', 'professional resume', 'resume optimizer', 'motivation letter'],
  authors: [{ name: 'Optimal CV' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Optimal CV',
    title: 'Optimal CV — Job-Specific Resume Builder & Cover Letter Generator',
    description: 'Your resume, tailored to every job you apply to. Stand out with job-specific CVs and cover letters that get you shortlisted.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Optimal CV — Job-Specific Resume Builder',
    description: 'Create a CV tailored to every job. Professional PDFs and cover letters that pass modern screening.',
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f172a'/></svg>",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Optimal CV',
  description: 'Job-specific resume builder and cover letter generator. Create a CV tailored to every job you apply to.',
  url: siteUrl,
  applicationCategory: 'BusinessApplication',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
