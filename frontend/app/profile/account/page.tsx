'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { changePassword } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setSubmitting(false);
    }
  };

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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Password updated. You can close this window.
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
          )}

          <div>
            <label htmlFor="current" className="block text-sm font-medium text-slate-700">
              Current password
            </label>
            <input
              id="current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              required
            />
          </div>
          <div>
            <label htmlFor="new" className="block text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              required
              minLength={8}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Update password'}
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
