'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { adminDeleteUser, getAdminDownloadLastCvUrl, getAdminUsers, type AdminUser } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { formatDate } from '../../lib/date';

const ADMIN_EMAILS = new Set(['herbert.bay@gmail.com']);

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!ADMIN_EMAILS.has((user.email || '').toLowerCase().trim())) {
      setError('Admin access required');
      setLoading(false);
      return;
    }
    getAdminUsers()
      .then((rows) => setUsers(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [user]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalResumes = users.reduce((sum, u) => sum + (u.cv_generations_count ?? 0), 0);
    const usersWithResume = users.filter((u) => (u.cv_generations_count ?? 0) > 0).length;
    const avgPerUser = totalUsers > 0 ? totalResumes / totalUsers : 0;
    const pctUsersWithResume = totalUsers > 0 ? (100 * usersWithResume) / totalUsers : 0;
    const incompleteProfiles = users.filter((u) => u.profile_incomplete).length;
    return {
      totalUsers,
      totalResumes,
      usersWithResume,
      avgPerUser,
      pctUsersWithResume,
      incompleteProfiles,
    };
  }, [users]);

  const displayedUsers = useMemo(() => {
    if (!showIncompleteOnly) return users;
    return users.filter((u) => u.profile_incomplete);
  }, [users, showIncompleteOnly]);

  const handleDeleteUser = async (u: AdminUser) => {
    const confirmed = window.confirm(
      `Delete user ${u.email} and all associated data? This action cannot be undone.`
    );
    if (!confirmed) return;
    setError(null);
    setDeletingId(u.id);
    try {
      await adminDeleteUser(u.id);
      setUsers((prev) => prev.filter((row) => row.id !== u.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-blue-700 transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">All users</h1>
        <p className="text-slate-600 mb-4">
          Admin view of registered users. Required-profile completeness matches the dashboard (empty required fields block tailored CV generation).
        </p>
        <label className="mb-6 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showIncompleteOnly}
            onChange={(e) => setShowIncompleteOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show only users with incomplete required profile ({stats.incompleteProfiles})
        </label>
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && users.length > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total users</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stats.totalUsers}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Resumes generated (all)</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stats.totalResumes}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Avg resumes / user</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {stats.totalUsers > 0 ? stats.avgPerUser.toFixed(2) : '0'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Users with ≥1 resume</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {stats.usersWithResume}{' '}
                <span className="text-base font-normal text-slate-500">
                  ({stats.pctUsersWithResume.toFixed(1)}%)
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-amber-800">Incomplete required profile</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-950">
                {stats.incompleteProfiles}
                <span className="text-base font-normal text-amber-800/80">
                  {' '}
                  / {stats.totalUsers}
                </span>
              </p>
            </div>
          </div>
        )}
        {!loading && !error && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">User ID</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Required profile</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Profile reminder</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Resumes generated</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-700">% of all resumes</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Last used</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Download</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Delete</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b last:border-b-0 border-slate-100 ${u.profile_incomplete ? 'bg-amber-50/60' : ''}`}
                  >
                    <td className="px-4 py-3 text-slate-900">{u.email}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.id}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(u.created_at, { includeTime: true })}</td>
                    <td className="px-4 py-3">
                      {u.profile_incomplete ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          {u.profile_required_empty_count ?? '—'} empty
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-green-700">Complete</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {u.profile_incomplete_reminder_sent_at
                        ? formatDate(u.profile_incomplete_reminder_sent_at, { includeTime: true })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-mono text-xs">{u.cv_generations_count}</td>
                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                      {stats.totalResumes > 0
                        ? `${((100 * (u.cv_generations_count ?? 0)) / stats.totalResumes).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(u.last_used_at, { includeTime: true })}</td>
                    <td className="px-4 py-3">
                      {u.last_used_at ? (
                        <a
                          href={getAdminDownloadLastCvUrl(u.id)}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Download last resume
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        disabled={deletingId === u.id}
                        className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === u.id ? 'Deleting…' : 'Delete user'}
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedUsers.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={10}>
                      {users.length === 0 ? 'No users found.' : 'No users match this filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
