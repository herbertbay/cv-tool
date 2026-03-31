import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './lib/auth-context';
import { getSiteUrl } from './lib/site';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Optimal CV — Job-Specific CV Builder & Motivation Letter Generator',
    template: '%s | Optimal CV',
  },
  description: 'Create a CV tailored to every job you apply to. A job-specific CV builder that adapts your experience to each role so you pass modern screening and get shortlisted. Professional PDFs and motivation letters included.',
  keywords: ['resume builder', 'CV builder', 'job-specific resume', 'tailored CV', 'motivation letter generator', 'ATS resume', 'applicant tracking system', 'professional resume', 'resume optimizer', 'motivation letter'],
  authors: [{ name: 'Optimal CV' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Optimal CV',
    title: 'Optimal CV — Job-Specific CV Builder & Motivation Letter Generator',
    description: 'Your CV, tailored to every job you apply to. Stand out with job-specific CVs and motivation letters that get you shortlisted.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Optimal CV — Job-Specific Resume Builder',
    description: 'Create a CV tailored to every job. Professional PDFs and motivation letters that pass modern screening.',
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f172a'/></svg>",
  },
  robots: { index: true, follow: true },
};

const jsonLdGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Optimal CV',
      description:
        'Job-specific CV builder and motivation letter generator. Create a CV tailored to every job you apply to.',
      url: siteUrl,
      applicationCategory: 'BusinessApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'Organization',
      name: 'Optimal CV',
      url: siteUrl,
      description: 'Job-specific CV and motivation letter tool for applicants.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How is Optimal CV different from a regular resume builder?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'Most resume builders help you create one static CV. Optimal CV is built for applying to many jobs: you keep one profile and generate a new, tailored CV and motivation letter for each role. Your experience is rewritten and emphasized to match what each job description asks for, so you stay relevant to both hiring managers and applicant tracking systems.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is it free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'You can sign up and use Optimal CV to create job-specific CVs and motivation letters. Create an account to save your profile and access your generation history.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is my data safe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'We use your profile and job descriptions only to generate your tailored CV and motivation letter. We do not sell your data. You can delete your account and all associated data at any time from your profile settings.',
          },
        },
      ],
    },
  ],
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
