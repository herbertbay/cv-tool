'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { atsMatchResult, atsMatchOptimize, type AtsMatchResultResponse, type AtsMatchOptimizeResponse } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

const OPTIMIZE_STORAGE_KEY = 'ats-optimized';

function ScoreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('result_token') || '';
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreData, setScoreData] = useState<AtsMatchResultResponse | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace('/ats-match');
      return;
    }
    if (!user) {
      router.replace(`/ats-match/sign-in?result_token=${encodeURIComponent(token)}`);
      return;
    }
    let cancelled = false;
    setLoading(true);
    atsMatchResult(token)
      .then((data) => { if (!cancelled) setScoreData(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, user, router]);

  const handleOptimize = async () => {
    if (!token) return;
    setOptimizeLoading(true);
    setError(null);
    try {
      const data = await atsMatchOptimize(token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`${OPTIMIZE_STORAGE_KEY}-${token}`, JSON.stringify(data));
      }
      router.push(`/ats-match/optimized?result_token=${encodeURIComponent(token)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to optimize');
    } finally {
      setOptimizeLoading(false);
    }
  };

  if (!token || !user) return null;
  if (loading) return <main className="mx-auto max-w-3xl px-6 pb-12"><p className="text-slate-600">Loading your score…</p></main>;
  if (error && !scoreData) {
    return (
      <main className="mx-auto max-w-3xl px-6 pb-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/ats-match" className="text-sm text-slate-600 hover:text-blue-700">← Start over</Link>
      </main>
    );
  }
  if (!scoreData) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Your ATS match score</h1>
      <p className="text-slate-600 mb-6">See how well your CV matches the job and how much you can improve.</p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Score</p>
        <p className="mt-2 text-4xl font-bold text-slate-900">{scoreData.score}<span className="text-2xl font-normal text-slate-500">/100</span></p>
        <p className="mt-4 text-slate-600">Get a tailored CV with Optimal CV to improve your score.</p>
        <button
          type="button"
          onClick={handleOptimize}
          disabled={optimizeLoading}
          className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {optimizeLoading ? 'Optimizing…' : 'See how much I can improve'}
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <p className="mt-6">
        <Link href="/ats-match" className="text-sm text-slate-500 hover:text-slate-700">← Back to upload</Link>
      </p>
    </main>
  );
}

export default function ScorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Loading…</p></div>}>
      <ScoreContent />
    </Suspense>
  );
}
