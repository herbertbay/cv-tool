'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getJobApplications,
  updateJobApplication,
  type JobApplication,
  type ApplicationStatus,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { formatDate } from '../lib/date';

const APPLICATION_STATUSES: ApplicationStatus[] = ['Interested', 'Applied', 'Interview', 'Rejected', 'Offer'];

/** History = generated CVs & motivation letters, augmented with job application data. Only shows applications that have a linked generated CV (session_id). */
export function JobApplicationsHistory({ refreshTrigger }: { refreshTrigger?: number } = {}) {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getJobApplications(showArchived)
      .then((list) => list.filter((a) => a.session_id))
      .then(setApplications)
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, [user, showArchived]);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  const handleStatusChange = useCallback(async (id: string, application_status: ApplicationStatus) => {
    setUpdatingId(id);
    try {
      await updateJobApplication(id, { application_status });
      load();
    } finally {
      setUpdatingId(null);
    }
  }, [load]);

  const handleArchive = useCallback(async (id: string, archived: boolean) => {
    setUpdatingId(id);
    try {
      await updateJobApplication(id, { archived });
      load();
    } finally {
      setUpdatingId(null);
    }
  }, [load]);

  if (!user) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">History</h2>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        </div>
      </div>
      <div className="p-6">
        {loading && <p className="text-sm text-slate-500 py-4">Loading…</p>}
        {!loading && applications.length === 0 && (
          <p className="text-sm text-slate-500 py-4">
            No history yet. Create a tailored CV (and optionally a motivation letter) to add your first entry.
          </p>
        )}
        {!loading && applications.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div
              className="grid gap-4 items-center px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200"
              style={{ gridTemplateColumns: 'minmax(120px, 1fr) minmax(140px, 1.2fr) 100px 100px 80px' }}
            >
              <span>Company</span>
              <span>Job title</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            {applications.map((app) => (
              <div
                key={app.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dashboard/applications/${app.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/dashboard/applications/${app.id}`); } }}
                className="grid gap-4 items-center px-4 py-3 text-sm border-b border-slate-100 last:border-0 hover:bg-slate-50/50 cursor-pointer"
                style={{ gridTemplateColumns: 'minmax(120px, 1fr) minmax(140px, 1.2fr) 100px 100px 80px' }}
              >
                <span className="text-slate-800 truncate" title={app.company_name ?? undefined}>
                  {app.company_name || '—'}
                </span>
                <span className="text-slate-700 truncate" title={app.job_title ?? undefined}>
                  {app.job_title || '—'}
                </span>
                <span className="text-slate-600 tabular-nums">{formatDate(app.application_date || app.created_at, { relative: true })}</span>
                <select
                  value={app.application_status}
                  onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  disabled={updatingId === app.id}
                  className="rounded border border-slate-200 px-2 py-1.5 text-slate-800 bg-white text-sm"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleArchive(app.id, !app.archived)}
                    disabled={updatingId === app.id}
                    className="text-slate-500 hover:text-slate-700 text-sm"
                  >
                    {app.archived ? 'Unarchive' : 'Archive'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
