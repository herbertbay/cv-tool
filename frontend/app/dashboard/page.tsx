'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getProfile,
  getGeneratedCVs,
  type UserData,
  type GeneratedCVItem,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { JobApplicationsHistory } from '../components/JobApplicationsHistory';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
];

function hasProfileData(p: UserData['profile']): boolean {
  return (
    Boolean(p?.full_name?.trim()) ||
    Boolean(p?.summary?.trim()) ||
    (p?.experience?.length ?? 0) > 0 ||
    (p?.education?.length ?? 0) > 0 ||
    (p?.skills?.length ?? 0) > 0
  );
}

function formatDate(createdAt: string) {
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return createdAt;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24 && now.getDate() === d.getDate()) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) return 'yesterday';
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch {
    return createdAt;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatedList, setGeneratedList] = useState<GeneratedCVItem[]>([]);
  const [listLoading, setListLoading] = useState(true);

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

  useEffect(() => {
    if (!user) return;
    setListLoading(true);
    getGeneratedCVs()
      .then(setGeneratedList)
      .catch(() => setGeneratedList([]))
      .finally(() => setListLoading(false));
  }, [user]);

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
            <Link href="/cv-checker" className="text-slate-600 hover:text-blue-700 transition-colors">CV checker</Link>
            <span className="text-sm text-slate-500">{user.email}</span>
            <button type="button" onClick={() => logout()} className="text-sm text-slate-600 hover:text-slate-900">
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600 mb-6">Your generated CVs and motivation letters.</p>
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/?create=1"
            className="inline-flex items-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            Create CV & motivation letter
          </Link>
          <Link href="/profile" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Edit profile
          </Link>
          <Link href="/cv-checker" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            CV checker
          </Link>
        </div>

        <JobApplicationsHistory />
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-800">Generated CVs & motivation letters</h2>
            <Link
              href="/dashboard/applications"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View overview &amp; download
            </Link>
          </div>
          <div className="p-6">
            {listLoading && <p className="text-sm text-slate-500 py-4">Loading…</p>}
            {!listLoading && generatedList.length === 0 && (
              <p className="text-sm text-slate-500 py-4">No generated CVs yet. Use &quot;Create CV & motivation letter&quot; above.</p>
            )}
            {!listLoading && generatedList.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div
                  className="grid gap-4 items-center px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200"
                  style={{ gridTemplateColumns: 'minmax(140px, 1fr) minmax(80px, 0.6fr) minmax(160px, 2fr)' }}
                >
                  <span>Date</span>
                  <span>Language</span>
                  <span>Job description</span>
                </div>
                {generatedList.map((item) => (
                  <div
                    key={item.session_id}
                    className="grid gap-4 items-center px-4 py-3 text-sm border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                    style={{ gridTemplateColumns: 'minmax(140px, 1fr) minmax(80px, 0.6fr) minmax(160px, 2fr)' }}
                  >
                    <span className="text-slate-700 tabular-nums">{formatDate(item.created_at)}</span>
                    <span className="text-slate-600">
                      {item.language ? (LANGUAGES.find((l) => l.value === item.language)?.label ?? item.language) : '—'}
                    </span>
                    {item.job_description != null && item.job_description !== '' ? (
                      <span className="text-slate-600 truncate max-w-full" title={item.job_description}>
                        {item.job_description.length > 20 ? `${item.job_description.slice(0, 20)}…` : item.job_description}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
