'use client';

import Link from 'next/link';
import { useState } from 'react';
import { forgotPassword } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 mb-1">Reset password</h1>
        <p className="text-sm text-slate-600 mb-4">
          Enter your email and we will send you a link to choose a new password if an account exists.
        </p>
        {done ? (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-3 text-sm text-slate-700">
            If an account exists for that address, check your inbox for a reset link. It may take a minute to arrive.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link href="/login" className="text-blue-700 hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
      <Link href="/" className="mt-4 text-sm text-slate-500 hover:text-blue-700 transition-colors">
        ← Back to Optimal CV
      </Link>
    </div>
  );
}
