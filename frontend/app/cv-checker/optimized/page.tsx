'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  generateCV,
  downloadPdf,
  downloadLetterPdf,
  putUserData,
  createJobApplication,
  type AtsMatchOptimizeResponse,
  type Profile,
} from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

const OPTIMIZE_STORAGE_KEY = 'ats-optimized';

function OptimizedShareCTA() {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/cv-checker` : '';
  const onCopy = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-4">
      <p className="text-base font-semibold text-slate-800">Share with a friend</p>
      <p className="mt-1 text-sm text-slate-600">Know someone job hunting? Send them the free CV checker.</p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
      >
        {copied ? 'Link copied!' : 'Copy link'}
      </button>
    </div>
  );
}

function OptimizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('result_token') || '';
  const [optimizeData, setOptimizeData] = useState<AtsMatchOptimizeResponse | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace('/cv-checker');
      return;
    }
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(`${OPTIMIZE_STORAGE_KEY}-${token}`) : null;
      if (raw) setOptimizeData(JSON.parse(raw) as AtsMatchOptimizeResponse);
      else router.replace(`/cv-checker/score?result_token=${encodeURIComponent(token)}`);
    } catch {
      router.replace('/cv-checker');
    }
  }, [token, router]);

  const handleCreateCV = async () => {
    if (!optimizeData?.tailored_profile || !optimizeData?.job_description) {
      setError('Missing data. Go back and try "See how much I can improve" again.');
      return;
    }
    setCreateLoading(true);
    setError(null);
    try {
      const profile = optimizeData.tailored_profile as unknown as Profile;
      const res = await generateCV({
        profile,
        job_description: optimizeData.job_description,
        additional_urls: [],
        language: 'en',
        template: 'cv_base.html',
        pre_tailored_summary: optimizeData.tailored_summary,
        pre_tailored_experience: optimizeData.tailored_experience,
        pre_motivation_letter: optimizeData.motivation_letter ?? undefined,
        pre_keywords_to_highlight: optimizeData.keywords_to_highlight ?? undefined,
      });
      await downloadPdf(res.session_id);
      if (res.motivation_letter?.trim()) await downloadLetterPdf(res.session_id);
      await createJobApplication({
        session_id: res.session_id,
        full_job_description: optimizeData.job_description || undefined,
        application_date: new Date().toISOString().slice(0, 10),
        extract: true,
      });
      await putUserData({ profile, onboarding_complete: true });
      if (typeof window !== 'undefined') sessionStorage.removeItem(`${OPTIMIZE_STORAGE_KEY}-${token}`);
      router.push('/cv-checker/complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create CV');
    } finally {
      setCreateLoading(false);
    }
  };

  if (!optimizeData) return <main className="mx-auto max-w-3xl px-6 pb-12 pt-8"><p className="text-slate-600">Loading…</p></main>;

  const hasImprovement = optimizeData.improvement_pct > 0 || optimizeData.improvement > 0;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-12 pt-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Optimized score</h1>
      <p className="text-slate-600 mb-6">
        {hasImprovement
          ? 'Your tailored CV would score higher. Create it now.'
          : 'Your CV already matches this role well. We\'ve still tailored it for this role — create and download it below.'}
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">New score</p>
        <p className="mt-2 text-4xl font-bold text-slate-900">{optimizeData.new_score}<span className="text-2xl font-normal text-slate-500">/100</span></p>
        {hasImprovement ? (
          <>
            <p className="mt-4 text-emerald-600 font-medium">+{optimizeData.improvement_pct}% improvement with a tailored CV</p>
            <p className="mt-2 text-slate-600">Your original score was {optimizeData.original_score}. Download your tailored CV and motivation letter.</p>
          </>
        ) : (
          <p className="mt-4 text-slate-600">Your profile already fits this job. We&apos;ve tailored your CV to the role — download it below.</p>
        )}
        <button
          type="button"
          onClick={handleCreateCV}
          disabled={createLoading}
          className="mt-4 inline-flex rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {createLoading ? 'Creating…' : 'Create tailored CV & motivation letter'}
        </button>
      </div>
      <div className="mt-6">
        <OptimizedShareCTA />
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <p className="mt-6">
        <Link href={`/cv-checker/score?result_token=${encodeURIComponent(token)}`} className="text-sm text-slate-500 hover:text-slate-700">← Back to score</Link>
      </p>
    </main>
  );
}

export default function OptimizedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Loading…</p></div>}>
      <OptimizedContent />
    </Suspense>
  );
}
