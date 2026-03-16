'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SignInContent() {
  const searchParams = useSearchParams();
  const resultToken = searchParams.get('result_token') || '';
  const redirectTo = resultToken
    ? `/cv-checker/score?result_token=${encodeURIComponent(resultToken)}`
    : '/cv-checker';

  return (
    <main className="mx-auto max-w-3xl px-6 pb-12 pt-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Your score is ready</h1>
      <p className="text-slate-600 mb-6">Sign up to view it and see how much you can improve.</p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href={`/register?redirect=${encodeURIComponent(redirectTo)}`}
            className="inline-flex items-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            Sign up
          </Link>
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-6">
          <Link href="/cv-checker" className="text-sm text-slate-500 hover:text-slate-700">← Back to upload</Link>
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Loading…</p></div>}>
      <SignInContent />
    </Suspense>
  );
}
