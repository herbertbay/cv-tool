'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseCV, getProfile, putUserData, type Profile, type UserData } from './lib/api';
import { useAuth } from './lib/auth-context';
import { LandingPage } from './components/LandingPage';
import { UserEmailMenu } from './components/UserEmailMenu';
import { CvThemePicker } from './components/CvThemePicker';
import { DEFAULT_CV_ACCENT } from './lib/cv-templates';

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

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4>(1);
  const [cvTemplate, setCvTemplate] = useState('cv_base.html');
  const [cvAccent, setCvAccent] = useState(DEFAULT_CV_ACCENT);
  const [additionalUrls, setAdditionalUrls] = useState<string[]>(['', '', '', '', '']);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [profileWithPhoto, setProfileWithPhoto] = useState<Profile | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    getProfile()
      .then((data) => {
        setUserData(data);
        setCvTemplate(data.default_cv_template || 'cv_base.html');
        setCvAccent(data.default_cv_accent || DEFAULT_CV_ACCENT);
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

  // Logged-in users with complete profile go to dashboard (single place for app UI)
  useEffect(() => {
    if (!user || loading || !userData) return;
    if (!userData.onboarding_complete || !hasProfileData(userData.profile)) return;
    const create = searchParams.get('create');
    router.replace(create === '1' ? '/dashboard?create=1' : '/dashboard');
  }, [user, loading, userData, router, searchParams]);

  // Onboarding: Step 1: Upload resume
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
          default_cv_template: prev?.default_cv_template,
          default_cv_accent: prev?.default_cv_accent,
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

  // Onboarding: Step 2: Next (save URLs, go to step 3)
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

  const handleOnboardingNextFromTheme = useCallback(async () => {
    if (!user) return;
    setOnboardingSaving(true);
    setOnboardingError(null);
    try {
      await putUserData({ default_cv_template: cvTemplate, default_cv_accent: cvAccent });
      setUserData((prev) =>
        prev
          ? {
              ...prev,
              default_cv_template: cvTemplate,
              default_cv_accent: cvAccent,
            }
          : null
      );
      setOnboardingStep(4);
    } catch (err) {
      setOnboardingError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setOnboardingSaving(false);
    }
  }, [user, cvTemplate, cvAccent]);

  // Onboarding: Step 4: Photo change
  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfileWithPhoto((prev) => ({ ...(prev ?? userData?.profile ?? emptyProfile), photo_base64: reader.result as string }));
    reader.readAsDataURL(file);
  }, [userData?.profile]);

  // Onboarding: Save and continue (step 4 → default page)
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

  const profileDisplay = profileWithPhoto ?? userData?.profile ?? emptyProfile;
  const showDefaultPage = userData?.onboarding_complete && hasProfileData(userData.profile);
  const showOnboarding = user && userData && !showDefaultPage;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <UserEmailMenu email={user.email} />
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-blue-700 transition-colors">Sign in</Link>
                <Link
                  href="/get-started"
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-700/20 hover:bg-indigo-800 transition-colors"
                >
                  Get started
                </Link>
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
            cvTemplate={cvTemplate}
            cvAccent={cvAccent}
            onCvTemplateChange={setCvTemplate}
            onCvAccentChange={setCvAccent}
            onCVUpload={handleCVUpload}
            onPhotoChange={handlePhotoChange}
            onNextFromUrls={handleOnboardingNextFromUrls}
            onNextFromTheme={handleOnboardingNextFromTheme}
            onComplete={handleOnboardingComplete}
            saving={onboardingSaving}
            parseProgress={parseProgress}
            parseError={parseError}
            error={onboardingError}
          />
          </div>
        )}

        {user && showDefaultPage && !loading && (
          <div className="mx-auto max-w-6xl px-6 py-8 flex items-center justify-center">
            <p className="text-slate-500">Redirecting to dashboard…</p>
          </div>
        )}
      </main>
    </div>
  );
}

function OnboardingStepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const labels = ['Upload', 'Links', 'Look', 'Photo'];
  return (
    <nav aria-label="Onboarding progress" className="mb-6">
      <ol className="flex flex-wrap gap-3 text-xs sm:text-sm">
        {labels.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  active ? 'border-blue-700 bg-blue-700 text-white' : done ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={active ? 'font-semibold text-slate-900' : 'text-slate-600'}>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Onboarding (steps 1–4)
function OnboardingUI({
  step,
  userData,
  additionalUrls,
  setAdditionalUrls,
  profileWithPhoto,
  cvTemplate,
  cvAccent,
  onCvTemplateChange,
  onCvAccentChange,
  onCVUpload,
  onPhotoChange,
  onNextFromUrls,
  onNextFromTheme,
  onComplete,
  saving,
  parseProgress,
  parseError,
  error,
}: {
  step: 1 | 2 | 3 | 4;
  userData: UserData | null;
  additionalUrls: string[];
  setAdditionalUrls: (urls: string[]) => void;
  profileWithPhoto: Profile;
  cvTemplate: string;
  cvAccent: string;
  onCvTemplateChange: (v: string) => void;
  onCvAccentChange: (v: string) => void;
  onCVUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNextFromUrls: () => void;
  onNextFromTheme: () => void;
  onComplete: () => void;
  saving: boolean;
  parseProgress: string;
  parseError: string | null;
  error: string | null;
}) {
  const httpUrls = additionalUrls.filter((u) => u.trim().startsWith('http'));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl mx-auto space-y-6">
      <OnboardingStepper step={step} />
      <h2 className="text-xl font-semibold text-slate-800">
        {step === 1 && 'Step 1: Upload your resume'}
        {step === 2 && 'Step 2: Additional links (optional)'}
        {step === 3 && 'Step 3: Look & theme'}
        {step === 4 && 'Step 4: Profile photo (optional)'}
      </h2>

      {step === 1 && (
        <>
          <p className="text-sm text-slate-600">
            Upload your resume as a PDF (for example from LinkedIn via More → Save to PDF). We’ll extract your information.
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
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Next: Choose look'}
          </button>
        </>
      )}

      {step === 3 && userData && (
        <>
          <p className="text-sm text-slate-600">
            Choose the default template and accent for your base CV and new tailored resumes. You can change this anytime
            in Edit profile.
          </p>
          <CvThemePicker
            template={cvTemplate}
            onTemplateChange={onCvTemplateChange}
            accent={cvAccent}
            onAccentChange={onCvAccentChange}
            previewProfile={userData.profile}
            additionalUrls={httpUrls}
            showPreview
            previewHeight={480}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={onNextFromTheme}
            disabled={saving}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Next: Add photo'}
          </button>
        </>
      )}

      {step === 4 && (
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
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Loading…</p></div>}>
      <HomePageContent />
    </Suspense>
  );
}
