'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { atsMatchResult, atsMatchOptimize, type AtsMatchResultResponse, type AtsMatchOptimizeResponse } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

const OPTIMIZE_STORAGE_KEY = 'ats-optimized';

/** Derive a short job title from job_preview (first line, max 50 chars). */
function jobTitleFromPreview(jobPreview: string): string {
  const line = (jobPreview || '').split(/\r?\n/)[0]?.trim() || '';
  const cleaned = line.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 50) return cleaned.slice(0, 47) + '…';
  return cleaned || 'this job';
}

function JobFitScoreShare({ score, jobPreview }: { score: number; jobPreview: string }) {
  const [copied, setCopied] = useState(false);
  const jobTitle = jobTitleFromPreview(jobPreview);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/cv-checker` : '';
  const shareText = `My CV match score for ${jobTitle} is ${score}%! Check yours at Optimal CV.`;

  const onCopyLink = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  const linkedInUrl =
    shareUrl
      ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
      : '';
  const twitterUrl =
    shareUrl
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
      : '';

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-4 mt-6">
      <p className="text-base font-semibold text-slate-800">Share your Job Fit Score</p>
      <p className="mt-2 text-lg font-medium text-slate-900">
        Match Score: {score}% for {jobTitle}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        >
          {copied ? 'Link copied!' : 'Copy link'}
        </button>
        {linkedInUrl && (
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-[#0A66C2] px-3 py-2 text-sm font-medium text-white hover:bg-[#004182]"
          >
            Share on LinkedIn
          </a>
        )}
        {twitterUrl && (
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Share on X
          </a>
        )}
      </div>
    </div>
  );
}

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
      router.replace('/cv-checker');
      return;
    }
    if (!user) {
      router.replace(`/cv-checker/sign-in?result_token=${encodeURIComponent(token)}`);
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
      router.push(`/cv-checker/optimized?result_token=${encodeURIComponent(token)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to optimize');
    } finally {
      setOptimizeLoading(false);
    }
  };

  if (!token || !user) return null;
  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 pb-12 pt-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden />
          <p className="mt-4 text-lg font-medium text-slate-800">Loading your score</p>
          <p className="mt-1 text-sm text-slate-500">Fetching your match result…</p>
        </div>
      </main>
    );
  }
  if (error && !scoreData) {
    return (
      <main className="mx-auto max-w-3xl px-6 pb-12 pt-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/cv-checker" className="text-sm text-slate-600 hover:text-blue-700">← Start over</Link>
      </main>
    );
  }
  if (!scoreData) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-12 pt-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Your match score</h1>
      <p className="text-slate-600 mb-6">See how well your CV matches the job and how much you can improve.</p>
      {optimizeLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden />
          <p className="mt-4 text-lg font-medium text-slate-800">Optimizing your CV</p>
          <p className="mt-1 text-sm text-slate-500">Creating a tailored version and recalculating your score…</p>
        </div>
      ) : (
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
            See how much I can improve
          </button>
        </div>
      )}
      {!optimizeLoading && scoreData && (
        <JobFitScoreShare score={scoreData.score} jobPreview={scoreData.job_preview} />
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!optimizeLoading && (
        <p className="mt-6">
          <Link href="/cv-checker" className="text-sm text-slate-500 hover:text-slate-700">← Back to upload</Link>
        </p>
      )}
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
