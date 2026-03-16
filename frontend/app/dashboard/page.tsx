'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProfile, type UserData } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { JobApplicationsHistory } from '../components/JobApplicationsHistory';

function hasProfileData(p: UserData['profile']): boolean {
  return (
    Boolean(p?.full_name?.trim()) ||
    Boolean(p?.summary?.trim()) ||
    (p?.experience?.length ?? 0) > 0 ||
    (p?.education?.length ?? 0) > 0 ||
    (p?.skills?.length ?? 0) > 0
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

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
      </main>
    </div>
  );
}
