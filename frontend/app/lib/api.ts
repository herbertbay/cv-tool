/**
 * API client for the CV-Tool backend.
 * In production (NEXT_PUBLIC_API_URL set): uses same-origin proxy /api-proxy/* so session cookies work
 * (cross-origin requests get cookies blocked by Safari/Chrome).
 * In dev: uses direct backend URL or localhost.
 */

function getApiConfig(): { base: string; apiBase: string } {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/api\/?$/, '') || '';
  if (!raw) {
    return { base: 'http://localhost:8000', apiBase: 'http://localhost:8000/api' };
  }
  // Use same-origin proxy in production to avoid third-party cookie blocking
  return { base: '', apiBase: '/api-proxy' };
}
const { base: BASE, apiBase: API_BASE } = getApiConfig();

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
  /** PDF theme accent #RRGGBB */
  template_accent?: string;
  /** Pre-computed from ATS optimize (skips AI tailoring) */
  pre_tailored_summary?: string | null;
  pre_tailored_experience?: Array<Record<string, unknown>> | null;
  pre_tailored_skills?: string[] | null;
  pre_tailored_education?: Array<Record<string, unknown>> | null;
  pre_tailored_headline?: string | null;
  pre_motivation_letter?: string | null;
  pre_keywords_to_highlight?: string[] | null;
};

export type GenerateCVResponse = {
  session_id: string;
  tailored_headline: string;
  tailored_summary: string;
  tailored_experience: Array<Record<string, unknown>>;
  tailored_skills: string[];
  tailored_education: Array<Record<string, unknown>>;
  motivation_letter: string;
  suggested_skills_highlight: string[];
  status: string;
};

// --- Auth ---

export type AuthUser = { id: string; email: string };

export async function getMe(): Promise<{ user: AuthUser } | null> {
  const res = await fetch(`${API_BASE}/auth/me`, fetchOptions);
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to get user');
  return res.json();
}

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
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
  const res = await fetch(`${API_BASE}/auth/register`, {
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
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', ...fetchOptions });
}

export async function forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
    ...fetchOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token.trim(), new_password: newPassword }),
    ...fetchOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to reset password');
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
    ...fetchOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to change password');
  }
}

// --- Admin ---
export type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  cv_generations_count: number;
  last_used_at: string | null;
  last_cv_session_id?: string | null;
  welcome_email_sent_at?: string | null;
  profile_incomplete_reminder_sent_at?: string | null;
  profile_required_empty_count?: number;
  profile_incomplete?: boolean;
};

export function getAdminDownloadLastCvUrl(userId: string): string {
  return `${API_BASE}/admin/users/${encodeURIComponent(userId)}/download-last-cv`;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE}/admin/users`, fetchOptions);
  checkAuth(res);
  if (!res.ok) {
    if (res.status === 403) throw new Error('Admin access required');
    throw new Error('Failed to load users');
  }
  const data = await res.json();
  return Array.isArray(data?.users) ? (data.users as AdminUser[]) : [];
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/delete`, {
    method: 'POST',
    ...fetchOptions,
  });
  checkAuth(res);
  if (!res.ok) {
    if (res.status === 403) throw new Error('Admin access required');
    if (res.status === 404) throw new Error('User not found');
    throw new Error('Failed to delete user');
  }
}

// --- ATS match score tool ---

export type AtsMatchPrepareResponse = { result_token: string; message: string };
export type AtsMatchResultResponse = {
  score: number;
  job_preview: string;
  summary?: string | null;
  breakdown?: Record<string, number> | null;
};
export type AtsMatchOptimizeResponse = {
  original_score: number;
  new_score: number;
  improvement: number;
  improvement_pct: number;
  tailored_summary: string;
  tailored_experience: Array<Record<string, unknown>>;
  tailored_headline?: string;
  tailored_skills?: string[];
  tailored_education?: Array<Record<string, unknown>>;
  motivation_letter?: string;
  keywords_to_highlight?: string[];
  tailored_profile?: Record<string, unknown>;
  job_description?: string;
};

/** Submit CV + job description, get result_token. No auth. Score stored; sign in to view. */
export async function atsMatchPrepare(cvFile: File, jobDescription: string): Promise<AtsMatchPrepareResponse> {
  const form = new FormData();
  form.append('cv_file', cvFile);
  form.append('job_description', jobDescription);
  const res = await fetch(`${API_BASE}/ats-match`, {
    method: 'POST',
    body: form,
    ...fetchOptions,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to analyze');
  }
  return res.json();
}

/** Get stored ATS score. Requires auth. */
export async function atsMatchResult(resultToken: string): Promise<AtsMatchResultResponse> {
  const res = await fetch(`${API_BASE}/ats-match?result_token=${encodeURIComponent(resultToken)}`, fetchOptions);
  checkAuth(res);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sign in to view your score');
    if (res.status === 404) throw new Error('Result expired. Please submit again.');
    throw new Error('Failed to load result');
  }
  return res.json();
}

/** Generate optimized CV content and new score. Requires auth. */
export async function atsMatchOptimize(resultToken: string): Promise<AtsMatchOptimizeResponse> {
  const res = await fetch(`${API_BASE}/ats-match/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result_token: resultToken }),
    ...fetchOptions,
  });
  checkAuth(res);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Sign in to optimize');
    if (res.status === 404) throw new Error('Result expired. Please submit again.');
    throw new Error('Failed to optimize');
  }
  return res.json();
}

/** Permanently delete account and all data. Requires auth. Clears session on success. */
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/delete-account`, { method: 'POST', ...fetchOptions });
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
    if (res.status === 401) throw new Error('Please sign in to upload and save your resume.');
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
    throw new Error(err.detail || 'Failed to generate resume');
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
  job_description?: string;
  language?: string;
};

export async function getGeneratedCVs(): Promise<GeneratedCVItem[]> {
  const res = await fetch(`${API_BASE}/generated-cvs`, fetchOptions);
  if (res.status === 401) return [];
  if (!res.ok) throw new Error('Failed to load generated resumes');
  return res.json();
}

// --- Job applications (history) ---

export type ApplicationStatus = 'Interested' | 'Applied' | 'Interview' | 'Rejected' | 'Offer';

/** Extracted job fields from raw description (OpenAI). Used for job_applications and CV optimization. */
export type ExtractedJob = {
  company_name: string | null;
  job_title: string | null;
  description: string | null;
  salary_from: number | null;
  salary_to: number | null;
  location: string | null;
  key_requirements: string[];
  keywords_to_highlight: string[];
  full_job_description: string;
};

export async function extractJobDescription(jobDescription: string): Promise<ExtractedJob> {
  const res = await fetch(`${API_BASE}/extract-job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jobDescription }),
    ...fetchOptions,
  });
  if (!res.ok) throw new Error('Failed to extract job details');
  return res.json();
}

export type JobApplication = {
  id: string;
  user_id: string;
  company_name: string;
  description: string;
  salary_from: number | null;
  salary_to: number | null;
  job_title: string;
  application_status: ApplicationStatus;
  archived: boolean;
  full_job_description: string;
  session_id: string | null;
  application_date: string | null;
  job_url: string | null;
  created_at: string;
  ats_score: number | null;
  ats_score_summary: string | null;
  /** JSON string of { summary, skills, experience, education } each 0-100 */
  ats_score_breakdown: string | null;
  tailored_headline?: string | null;
  tailored_skills?: string[] | null;
  tailored_education?: Array<Record<string, unknown>> | null;
  /** Parsed JSON: which CV blocks appear on the PDF for this application */
  cv_section_includes?: Record<string, unknown> | null;
};

export async function getJobApplications(includeArchived = false): Promise<JobApplication[]> {
  const res = await fetch(`${API_BASE}/job-applications?archived=${includeArchived}`, fetchOptions);
  if (res.status === 401) return [];
  if (!res.ok) throw new Error('Failed to load job applications');
  return res.json();
}

export async function getJobApplication(id: string): Promise<JobApplication> {
  const res = await fetch(`${API_BASE}/job-applications/${id}`, fetchOptions);
  checkAuth(res);
  if (res.status === 404) throw new Error('Application not found');
  if (!res.ok) throw new Error('Failed to load application');
  return res.json();
}

export async function createJobApplication(data: {
  company_name?: string;
  description?: string;
  salary_from?: number;
  salary_to?: number;
  job_title?: string;
  application_status?: ApplicationStatus;
  full_job_description?: string;
  session_id?: string;
  application_date?: string;
  job_url?: string;
  tailored_headline?: string;
  tailored_skills?: string[];
  tailored_education?: Array<Record<string, unknown>>;
  /** If true and full_job_description is set, backend runs OpenAI extraction to fill company_name, job_title, etc. */
  extract?: boolean;
}): Promise<JobApplication> {
  const res = await fetch(`${API_BASE}/job-applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    ...fetchOptions,
  });
  if (!res.ok) throw new Error('Failed to create job application');
  return res.json();
}

export async function updateJobApplication(
  id: string,
  data: {
    company_name?: string;
    description?: string;
    salary_from?: number | null;
    salary_to?: number | null;
    job_title?: string;
    application_status?: ApplicationStatus;
    archived?: boolean;
    full_job_description?: string | null;
    application_date?: string | null;
    job_url?: string | null;
    tailored_headline?: string | null;
    tailored_skills?: string[];
    tailored_education?: Array<Record<string, unknown>>;
    cv_section_includes?: Record<string, unknown> | null;
  }
): Promise<void> {
  const res = await fetch(`${API_BASE}/job-applications/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    ...fetchOptions,
  });
  if (!res.ok) throw new Error('Failed to update job application');
}

/** Breakdown from ATS match: each key (summary, skills, experience, education) has a 0-100 score. */
export type AtsScoreBreakdown = Record<string, number>;

/** Compute ATS match score for an application (current tailored content vs job description). Saves and returns score + breakdown. */
export async function computeApplicationScore(applicationId: string): Promise<{ score: number; summary: string; breakdown?: AtsScoreBreakdown }> {
  const res = await fetch(`${API_BASE}/job-applications/${applicationId}/compute-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...fetchOptions,
  });
  checkAuth(res);
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Job description and a generated resume are required to compute the score.');
  }
  if (res.status === 404) throw new Error('Application or resume not found');
  if (!res.ok) throw new Error('Failed to compute score');
  return res.json();
}

/** Tailored content for a generated CV (editable, persisted per session). */
export type TailoredContent = {
  session_id: string;
  tailored_summary: string;
  tailored_experience: Array<{ title?: string; company?: string; start_date?: string; end_date?: string; description?: string }>;
  motivation_letter: string;
  keywords_to_highlight: string[];
  template: string;
  template_accent?: string;
};

export async function getTailoredContent(sessionId: string): Promise<TailoredContent> {
  const res = await fetch(`${API_BASE}/cv-generations/${sessionId}/tailored`, fetchOptions);
  checkAuth(res);
  if (res.status === 404) throw new Error('Tailored content not found');
  if (!res.ok) throw new Error('Failed to load tailored content');
  return res.json();
}

export async function updateTailoredContent(
  sessionId: string,
  data: { tailored_summary?: string; tailored_experience?: TailoredContent['tailored_experience']; motivation_letter?: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/cv-generations/${sessionId}/tailored`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    ...fetchOptions,
  });
  if (!res.ok) throw new Error('Failed to update tailored content');
}

/** Same HTML as PDF pipeline; optional fields override unsaved editor state. */
export async function postCvGenerationPreviewHtml(
  sessionId: string,
  overrides: {
    tailored_summary?: string;
    tailored_experience?: TailoredContent['tailored_experience'];
    template?: string;
    template_accent?: string;
    tailored_headline?: string;
    keywords_to_highlight?: string[];
    cv_section_includes?: Record<string, unknown>;
  }
): Promise<string> {
  const res = await fetch(`${API_BASE}/cv-generations/${encodeURIComponent(sessionId)}/preview-html`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(overrides),
    ...fetchOptions,
  });
  checkAuth(res);
  if (!res.ok) throw new Error('Failed to load resume preview');
  return res.text();
}

export async function regenerateCv(
  sessionId: string,
  template?: string,
  tailoredHeadline?: string,
  cvSectionIncludes?: Record<string, unknown> | null,
  templateAccent?: string
): Promise<{ ok: boolean; session_id: string }> {
  const payload: Record<string, unknown> = {
    session_id: sessionId,
    template: template || 'cv_base.html',
  };
  if (templateAccent !== undefined && templateAccent !== '') {
    payload.template_accent = templateAccent;
  }
  if (tailoredHeadline !== undefined) {
    payload.tailored_headline = tailoredHeadline;
  }
  if (cvSectionIncludes !== undefined) {
    payload.cv_section_includes = cvSectionIncludes;
  }
  const res = await fetch(`${API_BASE}/regenerate-cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    ...fetchOptions,
  });
  if (!res.ok) throw new Error('Failed to regenerate resume');
  return res.json();
}

/** Generate motivation letter text for an application (uses latest tailored content). */
export async function generateApplicationMotivationLetter(applicationId: string): Promise<{ session_id: string; motivation_letter: string }> {
  const res = await fetch(`${API_BASE}/job-applications/${encodeURIComponent(applicationId)}/generate-motivation-letter`, {
    method: 'POST',
    ...fetchOptions,
  });
  checkAuth(res);
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Job description is required');
  }
  if (res.status === 404) throw new Error('Application or resume not found');
  if (!res.ok) throw new Error('Failed to generate motivation letter');
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
export function previewCvHtmlUrl(template: string = 'cv_base.html', accent?: string): string {
  const q = new URLSearchParams({ template });
  if (accent && accent.trim()) q.set('accent', accent.trim());
  return `${API_BASE}/preview-cv-html?${q.toString()}`;
}

/** Fetch CV HTML with credentials and open in new window (works cross-origin). */
export async function openPreviewCvHtml(template: string = 'cv_base.html', accent?: string): Promise<void> {
  const res = await fetch(previewCvHtmlUrl(template, accent), fetchOptions);
  if (!res.ok) throw new Error(res.status === 401 ? 'Sign in to preview' : 'Preview failed');
  const html = await res.text();
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
