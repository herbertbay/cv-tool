'use client';

import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { UserEmailMenu } from '../../components/UserEmailMenu';

export function CvCheckerHeader() {
  const { user } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
          Optimal CV
        </Link>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/" className="text-slate-600 hover:text-blue-700 text-sm">Home</Link>
          <Link href="/resources" className="text-slate-600 hover:text-blue-700 text-sm">Resources</Link>
          {user ? (
            <UserEmailMenu email={user.email} />
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-blue-700 text-sm">Sign in</Link>
              <Link href="/register" className="text-slate-600 hover:text-blue-700 text-sm">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
