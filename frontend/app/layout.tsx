import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CV-Tool — Tailored CVs & Motivation Letters',
  description: 'Generate tailored CVs and motivation letters for job applications.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%232563eb'/></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
