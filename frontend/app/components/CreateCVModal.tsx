'use client';

import { useState } from 'react';
import type { GenerateCVResponse } from '../lib/api';
import {
  CV_TEMPLATE_BASELINE,
  CV_TEMPLATE_THEMES,
  DEFAULT_CV_ACCENT,
  normalizeClientAccentHex,
} from '../lib/cv-templates';

function ShareOptimalCV() {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="pt-2 border-t border-slate-100">
      <p className="text-sm text-slate-600 mb-2">Share Optimal CV with a friend</p>
      <button type="button" onClick={handleCopy} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}

export function CreateCVModal({
  jobDescription,
  setJobDescription,
  jobIsUrl,
  setJobIsUrl,
  template,
  setTemplate,
  templateAccent,
  setTemplateAccent,
  progress,
  error,
  result,
  onFetchJob,
  onGenerate,
  onClose,
  onDownloadPdf,
  onDownloadLetter,
}: {
  jobDescription: string;
  setJobDescription: (v: string) => void;
  jobIsUrl: boolean;
  setJobIsUrl: (v: boolean) => void;
  template: string;
  setTemplate: (v: string) => void;
  templateAccent: string;
  setTemplateAccent: (v: string) => void;
  progress: string;
  error: string | null;
  result: GenerateCVResponse | null;
  onFetchJob: () => void;
  onGenerate: () => void;
  onClose: () => void;
  onDownloadPdf: (sessionId: string) => Promise<void>;
  onDownloadLetter: (sessionId: string) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Create tailored resume &amp; motivation letter</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job description (optional)</label>
            <div className="flex gap-2 mb-1">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={!jobIsUrl} onChange={() => setJobIsUrl(false)} /> Paste text
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={jobIsUrl} onChange={() => setJobIsUrl(true)} /> URL
              </label>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={jobIsUrl ? 'https://…' : 'Paste job description…'}
            />
            {jobIsUrl && (
              <button type="button" onClick={onFetchJob} className="mt-1 text-sm text-blue-600 hover:underline">
                Fetch from URL
              </button>
            )}
          </div>

          {/* Language dropdown hidden for now; default language is English ('en'). */}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resume template</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <optgroup label="Baseline">
                  {CV_TEMPLATE_BASELINE.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Creative themes">
                  {CV_TEMPLATE_THEMES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Accent color</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  aria-label="Resume accent color"
                  value={normalizeClientAccentHex(templateAccent || DEFAULT_CV_ACCENT)}
                  onChange={(e) => setTemplateAccent(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded border border-slate-300 bg-white p-1"
                />
                <input
                  type="text"
                  value={templateAccent}
                  onChange={(e) => setTemplateAccent(e.target.value)}
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm font-mono"
                  placeholder="#2563eb"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Used for headings, links, and highlights in the PDF.</p>
            </div>
          </div>

          {progress && <p className="text-sm text-blue-600">{progress}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onGenerate} disabled={!!progress} className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50">
              {progress ? 'Working…' : 'Generate'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>

          {result && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
              <p className="text-sm font-medium text-slate-700">Done. Download your files:</p>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => onDownloadPdf(result.session_id)} className="inline-flex justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  Download resume (PDF)
                </button>
                {result.motivation_letter?.trim() && (
                  <button type="button" onClick={() => onDownloadLetter(result.session_id)} className="inline-flex justify-center rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                    Download motivation letter (PDF)
                  </button>
                )}
              </div>
              <ShareOptimalCV />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
