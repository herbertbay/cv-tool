'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseCVPreview, register, putUserData, type Profile } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { countProfileEmptyFields, getProfileCompleteness } from '../lib/profile-completeness';
import { CvThemePicker } from '../components/CvThemePicker';
import { DEFAULT_CV_ACCENT } from '../lib/cv-templates';

const STORAGE_KEY = 'cv-tool-get-started-draft';

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

const emptyExp = {
  title: '',
  company: '',
  start_date: null as string | null,
  end_date: null as string | null,
  description: null as string | null,
  location: null as string | null,
};

const emptyEdu = {
  school: '',
  degree: null as string | null,
  field: null as string | null,
  start_date: null as string | null,
  end_date: null as string | null,
  description: null as string | null,
};

function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const items = [
    { n: 1 as const, label: 'Your resume' },
    { n: 2 as const, label: 'Your profile' },
    { n: 3 as const, label: 'Look & theme' },
    { n: 4 as const, label: 'Create account' },
  ];
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-6 sm:gap-y-2">
        {items.map((it) => (
          <li key={it.n} className="flex items-center gap-2 text-sm">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                step === it.n
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : step > it.n
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {step > it.n ? '✓' : it.n}
            </span>
            <span className={step === it.n ? 'font-semibold text-slate-900' : 'text-slate-600'}>{it.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function GetStartedPage() {
  const router = useRouter();
  const { user, setUserFromAuth } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [additionalUrls, setAdditionalUrls] = useState<string[]>(['', '', '', '', '']);
  const [template, setTemplate] = useState('cv_base.html');
  const [accent, setAccent] = useState(DEFAULT_CV_ACCENT);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>;
        if (d.profile && typeof d.profile === 'object') {
          setProfile({ ...emptyProfile, ...(d.profile as Profile) });
        }
        if (typeof d.step === 'number' && d.step >= 1 && d.step <= 4) {
          setStep(d.step as 1 | 2 | 3 | 4);
        }
        if (Array.isArray(d.additionalUrls)) {
          const u = d.additionalUrls.map((x) => String(x ?? ''));
          while (u.length < 5) u.push('');
          setAdditionalUrls(u.slice(0, 5));
        }
        if (typeof d.template === 'string') setTemplate(d.template);
        if (typeof d.accent === 'string') setAccent(d.accent);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, profile, additionalUrls, template, accent })
      );
    } catch {
      /* ignore */
    }
  }, [hydrated, step, profile, additionalUrls, template, accent]);

  const { paths } = useMemo(() => getProfileCompleteness(profile), [profile]);
  const b = (path: string) => (paths.has(path) ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300');
  const incomplete = countProfileEmptyFields(profile) > 0;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setParseProgress(file.name.toLowerCase().endsWith('.pdf') ? 'Parsing PDF…' : 'Parsing file…');
    try {
      const parsed = await parseCVPreview(file);
      const merged = { ...emptyProfile, ...parsed };
      setProfile({
        ...merged,
        experience: merged.experience?.length ? merged.experience : [{ ...emptyExp }],
        education: merged.education?.length ? merged.education : [{ ...emptyEdu }],
        languages: merged.languages?.length ? merged.languages : [''],
      });
      setParseProgress('');
      setStep(2);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed');
      setParseProgress('');
    }
  };

  const handleStartBlank = () => {
    setProfile({
      ...emptyProfile,
      experience: [{ ...emptyExp }],
      education: [{ ...emptyEdu }],
      languages: [''],
    });
    setStep(2);
  };

  const update = (part: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...part }));
  };

  const updateExp = (i: number, field: string, value: string) => {
    setProfile((p) => {
      const next = [...(p.experience || [])];
      if (!next[i]) next[i] = { ...emptyExp };
      (next[i] as Record<string, unknown>)[field] = value || null;
      return { ...p, experience: next };
    });
  };

  const addExp = () => {
    setProfile((p) => ({ ...p, experience: [...(p.experience || []), { ...emptyExp }] }));
  };

  const removeExp = (i: number) => {
    setProfile((p) => ({ ...p, experience: (p.experience || []).filter((_, j) => j !== i) }));
  };

  const updateEdu = (i: number, field: string, value: string) => {
    setProfile((p) => {
      const next = [...(p.education || [])];
      if (!next[i]) next[i] = { ...emptyEdu };
      (next[i] as Record<string, unknown>)[field] = value || null;
      return { ...p, education: next };
    });
  };

  const addEdu = () => {
    setProfile((p) => ({ ...p, education: [...(p.education || []), { ...emptyEdu }] }));
  };

  const removeEdu = (i: number) => {
    setProfile((p) => ({ ...p, education: (p.education || []).filter((_, j) => j !== i) }));
  };

  const setSkillsText = (text: string) => {
    const skills = text
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    update({ skills });
  };

  const updateLang = (i: number, value: string) => {
    setProfile((p) => {
      const next = [...(p.languages || [])];
      next[i] = value;
      return { ...p, languages: next };
    });
  };

  const addLang = () => {
    setProfile((p) => ({ ...p, languages: [...(p.languages || []), ''] }));
  };

  const removeLang = (i: number) => {
    setProfile((p) => ({ ...p, languages: (p.languages || []).filter((_, j) => j !== i) }));
  };

  const updateCert = (i: number, field: string, value: string) => {
    setProfile((p) => {
      const next = [...(p.certifications || [])];
      if (!next[i]) next[i] = { name: '', authority: null, date: null, url: null };
      (next[i] as Record<string, unknown>)[field] = value || null;
      return { ...p, certifications: next };
    });
  };

  const addCert = () => {
    setProfile((p) => ({
      ...p,
      certifications: [...(p.certifications || []), { name: '', authority: null, date: null, url: null }],
    }));
  };

  const removeCert = (i: number) => {
    setProfile((p) => ({
      ...p,
      certifications: (p.certifications || []).filter((_, j) => j !== i),
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters');
      return;
    }
    setAuthBusy(true);
    try {
      const auth = await register(email.trim(), password);
      setUserFromAuth(auth.user);
      const urls = additionalUrls.filter((u) => u.trim().startsWith('http'));
      await putUserData({
        profile,
        additional_urls: urls,
        default_cv_template: template,
        default_cv_accent: accent,
        onboarding_complete: true,
      });
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setAuthBusy(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Redirecting…</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
            Optimal CV
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Stepper step={step} />

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          {step === 1 && (
            <>
              <h1 className="text-xl font-semibold text-slate-800">Add your resume</h1>
              <p className="text-sm text-slate-600">
                Try the tool before creating an account. Upload a PDF or LinkedIn JSON export, or start from scratch.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Upload PDF or JSON</label>
                  <input
                    type="file"
                    accept=".pdf,.json"
                    onChange={handleUpload}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700"
                  />
                  {parseProgress && <p className="mt-2 text-sm text-blue-600">{parseProgress}</p>}
                  {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartBlank}
                  className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  Start from scratch
                </button>

                <details className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm">
                  <summary className="cursor-pointer font-medium text-slate-800">Import from LinkedIn (JSON)</summary>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-600">
                    <li>
                      On LinkedIn: <strong>Settings &amp; Privacy</strong> → <strong>Data privacy</strong> →{' '}
                      <strong>Get a copy of your data</strong>.
                    </li>
                    <li>Request the larger archive (includes profile JSON).</li>
                    <li>Download the ZIP, unzip, and upload the profile JSON file here (same as PDF upload).</li>
                  </ol>
                  <p className="mt-2 text-slate-500">
                    You can also export a PDF resume from LinkedIn and upload the PDF instead.
                  </p>
                </details>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-xl font-semibold text-slate-800">Complete your profile</h1>
              <p className="text-sm text-slate-600">
                We need these fields for ATS-friendly resumes. Optional links can appear on your CV.
              </p>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full name *</label>
                    <input
                      value={profile.full_name}
                      onChange={(e) => update({ full_name: e.target.value })}
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${b('basic.full_name')}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={profile.email ?? ''}
                      onChange={(e) => update({ email: e.target.value || null })}
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${b('basic.email')}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Summary *</label>
                    <textarea
                      value={profile.summary}
                      onChange={(e) => update({ summary: e.target.value })}
                      rows={4}
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${b('basic.summary')}`}
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-800 mb-2">Additional links (optional)</h2>
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
                        placeholder={`https://…`}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-slate-800">Experience *</h2>
                    <button type="button" onClick={addExp} className="text-sm text-blue-700 hover:underline">
                      Add role
                    </button>
                  </div>
                  {(profile.experience || []).map((exp, i) => (
                    <div key={i} className="mb-4 rounded-lg border border-slate-200 p-3 space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          placeholder="Title *"
                          value={exp.title}
                          onChange={(e) => updateExp(i, 'title', e.target.value)}
                          className={`rounded border px-2 py-1.5 text-sm ${b(`experience.${i}.title`)}`}
                        />
                        <input
                          placeholder="Company *"
                          value={exp.company}
                          onChange={(e) => updateExp(i, 'company', e.target.value)}
                          className={`rounded border px-2 py-1.5 text-sm ${b(`experience.${i}.company`)}`}
                        />
                        <input
                          placeholder="Start *"
                          value={exp.start_date ?? ''}
                          onChange={(e) => updateExp(i, 'start_date', e.target.value)}
                          className={`rounded border px-2 py-1.5 text-sm ${b(`experience.${i}.start_date`)}`}
                        />
                        <input
                          placeholder="End *"
                          value={exp.end_date ?? ''}
                          onChange={(e) => updateExp(i, 'end_date', e.target.value)}
                          className={`rounded border px-2 py-1.5 text-sm ${b(`experience.${i}.end_date`)}`}
                        />
                      </div>
                      {(profile.experience || []).length > 1 && (
                        <button type="button" onClick={() => removeExp(i)} className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-slate-800">Education *</h2>
                    <button type="button" onClick={addEdu} className="text-sm text-blue-700 hover:underline">
                      Add school
                    </button>
                  </div>
                  {(profile.education || []).map((edu, i) => (
                    <div key={i} className="mb-4 rounded-lg border border-slate-200 p-3 space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          placeholder="School *"
                          value={edu.school}
                          onChange={(e) => updateEdu(i, 'school', e.target.value)}
                          className={`rounded border px-2 py-1.5 text-sm ${b(`education.${i}.school`)}`}
                        />
                        <input
                          placeholder="Degree *"
                          value={edu.degree ?? ''}
                          onChange={(e) => updateEdu(i, 'degree', e.target.value)}
                          className={`rounded border px-2 py-1.5 text-sm ${b(`education.${i}.degree`)}`}
                        />
                        <input
                          placeholder="Field *"
                          value={edu.field ?? ''}
                          onChange={(e) => updateEdu(i, 'field', e.target.value)}
                          className={`rounded border px-2 py-1.5 text-sm ${b(`education.${i}.field`)}`}
                        />
                        <input
                          placeholder="Start *"
                          value={edu.start_date ?? ''}
                          onChange={(e) => updateEdu(i, 'start_date', e.target.value)}
                          className={`rounded border px-2 py-1.5 text-sm ${b(`education.${i}.start_date`)}`}
                        />
                        <input
                          placeholder="End *"
                          value={edu.end_date ?? ''}
                          onChange={(e) => updateEdu(i, 'end_date', e.target.value)}
                          className={`rounded border px-2 py-1.5 text-sm ${b(`education.${i}.end_date`)}`}
                        />
                      </div>
                      {(profile.education || []).length > 1 && (
                        <button type="button" onClick={() => removeEdu(i)} className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Skills * (comma-separated)</label>
                  <input
                    value={(profile.skills || []).join(', ')}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${b('skills')}`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-slate-800">Languages *</h2>
                    <button type="button" onClick={addLang} className="text-sm text-blue-700 hover:underline">
                      Add
                    </button>
                  </div>
                  {(profile.languages || []).map((lang, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        value={lang}
                        onChange={(e) => updateLang(i, e.target.value)}
                        placeholder="e.g. English (Fluent)"
                        className={`flex-1 rounded border px-2 py-1.5 text-sm ${b(`languages.${i}`)}`}
                      />
                      {(profile.languages || []).length > 1 && (
                        <button type="button" onClick={() => removeLang(i)} className="text-sm text-red-600">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-slate-800">Certifications (optional)</h2>
                    <button type="button" onClick={addCert} className="text-sm text-blue-700 hover:underline">
                      Add
                    </button>
                  </div>
                  {(profile.certifications || []).map((c, i) => (
                    <div key={i} className="mb-2 flex gap-2">
                      <input
                        placeholder="Name *"
                        value={c.name}
                        onChange={(e) => updateCert(i, 'name', e.target.value)}
                        className={`flex-1 rounded border px-2 py-1.5 text-sm ${b(`cert.${i}.name`)}`}
                      />
                      <button type="button" onClick={() => removeCert(i)} className="text-sm text-red-600">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {incomplete && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Please fill all required fields (highlighted) before continuing.
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={incomplete}
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
                >
                  Next: Choose look
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-xl font-semibold text-slate-800">How should your CV look?</h1>
              <p className="text-sm text-slate-600">
                Pick a template and accent. This becomes your default for new tailored resumes; you can change it later in
                Edit profile or per application.
              </p>
              <CvThemePicker
                template={template}
                onTemplateChange={setTemplate}
                accent={accent}
                onAccentChange={setAccent}
                previewProfile={profile}
                additionalUrls={additionalUrls.filter((u) => u.trim().startsWith('http'))}
                showPreview
                previewHeight={560}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
                >
                  Next: Create account
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="text-xl font-semibold text-slate-800">Save your work</h1>
              <p className="text-sm text-slate-600">
                Create a free account to store your profile and generate tailored resumes. You are on step 4 of 4.
              </p>
              <form onSubmit={handleRegister} className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="gs-email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    id="gs-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="gs-password" className="block text-sm font-medium text-slate-700 mb-1">
                    Password (min 8 characters)
                  </label>
                  <input
                    id="gs-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                {authError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                    {authError}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
                  >
                    {authBusy ? 'Creating account…' : 'Create account & continue'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-700 hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
