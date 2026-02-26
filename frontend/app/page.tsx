'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  parseCV,
  getProfile,
  putUserData,
  fetchJobDescription,
  generateCV,
  getGeneratedCVs,
  downloadPdf,
  downloadLetterPdf,
  downloadPdfUrl,
  downloadLetterPdfUrl,
  openPreviewCvHtml,
  type Profile,
  type UserData,
  type GenerateCVResponse,
  type GeneratedCVItem,
} from './lib/api';
import { useAuth } from './lib/auth-context';
import { LandingPage } from './components/LandingPage';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
];

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

function hasProfileData(p: Profile): boolean {
  return (
    Boolean(p?.full_name?.trim()) ||
    Boolean(p?.summary?.trim()) ||
    (p?.experience?.length ?? 0) > 0 ||
    (p?.education?.length ?? 0) > 0 ||
    (p?.skills?.length ?? 0) > 0
  );
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  // Onboarding state (for steps 2–3 before save)
  const [additionalUrls, setAdditionalUrls] = useState<string[]>(['', '', '', '', '']);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [profileWithPhoto, setProfileWithPhoto] = useState<Profile | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  // Create CV flow
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [jobIsUrl, setJobIsUrl] = useState(false);
  const [language, setLanguage] = useState('en');
  const [template, setTemplate] = useState('cv_base.html');
  const [generateProgress, setGenerateProgress] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateCVResponse | null>(null);
  const [refreshGeneratedList, setRefreshGeneratedList] = useState(0);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    getProfile()
      .then((data) => {
        setUserData(data);
        if (hasProfileData(data.profile) && !data.onboarding_complete) {
          setOnboardingStep(2);
          setAdditionalUrls(Array.isArray(data.additional_urls) && data.additional_urls.length > 0 ? data.additional_urls : ['', '', '', '', '']);
        }
      })
      .catch(() => setUserData(null))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // —— Onboarding: Step 1 — Upload CV
  const handleCVUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setParseError(null);
      setParseProgress(file.name.toLowerCase().endsWith('.pdf') ? 'Parsing PDF…' : 'Parsing file…');
      try {
        const parsed = await parseCV(file);
        setUserData((prev) => ({
          profile: parsed,
          additional_urls: prev?.additional_urls ?? [],
          personal_summary: prev?.personal_summary ?? '',
          onboarding_complete: prev?.onboarding_complete ?? false,
        }));
        setParseProgress('');
        setOnboardingStep(2);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Parse failed');
        setParseProgress('');
      }
    },
    [user]
  );

  // —— Onboarding: Step 2 — Next (save URLs, go to step 3)
  const handleOnboardingNextFromUrls = useCallback(async () => {
    if (!user) return;
    setOnboardingSaving(true);
    setOnboardingError(null);
    try {
      const urls = additionalUrls.filter((u) => u.trim().startsWith('http'));
      await putUserData({ additional_urls: urls });
      setUserData((prev) => (prev ? { ...prev, additional_urls: urls } : null));
      setOnboardingStep(3);
    } catch (err) {
      setOnboardingError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setOnboardingSaving(false);
    }
  }, [user, additionalUrls]);

  // —— Onboarding: Step 3 — Photo change
  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfileWithPhoto((prev) => ({ ...(prev ?? userData?.profile ?? emptyProfile), photo_base64: reader.result as string }));
    reader.readAsDataURL(file);
  }, [userData?.profile]);

  // —— Onboarding: Save and continue (step 3 → default page)
  const handleOnboardingComplete = useCallback(async () => {
    if (!user) return;
    setOnboardingSaving(true);
    setOnboardingError(null);
    try {
      const profileToSave = profileWithPhoto ?? userData?.profile ?? emptyProfile;
      await putUserData({ profile: profileToSave, onboarding_complete: true });
      await loadUserData();
    } catch (err) {
      setOnboardingError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setOnboardingSaving(false);
    }
  }, [user, profileWithPhoto, userData?.profile, loadUserData]);

  // —— Create CV flow
  const handleOpenCreateModal = useCallback(() => {
    setCreateModalOpen(true);
    setGenerateProgress('');
    setGenerateError(null);
    setResult(null);
  }, []);

  const handleFetchJob = useCallback(async () => {
    if (!jobDescription.trim()) return;
    setGenerateError(null);
    setGenerateProgress('Fetching job description…');
    try {
      const { content } = await fetchJobDescription(
        jobIsUrl ? jobDescription.trim() : null,
        jobIsUrl ? null : jobDescription.trim()
      );
      setJobDescription(content || jobDescription);
      setGenerateProgress('');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Fetch failed');
      setGenerateProgress('');
    }
  }, [jobDescription, jobIsUrl]);

  const handleGenerate = useCallback(async () => {
    const profile = userData?.profile ?? emptyProfile;
    if (!hasProfileData(profile)) {
      setGenerateError('Profile is missing. Edit your information first.');
      return;
    }
    setGenerateError(null);
    setGenerateProgress('Preparing…');
    try {
      const hasJob = !!jobDescription.trim();
      setGenerateProgress(hasJob ? 'Generating tailored CV and motivation letter…' : 'Generating tailored CV…');
      const urls = userData?.additional_urls?.filter((u) => u?.trim().startsWith('http')) ?? [];
      const res = await generateCV({
        profile,
        job_description: jobDescription.trim(),
        personal_summary: userData?.personal_summary?.trim() || undefined,
        additional_urls: urls,
        language,
        template,
      });
      setResult(res);
      setRefreshGeneratedList((t) => t + 1);
      setGenerateProgress('');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
      setGenerateProgress('');
    }
  }, [userData, jobDescription, language, template]);

  const profileDisplay = profileWithPhoto ?? userData?.profile ?? emptyProfile;
  const showDefaultPage = userData?.onboarding_complete && hasProfileData(userData.profile);
  const showOnboarding = user && userData && !showDefaultPage;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-slate-900 transition-colors">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-slate-500">{user.email}</span>
                <button type="button" onClick={() => logout()} className="text-sm text-slate-600 hover:text-slate-900">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-slate-900">Sign in</Link>
                <Link href="/register" className="text-slate-600 hover:text-slate-900">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {!user && <LandingPage />}

        {user && loading && (
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading…</div>
          </div>
        )}

        {showOnboarding && !loading && (
          <div className="mx-auto max-w-6xl px-6 py-8">
          <OnboardingUI
            step={onboardingStep}
            userData={userData}
            additionalUrls={additionalUrls}
            setAdditionalUrls={setAdditionalUrls}
            profileWithPhoto={profileDisplay}
            onCVUpload={handleCVUpload}
            onPhotoChange={handlePhotoChange}
            onNextFromUrls={handleOnboardingNextFromUrls}
            onComplete={handleOnboardingComplete}
            saving={onboardingSaving}
            parseProgress={parseProgress}
            parseError={parseError}
            error={onboardingError}
          />
          </div>
        )}

        {user && showDefaultPage && !loading && (
          <div className="mx-auto max-w-6xl px-6 py-8">
          <DefaultPageUI
            userData={userData!}
            onOpenCreate={handleOpenCreateModal}
            refreshTrigger={refreshGeneratedList}
          />
          </div>
        )}

        {createModalOpen && (
          <CreateCVModal
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            jobIsUrl={jobIsUrl}
            setJobIsUrl={setJobIsUrl}
            language={language}
            setLanguage={setLanguage}
            template={template}
            setTemplate={setTemplate}
            progress={generateProgress}
            error={generateError}
            result={result}
            onFetchJob={handleFetchJob}
            onGenerate={handleGenerate}
            onClose={() => {
              setCreateModalOpen(false);
              setResult(null);
            }}
            onDownloadPdf={downloadPdf}
            onDownloadLetter={downloadLetterPdf}
          />
        )}
      </main>
    </div>
  );
}

// ——— Onboarding (steps 1–3) ———
function OnboardingUI({
  step,
  userData,
  additionalUrls,
  setAdditionalUrls,
  profileWithPhoto,
  onCVUpload,
  onPhotoChange,
  onNextFromUrls,
  onComplete,
  saving,
  parseProgress,
  parseError,
  error,
}: {
  step: 1 | 2 | 3;
  userData: UserData | null;
  additionalUrls: string[];
  setAdditionalUrls: (urls: string[]) => void;
  profileWithPhoto: Profile;
  onCVUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNextFromUrls: () => void;
  onComplete: () => void;
  saving: boolean;
  parseProgress: string;
  parseError: string | null;
  error: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">
        {step === 1 && 'Step 1: Upload your CV'}
        {step === 2 && 'Step 2: Additional links (optional)'}
        {step === 3 && 'Step 3: Profile photo (optional)'}
      </h2>

      {step === 1 && (
        <>
          <p className="text-sm text-slate-600">
            Upload your CV as a PDF (e.g. exported from LinkedIn or other sources). We’ll extract your information.
          </p>
          <input
            type="file"
            accept=".pdf,.json"
            onChange={onCVUpload}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
          />
          {parseProgress && <p className="text-sm text-blue-600">{parseProgress}</p>}
          {parseError && <p className="text-sm text-red-600">{parseError}</p>}
        </>
      )}

      {step === 2 && (
        <>
          <p className="text-sm text-slate-600">Add any links you want to include (e.g. Wikipedia, personal homepage).</p>
          <div className="space-y-2">
            {additionalUrls.map((url, i) => (
              <input
                key={i}
                type="url"
                value={url}
                onChange={(e) => {
                  const next = [...additionalUrls];
                  next[i] = e.target.value;
                  setAdditionalUrls(next);
                }}
                placeholder={`URL ${i + 1}`}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={onNextFromUrls}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Next: Add photo'}
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-sm text-slate-600">Add a profile photo if you like.</p>
          {profileWithPhoto.photo_base64 && (
            <div className="flex items-center gap-3">
              <img src={profileWithPhoto.photo_base64} alt="Profile" className="h-20 w-20 rounded-full object-cover border border-slate-200" />
              <span className="text-sm text-slate-600">Photo added</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={onComplete}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
        </>
      )}
    </div>
  );
}

// ——— Profile section icons (vector) ———
function PersonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function BadgeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function GraduationIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  );
}
function SkillsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

// ——— Default page (summary + actions) ———
function DefaultPageUI({ userData, onOpenCreate, refreshTrigger }: { userData: UserData; onOpenCreate: () => void; refreshTrigger: number }) {
  const p = userData.profile;
  const [generatedList, setGeneratedList] = useState<GeneratedCVItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    getGeneratedCVs()
      .then((list) => { if (!cancelled) setGeneratedList(list); })
      .catch(() => { if (!cancelled) setGeneratedList([]); })
      .finally(() => { if (!cancelled) setListLoading(false); });
    return () => { cancelled = true; };
  }, [refreshTrigger]);

  const handleDownloadPdf = useCallback(async (sessionId: string) => {
    setDownloadError(null);
    try {
      await downloadPdf(sessionId);
    } catch {
      setDownloadError('Download failed');
    }
  }, []);
  const handleDownloadLetter = useCallback(async (sessionId: string) => {
    setDownloadError(null);
    try {
      await downloadLetterPdf(sessionId);
    } catch {
      setDownloadError('Download failed');
    }
  }, []);

  const formatDate = (createdAt: string) => {
    try {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return createdAt;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60_000);
      const diffHours = Math.floor(diffMs / 3_600_000);
      const diffDays = Math.floor(diffMs / 86_400_000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      if (diffHours < 24 && now.getDate() === d.getDate()) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) return 'yesterday';
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    } catch {
      return createdAt;
    }
  };

  const infoItems: { label: string; value: string | React.ReactNode; icon: React.ReactNode }[] = [];
  if (p.full_name) infoItems.push({ label: 'Name', value: p.full_name, icon: <PersonIcon /> });
  if (p.headline) infoItems.push({ label: 'Headline', value: p.headline, icon: <BadgeIcon /> });
  if (p.summary) infoItems.push({ label: 'Summary', value: p.summary.length > 220 ? p.summary.slice(0, 220) + '…' : p.summary, icon: <DocIcon /> });
  if ((p.experience?.length ?? 0) > 0) infoItems.push({ label: 'Experience', value: `${p.experience!.length} position${p.experience!.length === 1 ? '' : 's'}`, icon: <BriefcaseIcon /> });
  if ((p.education?.length ?? 0) > 0) infoItems.push({ label: 'Education', value: `${p.education!.length} entr${p.education!.length === 1 ? 'y' : 'ies'}`, icon: <GraduationIcon /> });
  if ((p.skills?.length ?? 0) > 0) infoItems.push({ label: 'Skills', value: p.skills!.slice(0, 6).join(', ') + (p.skills!.length > 6 ? '…' : ''), icon: <SkillsIcon /> });
  const extraUrls = (userData.additional_urls ?? []).filter(Boolean);
  if (extraUrls.length > 0) infoItems.push({ label: 'Links', value: extraUrls.join(', '), icon: <LinkIcon /> });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-base font-semibold text-slate-800">Your information</h2>
        </div>
        <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-8">
          {p.photo_base64 && (
            <div className="flex-shrink-0">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 w-28 h-28 shadow-inner">
                <img src={p.photo_base64} alt="Profile" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1 grid gap-4 sm:grid-cols-2">
            {infoItems.length === 0 ? (
              <div className="flex gap-3 p-3 rounded-lg bg-slate-50/80 border border-slate-100 sm:col-span-2">
                <span className="flex-shrink-0 text-slate-400" aria-hidden><PersonIcon /></span>
                <p className="text-sm text-slate-500">No information yet. Edit your profile to add details.</p>
              </div>
            ) : infoItems.map(({ label, value, icon }) => (
              <div key={label} className="flex gap-3 p-3 rounded-lg bg-slate-50/80 border border-slate-100">
                <span className="flex-shrink-0 text-slate-400 mt-0.5" aria-hidden>{icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="text-sm text-slate-800 mt-0.5 break-words">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Edit information
          </Link>
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 transition-colors"
          >
            Create CV & motivation letter
          </button>
          <button
            type="button"
            onClick={() => openPreviewCvHtml('cv_executive.html').catch((e) => window.alert(e.message))}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Preview CV (HTML)
          </button>
        </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-base font-semibold text-slate-800">Generated CVs & motivation letters</h2>
        </div>
        <div className="p-6">
          {listLoading && <p className="text-sm text-slate-500 py-4">Loading…</p>}
          {!listLoading && generatedList.length === 0 && (
            <p className="text-sm text-slate-500 py-4">No generated CVs yet. Use &quot;Create CV & motivation letter&quot; above.</p>
          )}
          {!listLoading && generatedList.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div
                className="grid gap-4 items-center px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200"
                style={{ gridTemplateColumns: 'minmax(140px, 1fr) minmax(80px, 0.6fr) minmax(160px, 2fr) minmax(200px, auto)' }}
              >
                <span>Date</span>
                <span>Language</span>
                <span>Job description</span>
                <span className="text-right">Actions</span>
              </div>
              {generatedList.map((item) => (
                <div
                  key={item.session_id}
                  className="grid gap-4 items-center px-4 py-3 text-sm border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                  style={{ gridTemplateColumns: 'minmax(140px, 1fr) minmax(80px, 0.6fr) minmax(160px, 2fr) minmax(200px, auto)' }}
                >
                  <span className="text-slate-700 tabular-nums">{formatDate(item.created_at)}</span>
                  <span className="text-slate-600">
                    {item.language ? (LANGUAGES.find((l) => l.value === item.language)?.label ?? item.language) : '—'}
                  </span>
                  {item.job_description != null && item.job_description !== '' ? (
                    <span
                      className="text-slate-600 truncate cursor-help border-b border-dotted border-slate-300 max-w-full"
                      title={item.job_description}
                    >
                      {item.job_description.length > 20 ? `${item.job_description.slice(0, 20)}…` : item.job_description}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                  <div className="flex gap-2 justify-end flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(item.session_id)}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors min-w-[6.5rem]"
                    >
                      CV (PDF)
                    </button>
                    {item.has_letter_pdf ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadLetter(item.session_id)}
                        className="inline-flex items-center justify-center rounded-lg bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors min-w-[6.5rem]"
                      >
                        Letter (PDF)
                      </button>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 min-w-[6.5rem]">
                        No letter
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {downloadError && <p className="mt-3 text-sm text-red-600">{downloadError}</p>}
        </div>
      </div>
    </div>
  );
}

// ——— Create CV modal (job description optional, language, template, generate with feedback) ———
function CreateCVModal({
  jobDescription,
  setJobDescription,
  jobIsUrl,
  setJobIsUrl,
  language,
  setLanguage,
  template,
  setTemplate,
  progress,
  error,
  result,
  onFetchJob,
  onGenerate,
  onClose,
  onDownloadPdf,
  onDownloadLetter,
}: {
  jobDescription: string;
  setJobDescription: (v: string) => void;
  jobIsUrl: boolean;
  setJobIsUrl: (v: boolean) => void;
  language: string;
  setLanguage: (v: string) => void;
  template: string;
  setTemplate: (v: string) => void;
  progress: string;
  error: string | null;
  result: GenerateCVResponse | null;
  onFetchJob: () => void;
  onGenerate: () => void;
  onClose: () => void;
  onDownloadPdf: (sessionId: string) => Promise<void>;
  onDownloadLetter: (sessionId: string) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Create CV & motivation letter</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job description (optional)</label>
            <div className="flex gap-2 mb-1">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={!jobIsUrl} onChange={() => setJobIsUrl(false)} /> Paste text
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" checked={jobIsUrl} onChange={() => setJobIsUrl(true)} /> URL
              </label>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={jobIsUrl ? 'https://…' : 'Paste job description…'}
            />
            {jobIsUrl && (
              <button type="button" onClick={onFetchJob} className="mt-1 text-sm text-blue-600 hover:underline">
                Fetch from URL
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {LANGUAGES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CV template</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="cv_base.html">Modern</option>
              <option value="cv_executive.html">Executive</option>
            </select>
          </div>

          {progress && <p className="text-sm text-blue-600">{progress}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onGenerate}
              disabled={!!progress}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {progress ? 'Working…' : 'Generate'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>

          {result && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
              <p className="text-sm font-medium text-slate-700">Done. Download your files:</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onDownloadPdf(result.session_id)}
                  className="inline-flex justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Download CV (PDF)
                </button>
                {result.motivation_letter?.trim() && (
                  <button
                    type="button"
                    onClick={() => onDownloadLetter(result.session_id)}
                    className="inline-flex justify-center rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Download motivation letter (PDF)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
