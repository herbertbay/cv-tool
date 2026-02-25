/**
 * API client for the CV-Tool backend.
 * Base URL: /api-backend when using Next.js rewrites, or set NEXT_PUBLIC_API_URL.
 */

// Use direct backend URL; avoids dev-proxy socket resets from Next.js rewrites.
// Must be a full URL (e.g. https://your-backend.up.railway.app) so requests go to the API, not relative to the frontend.
function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/api\/?$/, '') || '';
  if (!raw) return 'http://localhost:8000';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `https://${raw}`;
}
const BASE = getApiBase();
const API_BASE = `${BASE}/api`;

const fetchOptions: RequestInit = { credentials: 'include' };

/** Callback when any request returns 401 (e.g. session expired). Set by AuthProvider. */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}

function checkAuth(res: Response) {
  if (res.status === 401) onUnauthorized?.();
}

export type Profile = {
  full_name: string;
  headline?: string | null;
  summary: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  linkedin_url?: string | null;
  photo_base64?: string | null;
  experience: Array<{
    title: string;
    company: string;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
    location?: string | null;
  }>;
  education: Array<{
    school: string;
    degree?: string | null;
    field?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    authority?: string | null;
    date?: string | null;
    url?: string | null;
  }>;
  languages: string[];
};

export type GenerateCVRequest = {
  profile: Profile;
  job_description: string;
  personal_summary?: string | null;
  additional_urls: string[];
  additional_urls_content?: Record<string, string> | null;
  language: string;
  template?: string; // e.g. cv_base.html (modern)
};

export type GenerateCVResponse = {
  session_id: string;
  tailored_summary: string;
  tailored_experience: Array<Record<string, unknown>>;
  motivation_letter: string;
  suggested_skills_highlight: string[];
  status: string;
};

// --- Auth ---

export type AuthUser = { id: string; email: string };

export async function getMe(): Promise<{ user: AuthUser } | null> {
  const res = await fetch(`${BASE}/api/auth/me`, fetchOptions);
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to get user');
  return res.json();
}

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUser }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    ...fetchOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function register(
  email: string,
  password: string
): Promise<{ user: AuthUser }> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    ...fetchOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', ...fetchOptions });
}

/** Permanently delete account and all data. Requires auth. Clears session on success. */
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${BASE}/api/auth/delete-account`, { method: 'POST', ...fetchOptions });
  if (!res.ok) throw new Error('Failed to delete account');
}

// --- Profile (require auth) ---

/** Parse CV (PDF or JSON) via backend. Requires auth. */
export async function parseCV(file: File): Promise<Profile> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/parse-cv`, {
    method: 'POST',
    body: form,
    ...fetchOptions,
  });
  checkAuth(res);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Please sign in to upload and save your CV.');
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to parse file');
  }
  return res.json();
}

export type UserData = {
  profile: Profile;
  additional_urls: string[];
  personal_summary: string;
  onboarding_complete?: boolean;
};

/** Get profile, additional_urls, and personal_summary for current user. Requires auth. */
export async function getProfile(): Promise<UserData> {
  const res = await fetch(`${API_BASE}/profile`, fetchOptions);
  checkAuth(res);
  if (!res.ok) throw new Error('Failed to load profile');
  const data = await res.json();
  return {
    profile: data.profile ?? emptyProfileStub(),
    additional_urls: Array.isArray(data.additional_urls) ? data.additional_urls : [],
    personal_summary: typeof data.personal_summary === 'string' ? data.personal_summary : '',
    onboarding_complete: Boolean(data.onboarding_complete),
  };
}

function emptyProfileStub(): Profile {
  return {
    full_name: '',
    headline: null,
    summary: '',
    email: null,
    phone: null,
    address: null,
    linkedin_url: null,
    photo_base64: null,
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
  };
}

/** Update and persist profile and/or additional_urls and/or personal_summary and/or onboarding_complete. Requires auth. */
export async function putUserData(updates: {
  profile?: Profile;
  additional_urls?: string[];
  personal_summary?: string;
  onboarding_complete?: boolean;
}): Promise<UserData> {
  const body: Record<string, unknown> = {};
  if (updates.profile !== undefined) body.profile = updates.profile;
  if (updates.additional_urls !== undefined) body.additional_urls = updates.additional_urls;
  if (updates.personal_summary !== undefined) body.personal_summary = updates.personal_summary;
  if (updates.onboarding_complete !== undefined) body.onboarding_complete = updates.onboarding_complete;
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...fetchOptions,
  });
  checkAuth(res);
  if (!res.ok) throw new Error('Failed to save');
  const data = await res.json();
  return {
    profile: data.profile ?? emptyProfileStub(),
    additional_urls: Array.isArray(data.additional_urls) ? data.additional_urls : [],
    personal_summary: typeof data.personal_summary === 'string' ? data.personal_summary : '',
    onboarding_complete: Boolean(data.onboarding_complete),
  };
}

/** Save profile only (convenience). Requires auth. */
export async function putProfile(profile: Profile): Promise<UserData> {
  return putUserData({ profile });
}

/** Fetch job description from URL or use raw text */
export async function fetchJobDescription(
  url?: string | null,
  text?: string | null
): Promise<{ content: string }> {
  const res = await fetch(`${API_BASE}/fetch-job-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url || undefined, text: text || undefined }),
    ...fetchOptions,
  });
  if (!res.ok) throw new Error('Failed to fetch job description');
  return res.json();
}

/** Fetch content from additional URLs (e.g. Wikipedia, homepage) */
export async function fetchAdditionalUrls(
  urls: string[]
): Promise<{ contents: Record<string, string> }> {
  const res = await fetch(`${API_BASE}/fetch-additional-urls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
    ...fetchOptions,
  });
  if (!res.ok) throw new Error('Failed to fetch URLs');
  return res.json();
}

/** Generate tailored CV and motivation letter */
export async function generateCV(
  body: GenerateCVRequest
): Promise<GenerateCVResponse> {
  const res = await fetch(`${API_BASE}/generate-cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...fetchOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to generate CV');
  }
  return res.json();
}

/** Get session data (for preview) */
export async function getSession(
  sessionId: string
): Promise<{
  session_id: string;
  created_at: string;
  has_pdf: boolean;
  has_letter_pdf?: boolean;
  profile: Profile;
  tailored_summary: string;
  tailored_experience: Array<Record<string, unknown>>;
  motivation_letter: string;
  keywords_to_highlight: string[];
}> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, fetchOptions);
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

/** List of generated CVs for the current user */
export type GeneratedCVItem = {
  session_id: string;
  created_at: string;
  has_cv: boolean;
  has_letter_pdf: boolean;
};

export async function getGeneratedCVs(): Promise<GeneratedCVItem[]> {
  const res = await fetch(`${API_BASE}/generated-cvs`, fetchOptions);
  if (res.status === 401) return [];
  if (!res.ok) throw new Error('Failed to load generated CVs');
  return res.json();
}

/** Download CV PDF for session (uses fetch with credentials so auth works cross-origin) */
export async function downloadPdf(sessionId: string, filename?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/download-pdf/${sessionId}`, fetchOptions);
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `cv_${sessionId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download motivation letter PDF for session */
export async function downloadLetterPdf(sessionId: string, filename?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/download-letter/${sessionId}`, fetchOptions);
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `motivation_letter_${sessionId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

/** URL for CV PDF (for same-origin or when opening in same tab with cookie). Use downloadPdf() for cross-origin. */
export function downloadPdfUrl(sessionId: string): string {
  return `${API_BASE}/download-pdf/${sessionId}`;
}

/** URL for motivation letter PDF */
export function downloadLetterPdfUrl(sessionId: string): string {
  return `${API_BASE}/download-letter/${sessionId}`;
}

/** URL for CV HTML preview endpoint */
export function previewCvHtmlUrl(template: string = 'cv_base.html'): string {
  return `${API_BASE}/preview-cv-html?template=${encodeURIComponent(template)}`;
}

/** Fetch CV HTML with credentials and open in new window (works cross-origin). */
export async function openPreviewCvHtml(template: string = 'cv_base.html'): Promise<void> {
  const res = await fetch(previewCvHtmlUrl(template), fetchOptions);
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in to preview' : 'Preview failed');
  const html = await res.text();
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
