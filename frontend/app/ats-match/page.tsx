'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  atsMatchPrepare,
  atsMatchResult,
  atsMatchOptimize,
  generateCV,
  downloadPdf,
  downloadLetterPdf,
  putUserData,
  type AtsMatchResultResponse,
  type AtsMatchOptimizeResponse,
  type Profile,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';

const STEPS = ['Upload & job', 'View score', 'Optimize', 'Create CV'] as const;

function AtsMatchContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('result_token') || '';

  const [step, setStep] = useState<'form' | 'auth_required' | 'score' | 'optimized' | 'creating' | 'done'>('form');
  const [resultToken, setResultToken] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobInput, setJobInput] = useState('');
  const [jobIsUrl, setJobIsUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scoreData, setScoreData] = useState<AtsMatchResultResponse | null>(null);
  const [optimizeData, setOptimizeData] = useState<AtsMatchOptimizeResponse | null>(null);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (tokenFromUrl && user) {
      setResultToken(tokenFromUrl);
      setStep('score');
      loadResult(tokenFromUrl);
    }
  }, [tokenFromUrl, user]);

  const loadResult = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await atsMatchResult(token);
      setScoreData(data);
      setStep('score');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile || !jobInput.trim()) {
      setError('Upload a PDF CV and enter the job description.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { result_token } = await atsMatchPrepare(cvFile, jobInput.trim());
      setResultToken(result_token);
      if (user) {
        await loadResult(result_token);
      } else {
        setStep('auth_required');
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('result_token', result_token);
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!resultToken) return;
    setOptimizeLoading(true);
    setError(null);
    try {
      const data = await atsMatchOptimize(resultToken);
      setOptimizeData(data);
      setScoreData((prev) => (prev ? { ...prev, score: data.new_score } : null));
      setStep('optimized');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to optimize');
    } finally {
      setOptimizeLoading(false);
    }
  };

  const handleCreateCV = async () => {
    if (!optimizeData?.tailored_profile || !optimizeData?.job_description) {
      setError('Missing data. Please try the optimize step again.');
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
      setStep('creating');
      await downloadPdf(res.session_id);
      if (res.motivation_letter?.trim()) {
        await downloadLetterPdf(res.session_id);
      }
      // Save profile so home page shows dashboard (generated CVs), not onboarding
      await putUserData({ profile, onboarding_complete: true });
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create CV');
    } finally {
      setCreateLoading(false);
    }
  };

  const currentStepIndex = step === 'form' ? 0 : step === 'auth_required' ? 1 : step === 'score' ? 1 : step === 'optimized' ? 2 : step === 'creating' || step === 'done' ? 3 : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-slate-600 hover:text-blue-700 text-sm">Home</Link>
            {user ? (
              <Link href="/" className="text-sm text-slate-500">{user.email}</Link>
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-blue-700 text-sm">Sign in</Link>
                <Link href="/register" className="text-slate-600 hover:text-blue-700 text-sm">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">CV / ATS match score</h1>
        <p className="text-slate-600 mb-6">
          {user
            ? 'Upload your CV and job description to see how well you match and get an optimized version.'
            : 'Upload your CV and job description to see how well you match. Sign up to view your score and get an optimized version.'}
        </p>

        {/* Progress: steps 1–4 */}
        <div className="mb-8 flex gap-1">
          {STEPS.map((label, i) => {
            const reached = currentStepIndex >= i || (step === 'auth_required' && i === 1);
            return (
              <div key={label} className="flex-1 flex flex-col items-center">
                <div
                  className={`h-1.5 w-full rounded-full ${reached ? 'bg-blue-600' : 'bg-slate-200'}`}
                  title={label}
                  aria-hidden
                />
                <span className="mt-1.5 text-xs text-slate-500 hidden sm:inline">{label}</span>
              </div>
            );
          })}
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CV (PDF)</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Job description</label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 mb-2">
                <input type="checkbox" checked={jobIsUrl} onChange={(e) => setJobIsUrl(e.target.checked)} />
                Paste URL instead of text
              </label>
              {jobIsUrl ? (
                <input
                  type="url"
                  value={jobInput}
                  onChange={(e) => setJobInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              ) : (
                <textarea
                  value={jobInput}
                  onChange={(e) => setJobInput(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : 'Check my match'}
            </button>
          </form>
        )}

        {step === 'auth_required' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-center">
              <p className="text-lg font-medium text-slate-800">Your ATS match score is ready.</p>
              <p className="mt-2 text-slate-600">Sign up to view it and see how much you can improve.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <Link
                  href={`/register?redirect=${encodeURIComponent(`/ats-match?result_token=${resultToken}`)}`}
                  className="inline-flex items-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
                >
                  Sign up
                </Link>
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/ats-match?result_token=${resultToken}`)}`}
                  className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        )}

        {step === 'score' && (loading ? (
          <p className="text-slate-600">Loading your score…</p>
        ) : scoreData ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Your ATS match score</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{scoreData.score}<span className="text-2xl font-normal text-slate-500">/100</span></p>
              <p className="mt-4 text-slate-600">Get a tailored CV with Optimal CV to improve your score.</p>
              <button
                onClick={handleOptimize}
                disabled={optimizeLoading}
                className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
              >
                {optimizeLoading ? 'Optimizing…' : 'See how much I can improve'}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : null)}

        {step === 'optimized' && optimizeData && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Optimized score</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{optimizeData.new_score}<span className="text-2xl font-normal text-slate-500">/100</span></p>
              <p className="mt-4 text-emerald-600 font-medium">
                +{optimizeData.improvement_pct}% improvement with a tailored CV
              </p>
              <p className="mt-2 text-slate-600">
                Your original score was {optimizeData.original_score}. Download your tailored CV and motivation letter now.
              </p>
              <button
                type="button"
                onClick={handleCreateCV}
                disabled={createLoading}
                className="mt-4 inline-flex rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
              >
                {createLoading ? 'Creating…' : 'Create tailored CV & letter'}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === 'creating' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center text-slate-600">
            Creating your CV and motivation letter…
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-lg font-medium text-slate-800">Your tailored CV and letter are ready</p>
              <p className="mt-2 text-slate-600">Check your downloads. Your profile is saved—create more job-specific CVs anytime.</p>
              <Link
                href="/"
                className="mt-4 inline-flex rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
              >
                View my CVs
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AtsMatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    }>
      <AtsMatchContent />
    </Suspense>
  );
}
