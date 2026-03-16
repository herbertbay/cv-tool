'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getJobApplications,
  createJobApplication,
  updateJobApplication,
  type JobApplication,
  type ApplicationStatus,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';

const APPLICATION_STATUSES: ApplicationStatus[] = ['Interested', 'Applied', 'Interview', 'Rejected', 'Offer'];

export function JobApplicationsHistory() {
  const { user } = useAuth();
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFullJobDescription, setNewFullJobDescription] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadJobApplications = useCallback(() => {
    if (!user) return;
    setHistoryLoading(true);
    getJobApplications(showArchived)
      .then(setJobApplications)
      .catch(() => setJobApplications([]))
      .finally(() => setHistoryLoading(false));
  }, [user, showArchived]);

  useEffect(() => {
    loadJobApplications();
  }, [loadJobApplications]);

  const handleAddApplication = useCallback(async () => {
    setAddSaving(true);
    try {
      const fullJob = newFullJobDescription.trim() || undefined;
      await createJobApplication({
        company_name: newCompany.trim() || undefined,
        job_title: newJobTitle.trim() || undefined,
        description: newDescription.trim() || undefined,
        full_job_description: fullJob,
        extract: !!fullJob,
      });
      setNewCompany('');
      setNewJobTitle('');
      setNewDescription('');
      setNewFullJobDescription('');
      setAddFormOpen(false);
      loadJobApplications();
    } finally {
      setAddSaving(false);
    }
  }, [newCompany, newJobTitle, newDescription, newFullJobDescription, loadJobApplications]);

  const handleStatusChange = useCallback(async (id: string, application_status: ApplicationStatus) => {
    setUpdatingId(id);
    try {
      await updateJobApplication(id, { application_status });
      loadJobApplications();
    } finally {
      setUpdatingId(null);
    }
  }, [loadJobApplications]);

  const handleArchive = useCallback(async (id: string, archived: boolean) => {
    setUpdatingId(id);
    try {
      await updateJobApplication(id, { archived });
      loadJobApplications();
    } finally {
      setUpdatingId(null);
    }
  }, [loadJobApplications]);

  const handleUpdateField = useCallback(async (id: string, field: 'company_name' | 'job_title', value: string) => {
    setUpdatingId(id);
    try {
      await updateJobApplication(id, { [field]: value || undefined });
      loadJobApplications();
    } finally {
      setUpdatingId(null);
    }
  }, [loadJobApplications]);

  if (!user) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800">History</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/applications"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Applications overview
          </Link>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
          <button
            type="button"
            onClick={() => setAddFormOpen((o) => !o)}
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {addFormOpen ? 'Cancel' : 'Add application'}
          </button>
        </div>
      </div>
      {addFormOpen && (
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Company</label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Company name"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Job title</label>
              <input
                type="text"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                placeholder="Job title"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-48"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Description (optional)</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Short description"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-56"
              />
            </div>
            <div className="w-full">
              <label className="block text-xs font-medium text-slate-500 mb-1">Or paste full job description (we&apos;ll extract company, title, etc.)</label>
              <textarea
                value={newFullJobDescription}
                onChange={(e) => setNewFullJobDescription(e.target.value)}
                placeholder="Paste the full job ad text…"
                rows={3}
                className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddApplication}
              disabled={addSaving}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {addSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
      <div className="p-6">
        {historyLoading && <p className="text-sm text-slate-500 py-4">Loading…</p>}
        {!historyLoading && jobApplications.length === 0 && (
          <p className="text-sm text-slate-500 py-4">No applications yet. Add one above or save from the CV checker.</p>
        )}
        {!historyLoading && jobApplications.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="grid gap-4 items-center px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200" style={{ gridTemplateColumns: 'minmax(120px, 1fr) minmax(140px, 1.2fr) 120px 100px' }}>
              <span>Company</span>
              <span>Job title</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            {jobApplications.map((app) => (
              <div key={app.id} className="grid gap-4 items-center px-4 py-3 text-sm border-b border-slate-100 last:border-0 hover:bg-slate-50/50" style={{ gridTemplateColumns: 'minmax(120px, 1fr) minmax(140px, 1.2fr) 120px 100px' }}>
                <input
                  type="text"
                  value={app.company_name}
                  onChange={(e) => setJobApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, company_name: e.target.value } : a)))}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v !== app.company_name) handleUpdateField(app.id, 'company_name', v); }}
                  placeholder="Company"
                  className="rounded border border-slate-200 px-2 py-1.5 text-slate-800 bg-white min-w-0"
                />
                <input
                  type="text"
                  value={app.job_title}
                  onChange={(e) => setJobApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, job_title: e.target.value } : a)))}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v !== app.job_title) handleUpdateField(app.id, 'job_title', v); }}
                  placeholder="Job title"
                  className="rounded border border-slate-200 px-2 py-1.5 text-slate-800 bg-white min-w-0"
                />
                <select
                  value={app.application_status}
                  onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                  disabled={updatingId === app.id}
                  className="rounded border border-slate-200 px-2 py-1.5 text-slate-800 bg-white text-sm"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="flex justify-end">
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
