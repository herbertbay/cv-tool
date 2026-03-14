import { NextRequest, NextResponse } from 'next/server';

/**
 * Same-origin proxy to the backend API. Forwards Cookie and other headers
 * so session auth works (Next.js rewrites don't reliably forward cookies to external URLs).
 * Only active when NEXT_PUBLIC_API_URL is set.
 */
function getBackendUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/api\/?$/, '') || '';
  if (!raw) return null;
  return raw.startsWith('http') ? raw : `https://${raw}`;
}

async function proxy(request: NextRequest, pathSegments: string[]) {
  const backend = getBackendUrl();
  if (!backend) {
    return NextResponse.json({ error: 'API URL not configured' }, { status: 503 });
  }
  const path = pathSegments.join('/');
  const url = new URL(`/api/${path}`, backend);
  url.search = request.nextUrl.search; // forward query string
  const headers = new Headers();
  // Forward cookies and other headers the backend needs
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  // Forward common headers
  const forwardHeaders = ['accept', 'accept-language', 'user-agent'];
  for (const h of forwardHeaders) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.arrayBuffer();
    } catch {
      body = undefined;
    }
  }
  const res = await fetch(url.toString(), {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
  });
  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') {
      resHeaders.append(key, value);
    } else {
      resHeaders.set(key, value);
    }
  });
  const resContentType = res.headers.get('content-type') || '';
  const isBinary = /application\/pdf|application\/octet-stream/i.test(resContentType);
  const responseBody: BodyInit = isBinary ? await res.arrayBuffer() : await res.text();
  return new NextResponse(responseBody, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}
