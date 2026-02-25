'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  parseCV,
  getProfile,
  fetchJobDescription,
  fetchAdditionalUrls,
  generateCV,
  downloadPdfUrl,
  downloadLetterPdfUrl,
  type Profile,
  type GenerateCVResponse,
} from './lib/api';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
];

const DRAFT_KEY = 'cv-tool-profile-draft';

const emptyProfile: Profile = {
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

function loadDraft(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { ...emptyProfile, ...data };
  } catch {
    return null;
  }
}

function clearDraft() {
  if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY);
}

export default function HomePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [personalSummary, setPersonalSummary] = useState('');
  const [additionalUrls, setAdditionalUrls] = useState<string[]>(['', '', '', '', '']);
  const [jobInput, setJobInput] = useState('');
  const [jobIsUrl, setJobIsUrl] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('en');
  const [template, setTemplate] = useState('cv_base.html');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateCVResponse | null>(null);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const hasProfileData =
    Boolean(profile.full_name?.trim()) ||
    Boolean(profile.summary?.trim()) ||
    (profile.experience?.length ?? 0) > 0 ||
    (profile.education?.length ?? 0) > 0 ||
    (profile.skills?.length ?? 0) > 0 ||
    (profile.certifications?.length ?? 0) > 0 ||
    (profile.languages?.length ?? 0) > 0;

  // Load profile: DB (from last CV upload) or local draft from profile page
  useEffect(() => {
    if (profileLoaded) return;
    const draft = loadDraft();
    if (draft && (draft.full_name || draft.summary || draft.experience?.length)) {
      setProfile(draft);
      setProfileLoaded(true);
      return;
    }
    getProfile()
      .then((p) => setProfile({ ...emptyProfile, ...p }))
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
  }, [profileLoaded]);

  const handleCVUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvFile(file);
    setError(null);
    setProgress(file.name.toLowerCase().endsWith('.pdf') ? 'Parsing PDF...' : 'Parsing file...');
    try {
      const parsed = await parseCV(file);
      // New CV always replaces the current profile values end-to-end.
      setProfile({ ...emptyProfile, ...parsed });
      clearDraft();
      setPersonalSummary('');
      setPhotoFile(null);
      setResult(null);
      setPreviewSessionId(null);
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed');
      setProgress('');
    }
  }, []);

  const handleFetchJob = useCallback(async () => {
    if (!jobInput.trim()) return;
    setError(null);
    setProgress('Fetching job description...');
    try {
      const { content } = await fetchJobDescription(
        jobIsUrl ? jobInput.trim() : null,
        jobIsUrl ? null : jobInput.trim()
      );
      setJobInput(content || jobInput);
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
      setProgress('');
    }
  }, [jobInput, jobIsUrl]);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProfile((p) => ({ ...p, photo_base64: dataUrl }));
    };
    reader.readAsDataURL(file);
    setPhotoFile(file);
  }, []);

  const addUrl = (index: number, value: string) => {
    const next = [...additionalUrls];
    next[index] = value;
    setAdditionalUrls(next);
  };

  const handleGenerate = useCallback(async () => {
    let profileForGeneration = profile;
    if (!profileForGeneration.full_name && !profileForGeneration.summary && cvFile) {
      try {
        setProgress('Parsing selected CV before generation...');
        const parsed = await parseCV(cvFile);
        profileForGeneration = parsed;
        setProfile(parsed);
        clearDraft();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse selected CV');
        setProgress('');
        return;
      }
    }
    if (!profileForGeneration.full_name && !profileForGeneration.summary) {
      setError('Upload a CV (PDF) or fill in your profile first.');
      return;
    }
    if (!jobInput.trim()) {
      setError('Enter or fetch a job description.');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    setProgress('Preparing...');
    try {
      setProgress('Generating tailored CV and motivation letter...');
      const urls = additionalUrls.filter((u) => u.trim().startsWith('http'));
      const res = await generateCV({
        profile: profileForGeneration,
        job_description: jobInput.trim(),
        personal_summary: personalSummary.trim() || undefined,
        additional_urls: urls,
        language,
        template,
      });
      setResult(res);
      setPreviewSessionId(res.session_id);
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setProgress('');
    } finally {
      setLoading(false);
    }
  }, [
    profile,
    cvFile,
    jobInput,
    personalSummary,
    additionalUrls,
    language,
    template,
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">CV-Tool</h1>
          <nav className="flex gap-4">
            <Link
              href="/profile"
              className="text-slate-600 hover:text-slate-900"
            >
              Edit profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Inputs */}
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                CV upload
              </h2>
              <div className="space-y-3">
                {hasProfileData && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Profile data is already loaded{profile.full_name ? ` for ${profile.full_name}` : ''}.
                    Uploading a new CV will replace all current profile values.
                  </div>
                )}
                <p className="text-sm text-slate-600">
                  Upload your CV (PDF or JSON). This is the only data stored in your account. Each job gets a fresh, tailored CV from this source.
                </p>
                <input
                  type="file"
                  accept=".pdf,.json"
                  onChange={handleCVUpload}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Personal summary (optional)
              </h2>
              <textarea
                value={personalSummary}
                onChange={(e) => setPersonalSummary(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Extra context or summary to include in your CV..."
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Additional URLs (e.g. Wikipedia, homepage)
              </h2>
              <div className="space-y-2">
                {additionalUrls.map((url, i) => (
                  <input
                    key={i}
                    type="url"
                    value={url}
                    onChange={(e) => addUrl(i, e.target.value)}
                    placeholder={`URL ${i + 1}`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Job description
              </h2>
              <div className="flex gap-2 mb-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!jobIsUrl}
                    onChange={() => setJobIsUrl(false)}
                  />
                  Paste text
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={jobIsUrl}
                    onChange={() => setJobIsUrl(true)}
                  />
                  URL
                </label>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={jobInput}
                  onChange={(e) => setJobInput(e.target.value)}
                  rows={5}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder={jobIsUrl ? 'https://...' : 'Paste job description...'}
                />
              </div>
              {jobIsUrl && (
                <button
                  type="button"
                  onClick={handleFetchJob}
                  className="mt-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
                >
                  Fetch from URL
                </button>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Profile photo (optional)
              </h2>
              {profile.photo_base64 && (
                <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  A profile photo is already uploaded. Uploading a new photo will replace it.
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                Language
              </h2>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {LANGUAGES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                CV template
              </h2>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="cv_base.html">Modern</option>
                <option value="cv_executive.html">Executive</option>
              </select>
            </section>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}
            {progress && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                {progress}
              </div>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating…' : 'Generate CV & motivation letter'}
            </button>
          </div>

          {/* Right: Preview & download */}
          <div className="space-y-6">
            {result && (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">
                    Preview & download
                  </h2>
                  <div className="flex flex-col gap-3">
                    <a
                      href={downloadPdfUrl(result.session_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex justify-center rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700"
                    >
                      Download CV (PDF)
                    </a>
                    <a
                      href={downloadLetterPdfUrl(result.session_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex justify-center rounded-lg bg-slate-600 px-4 py-3 font-medium text-white hover:bg-slate-700"
                    >
                      Download motivation letter (PDF)
                    </a>
                  </div>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-800 mb-2">
                    Tailored summary
                  </h2>
                  <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                    {result.tailored_summary}
                  </div>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-800 mb-2">
                    Motivation letter
                  </h2>
                  <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                    {result.motivation_letter}
                  </div>
                </section>
              </>
            )}
            {!result && !loading && (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Fill in the form and click &quot;Generate CV & motivation letter&quot; to see the preview and PDF here.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
