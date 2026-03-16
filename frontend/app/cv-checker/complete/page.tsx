'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';

function ShareCTA() {
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

export default function CompletePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-12 pt-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">You're all set</h1>
      <p className="text-slate-600 mb-6">Your tailored CV and letter are ready. Your profile is saved—create more job-specific CVs anytime.</p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-medium text-slate-800">Your tailored CV and letter are ready</p>
        <p className="mt-2 text-slate-600">Check your downloads.</p>
        <div className="mt-4">
          <Link href="/dashboard" className="inline-flex rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900">
            View my CVs
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <ShareCTA />
      </div>
      <p className="mt-6">
        <Link href="/cv-checker" className="text-sm text-slate-500 hover:text-slate-700">Check another job</Link>
      </p>
    </main>
  );
}
