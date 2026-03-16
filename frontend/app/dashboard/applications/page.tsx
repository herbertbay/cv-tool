'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getProfile,
  getJobApplications,
  updateJobApplication,
  downloadPdf,
  downloadLetterPdf,
  getGeneratedCVs,
  type UserData,
  type JobApplication,
  type ApplicationStatus,
  type GeneratedCVItem,
} from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

const APPLICATION_STATUSES: ApplicationStatus[] = ['Interested', 'Applied', 'Interview', 'Rejected', 'Offer'];

function hasProfileData(p: UserData['profile']): boolean {
  return (
    Boolean(p?.full_name?.trim()) ||
    Boolean(p?.summary?.trim()) ||
    (p?.experience?.length ?? 0) > 0 ||
    (p?.education?.length ?? 0) > 0 ||
    (p?.skills?.length ?? 0) > 0
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatSalary(from: number | null, to: number | null): string {
  if (from == null && to == null) return '—';
  if (from != null && to != null && from === to) return `${from.toLocaleString()}`;
  const a = from != null ? from.toLocaleString() : '?';
  const b = to != null ? to.toLocaleString() : '?';
  return `${a} – ${b}`;
}

export default function ApplicationsOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [generatedList, setGeneratedList] = useState<GeneratedCVItem[]>([]);
  const [showArchived, setShowArchived] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    setLoading(true);
    getProfile()
      .then((data) => setUserData(data))
      .catch(() => setUserData(null))
      .finally(() => setLoading(false));
  }, [user, router]);

  const loadApplications = useCallback(() => {
    if (!user) return;
    getJobApplications(showArchived).then(setApplications).catch(() => setApplications([]));
  }, [user, showArchived]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    if (!user) return;
    getGeneratedCVs().then(setGeneratedList).catch(() => setGeneratedList([]));
  }, [user]);

  const handleArchive = useCallback(async (id: string, archived: boolean) => {
    setUpdatingId(id);
    try {
      await updateJobApplication(id, { archived });
      loadApplications();
    } finally {
      setUpdatingId(null);
    }
  }, [loadApplications]);

  const handleDownloadPdf = useCallback(async (sessionId: string) => {
    setDownloadError(null);
    try {
      await downloadPdf(sessionId);
    } catch {
      setDownloadError('Download failed');
    }
  }, []);

  const handleDownloadLetter = useCallback(async (sessionId: string) => {
    setDownloadError(null);
    try {
      await downloadLetterPdf(sessionId);
    } catch {
      setDownloadError('Download failed');
    }
  }, []);

  const linkedSessionIds = new Set(applications.map((a) => a.session_id).filter(Boolean) as string[]);
  const orphanGenerations = generatedList.filter((g) => !linkedSessionIds.has(g.session_id));

  if (!user) return null;
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (userData && (!userData.onboarding_complete || !hasProfileData(userData.profile))) {
    router.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-blue-700 transition-colors">Dashboard</Link>
            <Link href="/cv-checker" className="text-slate-600 hover:text-blue-700 transition-colors">CV checker</Link>
            <span className="text-sm text-slate-500">{user.email}</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Applications overview</h1>
            <p className="text-slate-600 mt-1">Details and download links for your job applications.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        </div>

        {downloadError && <p className="mb-4 text-sm text-red-600">{downloadError}</p>}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Job title</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Salary</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No applications yet. Add one from the dashboard.
                    </td>
                  </tr>
                )}
                {applications.map((app) => (
                  <React.Fragment key={app.id}>
                    <tr
                      key={app.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {formatDate(app.application_date || app.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{app.company_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-800">{app.job_title || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={app.description || undefined}>
                        {app.description ? (app.description.length > 60 ? `${app.description.slice(0, 60)}…` : app.description) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {app.application_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatSalary(app.salary_from, app.salary_to)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          {expandedId === app.id ? 'Hide details' : 'Details'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(app.id, !app.archived)}
                          disabled={updatingId === app.id}
                          className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
                        >
                          {app.archived ? 'Unarchive' : 'Archive'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === app.id && (
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-3 text-sm">
                            {app.job_url && (
                              <p>
                                <span className="font-medium text-slate-600">Job link:</span>{' '}
                                <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {app.job_url}
                                </a>
                              </p>
                            )}
                            {app.full_job_description && (
                              <div>
                                <p className="font-medium text-slate-600 mb-1">Full job description</p>
                                <div className="rounded-lg border border-slate-200 bg-white p-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-slate-700">
                                  {app.full_job_description}
                                </div>
                              </div>
                            )}
                            {app.session_id ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadPdf(app.session_id!)}
                                  className="inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                                >
                                  Download CV (PDF)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadLetter(app.session_id!)}
                                  className="inline-flex rounded-lg bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                                >
                                  Download letter (PDF)
                                </button>
                              </div>
                            ) : (
                              <p className="text-slate-500">No generated CV linked to this application.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {orphanGenerations.length > 0 && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-base font-semibold text-slate-800">Other generated CVs</h2>
              <p className="text-sm text-slate-500 mt-0.5">CVs not linked to an application above.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Job description</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orphanGenerations.map((item) => (
                    <tr key={item.session_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-700">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-md truncate" title={item.job_description || undefined}>
                        {item.job_description ? (item.job_description.length > 50 ? `${item.job_description.slice(0, 50)}…` : item.job_description) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(item.session_id)}
                          className="inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 mr-2"
                        >
                          CV (PDF)
                        </button>
                        {item.has_letter_pdf && (
                          <button
                            type="button"
                            onClick={() => handleDownloadLetter(item.session_id)}
                            className="inline-flex rounded-lg bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                          >
                            Letter (PDF)
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-6">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Back to dashboard</Link>
        </p>
      </main>
    </div>
  );
}
