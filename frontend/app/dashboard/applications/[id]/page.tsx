'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  getJobApplication,
  updateJobApplication,
  downloadPdf,
  downloadLetterPdf,
  type JobApplication,
  type ApplicationStatus,
} from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const APPLICATION_STATUSES: ApplicationStatus[] = ['Interested', 'Applied', 'Interview', 'Rejected', 'Offer'];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const { user } = useAuth();
  const [app, setApp] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    company_name: '',
    job_title: '',
    description: '',
    application_status: 'Interested' as ApplicationStatus,
    application_date: '',
    job_url: '',
  });

  const load = useCallback(() => {
    if (!id || !user) return;
    setLoading(true);
    getJobApplication(id)
      .then((data) => {
        setApp(data);
        setEdit({
          company_name: data.company_name ?? '',
          job_title: data.job_title ?? '',
          description: data.description ?? '',
          application_status: (data.application_status as ApplicationStatus) ?? 'Interested',
          application_date: data.application_date ?? '',
          job_url: data.job_url ?? '',
        });
      })
      .catch(() => setApp(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  const handleSave = useCallback(async () => {
    if (!id || !app) return;
    setSaving(true);
    try {
      await updateJobApplication(id, {
        company_name: edit.company_name.trim() || undefined,
        job_title: edit.job_title.trim() || undefined,
        description: edit.description.trim() || undefined,
        application_status: edit.application_status,
        application_date: edit.application_date.trim() || null,
        job_url: edit.job_url.trim() || null,
      });
      setApp((prev) => prev ? { ...prev, ...edit } : null);
    } finally {
      setSaving(false);
    }
  }, [id, app, edit]);

  const handleDownloadPdf = useCallback(async () => {
    if (!app?.session_id) return;
    setDownloadError(null);
    try {
      await downloadPdf(app.session_id);
    } catch {
      setDownloadError('Download failed');
    }
  }, [app?.session_id]);

  const handleDownloadLetter = useCallback(async () => {
    if (!app?.session_id) return;
    setDownloadError(null);
    try {
      await downloadLetterPdf(app.session_id);
    } catch {
      setDownloadError('Download failed');
    }
  }, [app?.session_id]);

  if (!user) return null;
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (!app) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto max-w-6xl px-6 py-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-blue-700">← Dashboard</Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-slate-600">Application not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-blue-700">Dashboard</Link>
            <Link href="/dashboard/applications" className="text-slate-600 hover:text-blue-700">Applications</Link>
            <span className="text-sm text-slate-500">{user.email}</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="mb-6">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Back to dashboard</Link>
        </p>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
            <h1 className="text-xl font-semibold text-slate-800">Job application</h1>
            <p className="text-sm text-slate-500 mt-0.5">Edit fields if something was missing, then download your CV and letter.</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Company</label>
              <input
                type="text"
                value={edit.company_name}
                onChange={(e) => setEdit((p) => ({ ...p, company_name: e.target.value }))}
                onBlur={handleSave}
                placeholder="Company name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Job title</label>
              <input
                type="text"
                value={edit.job_title}
                onChange={(e) => setEdit((p) => ({ ...p, job_title: e.target.value }))}
                onBlur={handleSave}
                placeholder="Job title"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Short description (optional)</label>
              <input
                type="text"
                value={edit.description}
                onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))}
                onBlur={handleSave}
                placeholder="Brief description"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Status</label>
              <select
                value={edit.application_status}
                onChange={(e) => {
                  const v = e.target.value as ApplicationStatus;
                  setEdit((p) => ({ ...p, application_status: v }));
                  updateJobApplication(app.id, { application_status: v }).catch(() => {});
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Application date (optional)</label>
              <input
                type="text"
                value={edit.application_date}
                onChange={(e) => setEdit((p) => ({ ...p, application_date: e.target.value }))}
                onBlur={handleSave}
                placeholder="YYYY-MM-DD"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Job URL (optional)</label>
              <input
                type="url"
                value={edit.job_url}
                onChange={(e) => setEdit((p) => ({ ...p, job_url: e.target.value }))}
                onBlur={handleSave}
                placeholder="https://…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            {app.session_id && (
              <div className="pt-6 border-t border-slate-200">
                <h2 className="text-sm font-semibold text-slate-800 mb-3">Generated documents</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Download CV (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadLetter}
                    className="inline-flex rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Download motivation letter (PDF)
                  </button>
                </div>
                {downloadError && <p className="mt-2 text-sm text-red-600">{downloadError}</p>}
              </div>
            )}

            {app.full_job_description && (
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Full job description</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">
                  {app.full_job_description}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
