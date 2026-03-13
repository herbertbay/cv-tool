'use client';

import { useEffect, useState } from 'react';

type Stats = { users: number; profiles: number; cv_generations: number };
type Err = { error: string; status?: number };

/**
 * Open /admin/stats in the browser. The page fetches user counts via the server API route
 * and logs them to the console. Requires ADMIN_SECRET on backend + same on frontend.
 */
export default function AdminStatsPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          const e = json as Err;
          const msg = e.error || `HTTP ${res.status}`;
          console.error('[Optimal CV] Admin stats error:', msg, json);
          setErr(msg);
          return;
        }
        const stats = json as Stats;
        // Console output requested: visible in DevTools → Console
        console.log('[Optimal CV] User stats:', stats);
        console.log('[Optimal CV] Users:', stats.users);
        setData(stats);
      })
      .catch((e) => {
        console.error('[Optimal CV] Admin stats fetch failed:', e);
        setErr(e instanceof Error ? e.message : 'Fetch failed');
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">Admin stats</h1>
        <p className="mt-2 text-sm text-slate-600">
          Counts are also logged to the browser console (DevTools → Console).
        </p>
        {err && (
          <pre className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 whitespace-pre-wrap">
            {err}
          </pre>
        )}
        {data && (
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <span className="font-medium text-slate-700">Users</span>{' '}
              <span className="text-slate-900 font-mono">{data.users}</span>
            </li>
            <li>
              <span className="font-medium text-slate-700">Profiles</span>{' '}
              <span className="text-slate-900 font-mono">{data.profiles}</span>
            </li>
            <li>
              <span className="font-medium text-slate-700">CV generations</span>{' '}
              <span className="text-slate-900 font-mono">{data.cv_generations}</span>
            </li>
          </ul>
        )}
        {!data && !err && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
      </div>
    </div>
  );
}
