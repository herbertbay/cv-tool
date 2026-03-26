'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAdminDownloadLastCvUrl, getAdminUsers, type AdminUser } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { formatDate } from '../../lib/date';

const ADMIN_EMAILS = new Set(['herbert.bay@gmail.com']);

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <p className="text-slate-600 mb-6">Admin view of registered user emails.</p>
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">User ID</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">CVs generated</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Last used</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Download</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0 border-slate-100">
                    <td className="px-4 py-3 text-slate-900">{u.email}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.id}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(u.created_at, { includeTime: true })}</td>
                    <td className="px-4 py-3 text-slate-900 font-mono text-xs">{u.cv_generations_count}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(u.last_used_at, { includeTime: true })}</td>
                    <td className="px-4 py-3">
                      {u.last_used_at ? (
                        <a
                          href={getAdminDownloadLastCvUrl(u.id)}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Download last CV
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={6}>No users found.</td>
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
