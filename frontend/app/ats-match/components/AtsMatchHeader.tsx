'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

const STEPS = [
  { path: '/ats-match', label: 'Upload & job' },
  { path: '/ats-match/sign-in', label: 'View score' },
  { path: '/ats-match/score', label: 'View score' },
  { path: '/ats-match/optimized', label: 'Optimize' },
  { path: '/ats-match/complete', label: 'Create CV' },
];

function stepIndex(pathname: string): number {
  if (pathname === '/ats-match' || pathname.startsWith('/ats-match/analyzing')) return 0;
  if (pathname.startsWith('/ats-match/sign-in')) return 1;
  if (pathname.startsWith('/ats-match/score')) return 1;
  if (pathname.startsWith('/ats-match/optimized')) return 2;
  if (pathname.startsWith('/ats-match/complete')) return 3;
  return 0;
}

export function AtsMatchHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const current = stepIndex(pathname);

  return (
    <>
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-slate-600 hover:text-blue-700 text-sm">Home</Link>
            {user ? (
              <Link href="/dashboard" className="text-sm text-slate-500">{user.email}</Link>
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-blue-700 text-sm">Sign in</Link>
                <Link href="/register" className="text-slate-600 hover:text-blue-700 text-sm">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-2">
        <div className="mb-6 flex gap-1">
          {STEPS.filter((_, i) => i <= 3).map((s, i) => {
            const reached = current >= i;
            return (
              <div key={s.path} className="flex-1 flex flex-col items-center">
                <div
                  className={`h-1.5 w-full rounded-full ${reached ? 'bg-blue-600' : 'bg-slate-200'}`}
                  title={s.label}
                  aria-hidden
                />
                <span className="mt-1.5 text-xs text-slate-500 hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
