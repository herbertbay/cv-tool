/**
 * API client for the CV-Tool backend.
 * Base URL: /api-backend when using Next.js rewrites, or set NEXT_PUBLIC_API_URL.
 */

// Use direct backend URL; avoids dev-proxy socket resets from Next.js rewrites.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const fetchOptions: RequestInit = { credentials: 'include' };

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

/** Parse CV (PDF or JSON) via backend */
export async function parseCV(file: File): Promise<Profile> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/parse-cv`, {
    method: 'POST',
    body: form,
    ...fetchOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to parse file');
  }
  return res.json();
}

/** Get profile for current user (from cookie) */
export async function getProfile(): Promise<Profile> {
  const res = await fetch(`${API_BASE}/profile`, fetchOptions);
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

/** Save profile for current user (cookie) */
export async function putProfile(profile: Profile): Promise<Profile> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
    ...fetchOptions,
  });
  if (!res.ok) throw new Error('Failed to save profile');
  return res.json();
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

/** Download CV PDF for session */
export function downloadPdfUrl(sessionId: string): string {
  return `${API_BASE}/download-pdf/${sessionId}`;
}

/** Download motivation letter PDF for session */
export function downloadLetterPdfUrl(sessionId: string): string {
  return `${API_BASE}/download-letter/${sessionId}`;
}
