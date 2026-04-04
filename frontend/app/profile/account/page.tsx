'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { useAuth } from '../../lib/auth-context';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold text-slate-900">Account</h1>
        <p className="mt-1 text-sm text-slate-600">Change your password.</p>

        <div className="mt-6">
          <ChangePasswordForm />
        </div>

        <p className="mt-6">
          <Link href="/dashboard" className="text-sm text-blue-800 hover:text-blue-900">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
