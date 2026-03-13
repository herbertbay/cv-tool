import { NextResponse } from 'next/server';

/**
 * Server-only proxy to backend GET /api/admin/stats.
 * Set ADMIN_SECRET on the frontend service (same value as backend) so this route can call the API.
 * Never expose ADMIN_SECRET to the client; this route runs only on the server.
 */
function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/api\/?$/, '') || '';
  if (!raw) return 'http://localhost:8000';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `https://${raw}`;
}

export async function GET() {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET not set on frontend. Set it to match the backend and redeploy.' },
      { status: 503 }
    );
  }
  const base = apiBase();
  const url = `${base}/api/admin/stats?secret=${encodeURIComponent(secret)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Backend admin stats failed', status: res.status, body: text.slice(0, 200) },
        { status: res.status === 404 ? 503 : res.status }
      );
    }
    const data = JSON.parse(text) as { users: number; profiles: number; cv_generations: number };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Fetch failed' },
      { status: 502 }
    );
  }
}
