'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getProfile,
  fetchJobDescription,
  generateCV,
  createJobApplication,
  downloadPdf,
  downloadLetterPdf,
  type UserData,
  type Profile,
  type GenerateCVResponse,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { JobApplicationsHistory } from '../components/JobApplicationsHistory';
import { CreateCVModal } from '../components/CreateCVModal';

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

function hasProfileData(p: UserData['profile']): boolean {
  return (
    Boolean(p?.full_name?.trim()) ||
    Boolean(p?.summary?.trim()) ||
    (p?.experience?.length ?? 0) > 0 ||
    (p?.education?.length ?? 0) > 0 ||
    (p?.skills?.length ?? 0) > 0
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [jobIsUrl, setJobIsUrl] = useState(false);
  const [language, setLanguage] = useState('en');
  const [template, setTemplate] = useState('cv_base.html');
  const [generateProgress, setGenerateProgress] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateCVResponse | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    setLoading(true);
    getProfile()
      .then((data) => setUserData(data))
      .catch(() => setUserData(null))
      .finally(() => setLoading(false));
  }, [user, router]);

  useEffect(() => {
    if (searchParams.get('create') === '1') setCreateModalOpen(true);
  }, [searchParams]);

  const handleOpenCreate = useCallback(() => {
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
      const { content } = await fetchJobDescription(jobIsUrl ? jobDescription.trim() : null, jobIsUrl ? null : jobDescription.trim());
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
      setGenerateProgress('Creating job application…');
      const created = await createJobApplication({
        session_id: res.session_id,
        full_job_description: jobDescription.trim() || undefined,
        application_date: new Date().toISOString().slice(0, 10),
        tailored_headline: res.tailored_headline || undefined,
        tailored_skills: res.tailored_skills || undefined,
        tailored_education: res.tailored_education || undefined,
        extract: true,
      });
      setRefreshTrigger((t) => t + 1);
      setCreateModalOpen(false);
      setResult(null);
      setGenerateProgress('');
      router.push(`/dashboard/applications/${created.id}`);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
      setGenerateProgress('');
    }
  }, [userData, jobDescription, language, template, router]);

  if (!user) return null;
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (userData && (!userData.onboarding_complete || !hasProfileData(userData.profile))) {
    router.replace('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-blue-700 transition-colors">Dashboard</Link>
            <span className="text-sm text-slate-500">{user.email}</span>
            <button type="button" onClick={() => logout()} className="text-sm text-slate-600 hover:text-slate-900">
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600 mb-6">Your history of tailored CVs and motivation letters.</p>
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            Create tailored CV &amp; motivation letter
          </button>
          <Link href="/profile" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Edit profile
          </Link>
        </div>

        <JobApplicationsHistory refreshTrigger={refreshTrigger} />
      </main>

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
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
