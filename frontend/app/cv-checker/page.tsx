'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { atsMatchPrepare } from '../lib/api';
import { useAuth } from '../lib/auth-context';

function CvCheckerForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobInput, setJobInput] = useState('');
  const [jobIsUrl, setJobIsUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (user) {
        router.push(`/cv-checker/score?result_token=${encodeURIComponent(result_token)}`);
      } else {
        router.push(`/cv-checker/sign-in?result_token=${encodeURIComponent(result_token)}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 pb-12 pt-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden />
          <p className="mt-4 text-lg font-medium text-slate-800">Analyzing your CV and job description</p>
          <p className="mt-1 text-sm text-slate-500">This usually takes a few seconds…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pb-12 pt-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">CV checker</h1>
      <p className="text-slate-600 mb-6">
        {user
          ? 'Upload your CV and job description to see how well you match and get an optimized version.'
          : 'Upload your CV and job description to see how well you match. Sign up to view your score and get an optimized version.'}
      </p>
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
          Check my match
        </button>
      </form>
    </main>
  );
}

export default function CvCheckerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Loading…</p></div>}>
      <CvCheckerForm />
    </Suspense>
  );
}
