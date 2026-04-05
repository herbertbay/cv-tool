'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  getJobApplication,
  updateJobApplication,
  getTailoredContent,
  updateTailoredContent,
  postCvGenerationPreviewHtml,
  regenerateCv,
  generateApplicationMotivationLetter,
  downloadPdf,
  downloadLetterPdf,
  computeApplicationScore,
  getProfile,
  type JobApplication,
  type ApplicationStatus,
  type TailoredContent,
  type Profile,
} from '../../../lib/api';
import { defaultCvIncludes, toApiPayload, type CvSectionIncludesState } from '../../../lib/cv-section-includes';
import { DEFAULT_CV_ACCENT, normalizeClientAccentHex } from '../../../lib/cv-templates';
import { useAuth } from '../../../lib/auth-context';
import { UserEmailMenu } from '../../../components/UserEmailMenu';
import { CvThemePicker } from '../../../components/CvThemePicker';

const APPLICATION_STATUSES: ApplicationStatus[] = ['Interested', 'Applied', 'Interview', 'Rejected', 'Offer'];


function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const BREAKDOWN_LABELS: Record<string, string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
};

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left hover:bg-slate-50/80 transition-colors"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p> : null}
        </div>
        <span className="text-slate-400 text-sm shrink-0 mt-0.5 tabular-nums" aria-hidden>
          {open ? '▼' : '▶'}
        </span>
      </button>
      {open ? <div className="px-5 pb-5 pt-1 border-t border-slate-100">{children}</div> : null}
    </div>
  );
}

function AtsScoreExpandedBody({
  atsScore,
  atsScoreSummary,
  atsScoreBreakdown,
}: {
  atsScore: number;
  atsScoreSummary: string | null;
  atsScoreBreakdown: string | null;
}) {
  let breakdown: Record<string, number> | null = null;
  if (atsScoreBreakdown) {
    try {
      breakdown = JSON.parse(atsScoreBreakdown) as Record<string, number>;
    } catch {
      breakdown = null;
    }
  }
  const scoreTier = atsScore >= 75 ? 'strong' : atsScore >= 50 ? 'moderate' : 'develop';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <span
          className={`text-3xl font-bold tabular-nums ${
            scoreTier === 'strong' ? 'text-emerald-700' : scoreTier === 'moderate' ? 'text-amber-700' : 'text-slate-800'
          }`}
        >
          {atsScore}
        </span>
        <span className="text-lg text-slate-500 font-medium">/ 100</span>
        <span
          className={`text-xs font-medium uppercase tracking-wider ${
            scoreTier === 'strong' ? 'text-emerald-600' : scoreTier === 'moderate' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          {scoreTier === 'strong' ? 'Strong match' : scoreTier === 'moderate' ? 'Moderate match' : 'Room to improve'}
        </span>
      </div>
      {atsScoreSummary && (
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{atsScoreSummary}</p>
      )}
      {breakdown && Object.keys(breakdown).length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">Breakdown</p>
          <div className="space-y-3 max-w-xl">
            {['summary', 'skills', 'experience', 'education'].map((key) => {
              const value = breakdown![key];
              if (value == null) return null;
              const pct = Math.round(Math.max(0, Math.min(100, value)));
              const tier = pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{BREAKDOWN_LABELS[key] ?? key}</span>
                    <span className="tabular-nums text-slate-600">{pct}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        tier === 'high' ? 'bg-emerald-500' : tier === 'mid' ? 'bg-amber-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {typeof breakdown.education === 'number' && breakdown.education < 60 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 max-w-xl">
              <p className="text-sm font-medium text-amber-900">Education score is often lower: this is common</p>
              <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
                Many job posts barely mention degrees. Keyword-style checkers score overlap per section; some products list education as its own checklist instead of folding it into one headline number. Here, your education block is compared semantically to the whole job text like other sections, so a posting that omits schooling can yield a low education bar even when the resume is appropriate.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-800 list-disc list-inside">
                <li>When the post names a degree or field, mirror that wording if truthful.</li>
                <li>Weigh summary, skills, and experience more for “fit”; treat a weak education bar as informational if the role does not emphasize schooling.</li>
                <li>Add relevant coursework, thesis topics, or tools (e.g. SQL, Python) that appear in the role.</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const { user } = useAuth();
  const [app, setApp] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    company_name: '',
    job_title: '',
    description: '',
    salary_from: '',
    salary_to: '',
    application_status: 'Interested' as ApplicationStatus,
    full_job_description: '',
    application_date: toDateOnly(new Date()),
    job_url: '',
    tailored_headline: '',
    tailored_skills: '',
    tailored_education: [] as Array<Record<string, unknown>>,
  });
  const [tailored, setTailored] = useState<TailoredContent | null>(null);
  const [tailoredLoading, setTailoredLoading] = useState(false);
  const [savingPdfs, setSavingPdfs] = useState(false);
  const [scoreDetailsOpen, setScoreDetailsOpen] = useState(false);
  const [letterGenerating, setLetterGenerating] = useState(false);
  const [letterCopied, setLetterCopied] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [baseProfile, setBaseProfile] = useState<Profile | null>(null);
  const [cvIncludes, setCvIncludes] = useState<CvSectionIncludesState>(() => defaultCvIncludes(0, 0, null));
  const profileHydratedForApp = useRef<string | null>(null);

  const load = useCallback(() => {
    if (!id || !user) return;
    setLoading(true);
    getJobApplication(id)
      .then((data) => {
        setApp(data);
        setEdit({
          company_name: data.company_name ?? '',
          job_title: data.job_title ?? '',
          description: data.description ?? '',
          salary_from: data.salary_from != null ? String(data.salary_from) : '',
          salary_to: data.salary_to != null ? String(data.salary_to) : '',
          application_status: (data.application_status as ApplicationStatus) ?? 'Interested',
          full_job_description: data.full_job_description ?? '',
          application_date: data.application_date ?? toDateOnly(new Date()),
          job_url: data.job_url ?? '',
          tailored_headline: data.tailored_headline ?? '',
          tailored_skills:
            data.tailored_skills != null && Array.isArray(data.tailored_skills) ? data.tailored_skills.join(', ') : '',
          tailored_education:
            data.tailored_education != null && Array.isArray(data.tailored_education) ? data.tailored_education : [],
        });
      })
      .catch(() => setApp(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  const loadTailored = useCallback(() => {
    if (!app?.session_id) return;
    setTailoredLoading(true);
    getTailoredContent(app.session_id)
      .then((data) =>
        setTailored({
          ...data,
          template_accent: normalizeClientAccentHex(data.template_accent ?? DEFAULT_CV_ACCENT),
        })
      )
      .catch(() => setTailored(null))
      .finally(() => setTailoredLoading(false));
  }, [app?.session_id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (app?.session_id) loadTailored();
    else setTailored(null);
  }, [app?.session_id, loadTailored]);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    getProfile()
      .then((d) => setBaseProfile(d.profile))
      .catch(() => setBaseProfile(null));
  }, [user]);

  useEffect(() => {
    profileHydratedForApp.current = null;
  }, [id]);

  useEffect(() => {
    if (!app?.id || !baseProfile) return;
    if (profileHydratedForApp.current === app.id) return;
    profileHydratedForApp.current = app.id;
    setEdit((e) => ({
      ...e,
      tailored_skills:
        app.tailored_skills != null && Array.isArray(app.tailored_skills)
          ? app.tailored_skills.join(', ')
          : baseProfile.skills.join(', '),
      tailored_education:
        app.tailored_education != null && Array.isArray(app.tailored_education)
          ? app.tailored_education
          : baseProfile.education.map((ed) => ({
              school: ed.school,
              degree: ed.degree ?? '',
              field: ed.field ?? '',
              start_date: ed.start_date ?? '',
              end_date: ed.end_date ?? '',
              description: ed.description ?? '',
            })),
    }));
  }, [app, baseProfile]);

  useEffect(() => {
    if (!app) return;
    const expN = tailored?.tailored_experience?.length ?? 0;
    const eduN = edit.tailored_education.length;
    setCvIncludes(defaultCvIncludes(expN, eduN, app.cv_section_includes ?? null));
  }, [app?.id, app?.cv_section_includes, tailored?.tailored_experience?.length, edit.tailored_education.length]);

  const persistCvIncludes = useCallback(
    (next: CvSectionIncludesState) => {
      setCvIncludes(next);
      if (!id) return;
      updateJobApplication(id, { cv_section_includes: toApiPayload(next) }).catch(() => {});
    },
    [id]
  );

  useEffect(() => {
    if (!app?.session_id || !tailored) {
      setPreviewHtml('');
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(null);
      postCvGenerationPreviewHtml(app.session_id!, {
        tailored_summary: tailored.tailored_summary,
        tailored_experience: tailored.tailored_experience,
        template: tailored.template,
        template_accent: normalizeClientAccentHex(tailored.template_accent ?? DEFAULT_CV_ACCENT),
        tailored_headline: edit.tailored_headline,
        keywords_to_highlight: tailored.keywords_to_highlight,
        cv_section_includes: toApiPayload(cvIncludes),
      })
        .then((html) => {
          if (!cancelled) {
            setPreviewHtml(html);
            setPreviewError(null);
          }
        })
        .catch((e) => {
          if (!cancelled) setPreviewError(e instanceof Error ? e.message : 'Preview failed');
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [app?.session_id, tailored, edit.tailored_headline, cvIncludes, tailored?.template, tailored?.template_accent]);

  const handleSave = useCallback(async () => {
    if (!id || !app) return;
    setSaving(true);
    try {
      const salaryFrom = edit.salary_from.trim() ? Number(edit.salary_from.trim()) : null;
      const salaryTo = edit.salary_to.trim() ? Number(edit.salary_to.trim()) : null;
      const tailoredSkills = edit.tailored_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await updateJobApplication(id, {
        company_name: edit.company_name.trim() || undefined,
        job_title: edit.job_title.trim() || undefined,
        description: edit.description.trim() || undefined,
        salary_from: Number.isFinite(salaryFrom) ? salaryFrom : null,
        salary_to: Number.isFinite(salaryTo) ? salaryTo : null,
        application_status: edit.application_status,
        full_job_description: edit.full_job_description.trim() || null,
        application_date: edit.application_date.trim() ? edit.application_date.trim() : null,
        job_url: edit.job_url.trim() || null,
        tailored_headline: edit.tailored_headline.trim() || null,
        tailored_skills: tailoredSkills,
        tailored_education: edit.tailored_education,
      });
      setApp((prev) => prev ? {
        ...prev,
        company_name: edit.company_name,
        job_title: edit.job_title,
        description: edit.description,
        salary_from: Number.isFinite(salaryFrom) ? salaryFrom : null,
        salary_to: Number.isFinite(salaryTo) ? salaryTo : null,
        application_status: edit.application_status,
        full_job_description: edit.full_job_description,
        application_date: edit.application_date,
        job_url: edit.job_url,
        tailored_headline: edit.tailored_headline,
        tailored_skills: tailoredSkills,
        tailored_education: edit.tailored_education,
      } : null);
    } finally {
      setSaving(false);
    }
  }, [id, app, edit]);

  const handleSyncPdfs = useCallback(async () => {
    if (!app?.session_id || !tailored) return;
    setSavingPdfs(true);
    setRegenerateError(null);
    try {
      await updateTailoredContent(app.session_id, {
        tailored_summary: tailored.tailored_summary,
        tailored_experience: tailored.tailored_experience,
      });
      await regenerateCv(
        app.session_id,
        tailored.template,
        edit.tailored_headline,
        toApiPayload(cvIncludes),
        normalizeClientAccentHex(tailored.template_accent ?? DEFAULT_CV_ACCENT)
      );
    } catch (e) {
      setRegenerateError(e instanceof Error ? e.message : 'Failed to update PDF files');
    } finally {
      setSavingPdfs(false);
    }
  }, [app?.session_id, tailored, edit.tailored_headline, cvIncludes, tailored?.template, tailored?.template_accent]);

  const handleGenerateMotivationLetter = useCallback(async () => {
    if (!id || !app?.session_id) return;
    setLetterGenerating(true);
    setLetterError(null);
    try {
      const res = await generateApplicationMotivationLetter(id);
      setTailored((p) => p ? { ...p, motivation_letter: res.motivation_letter } : p);
    } catch (e) {
      setLetterError(e instanceof Error ? e.message : 'Failed to generate motivation letter');
    } finally {
      setLetterGenerating(false);
    }
  }, [id, app?.session_id]);

  const handleCopyMotivationLetter = useCallback(async () => {
    const text = tailored?.motivation_letter || '';
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setLetterCopied(true);
      setTimeout(() => setLetterCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [tailored?.motivation_letter]);

  const handleDownloadPdf = useCallback(async () => {
    if (!app?.session_id) return;
    setDownloadError(null);
    try {
      await downloadPdf(app.session_id);
    } catch {
      setDownloadError('Download failed');
    }
  }, [app?.session_id]);

  const handleDownloadLetter = useCallback(async () => {
    if (!app?.session_id) return;
    setDownloadError(null);
    try {
      await downloadLetterPdf(app.session_id);
    } catch {
      setDownloadError('Download failed');
    }
  }, [app?.session_id]);

  const handleComputeScore = useCallback(async () => {
    if (!id) return;
    setScoreError(null);
    setScoreLoading(true);
    try {
      const data = await computeApplicationScore(id);
      setApp((prev) => prev ? {
        ...prev,
        ats_score: data.score,
        ats_score_summary: data.summary,
        ats_score_breakdown: data.breakdown ? JSON.stringify(data.breakdown) : null,
      } : null);
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : 'Failed to compute score');
    } finally {
      setScoreLoading(false);
    }
  }, [id]);

  if (!user) return null;
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }
  if (!app) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto max-w-6xl px-6 py-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-blue-700">← Dashboard</Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-slate-600">Application not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-800 hover:text-blue-800 transition-colors">
            Optimal CV
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-blue-700">Dashboard</Link>
            <UserEmailMenu email={user.email} />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <p className="mb-6">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Back to dashboard</Link>
        </p>

        {(() => {
          const canComputeScore = !!app.full_job_description?.trim();
          const scoreTier =
            app.ats_score == null ? null : app.ats_score >= 75 ? 'strong' : app.ats_score >= 50 ? 'moderate' : 'develop';
          return (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
              <div className="p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {edit.company_name?.trim() || 'Application'}
                    </h1>
                    <p className="text-lg text-slate-600 mt-1">
                      {edit.job_title?.trim() || 'Job title'}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label htmlFor="app-status" className="text-xs font-medium uppercase tracking-wider text-slate-500">Status</label>
                      <select
                        id="app-status"
                        value={edit.application_status}
                        onChange={(e) => {
                          const v = e.target.value as ApplicationStatus;
                          setEdit((p) => ({ ...p, application_status: v }));
                          updateJobApplication(app.id, { application_status: v }).catch(() => {});
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {app.session_id ? (
                    <div className="shrink-0 flex flex-col gap-3 w-full lg:w-auto lg:min-w-[220px] lg:items-end">
                      {app.ats_score != null ? (
                        <>
                          <div className="flex flex-wrap items-baseline gap-2 lg:justify-end">
                            <span
                              className={`text-4xl font-bold tabular-nums ${
                                scoreTier === 'strong'
                                  ? 'text-emerald-700'
                                  : scoreTier === 'moderate'
                                    ? 'text-amber-700'
                                    : 'text-slate-800'
                              }`}
                            >
                              {app.ats_score}
                            </span>
                            <span className="text-lg text-slate-500 font-medium">/ 100</span>
                            {scoreTier && (
                              <span
                                className={`text-xs font-medium uppercase tracking-wider ${
                                  scoreTier === 'strong'
                                    ? 'text-emerald-600'
                                    : scoreTier === 'moderate'
                                      ? 'text-amber-600'
                                      : 'text-slate-500'
                                }`}
                              >
                                {scoreTier === 'strong' ? 'Strong' : scoreTier === 'moderate' ? 'Moderate' : 'Room to improve'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <button
                              type="button"
                              onClick={() => setScoreDetailsOpen((o) => !o)}
                              className="text-sm font-medium text-blue-700 hover:text-blue-900"
                            >
                              {scoreDetailsOpen ? 'Hide breakdown' : 'Score breakdown'}
                            </button>
                            <button
                              type="button"
                              onClick={handleComputeScore}
                              disabled={scoreLoading || !canComputeScore}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {scoreLoading ? 'Computing…' : 'Re-compute'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-slate-500 lg:text-right">No ATS score yet.</p>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <button
                              type="button"
                              onClick={handleComputeScore}
                              disabled={scoreLoading || !canComputeScore}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {scoreLoading ? 'Computing…' : 'Compute score'}
                            </button>
                          </div>
                        </>
                      )}
                      {scoreError && <p className="text-sm text-red-600 lg:text-right">{scoreError}</p>}
                      {!canComputeScore && (
                        <p className="text-xs text-slate-500 lg:text-right max-w-xs">
                          Save a full job description under Application &amp; job to compute ATS match.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
                {app.session_id && scoreDetailsOpen && app.ats_score != null && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <AtsScoreExpandedBody
                      atsScore={app.ats_score}
                      atsScoreSummary={app.ats_score_summary}
                      atsScoreBreakdown={app.ats_score_breakdown}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <CollapsibleSection
          title="Resume layout: what appears on the PDF"
          subtitle="Every row maps a resume block to its source (base profile vs. this application). Uncheck to omit from the resume PDF, downloads, and ATS score for this application."
          defaultOpen={false}
        >
          <div className="pt-2 space-y-4 text-sm">
            <p className="text-slate-600">
              <strong>General resume (profile)</strong> is your uploaded source. <strong>This application</strong> overrides headline, skills, and education when set below; summary and role text come from the generated tailoring session.
            </p>
            {!baseProfile && <p className="text-slate-500">Loading base profile…</p>}
            {baseProfile && (
              <div className="rounded-lg border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2 w-10">Resume</th>
                      <th className="px-3 py-2">Section</th>
                      <th className="px-3 py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/50">
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked disabled className="rounded border-slate-300" title="Always on" />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">Full name</td>
                      <td className="px-3 py-2 text-slate-600">Base profile</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={cvIncludes.photo}
                          onChange={() => persistCvIncludes({ ...cvIncludes, photo: !cvIncludes.photo })}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">Photo</td>
                      <td className="px-3 py-2 text-slate-600">Base profile</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={cvIncludes.contact}
                          onChange={() => persistCvIncludes({ ...cvIncludes, contact: !cvIncludes.contact })}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">Contact (email, phone, address, LinkedIn)</td>
                      <td className="px-3 py-2 text-slate-600">Base profile</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={cvIncludes.additional_urls}
                          onChange={() => persistCvIncludes({ ...cvIncludes, additional_urls: !cvIncludes.additional_urls })}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">Extra links</td>
                      <td className="px-3 py-2 text-slate-600">Base profile (settings)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={cvIncludes.headline}
                          onChange={() => persistCvIncludes({ ...cvIncludes, headline: !cvIncludes.headline })}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">Headline / title</td>
                      <td className="px-3 py-2 text-slate-600">This application</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={cvIncludes.summary}
                          onChange={() => persistCvIncludes({ ...cvIncludes, summary: !cvIncludes.summary })}
                          className="rounded border-slate-300"
                          disabled={!app.session_id}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">Summary</td>
                      <td className="px-3 py-2 text-slate-600">
                        {app.session_id ? 'Tailored session' : 'None yet (generate a resume for this application)'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center align-top">
                        <input
                          type="checkbox"
                          checked={cvIncludes.experience}
                          onChange={() => persistCvIncludes({ ...cvIncludes, experience: !cvIncludes.experience })}
                          className="rounded border-slate-300"
                          disabled={!app.session_id}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 align-top">Experience</td>
                      <td className="px-3 py-2 text-slate-600 align-top">
                        {app.session_id && tailored?.tailored_experience?.length ? (
                          <ul className="space-y-2 mt-1">
                            {tailored.tailored_experience.map((exp, i) => {
                              const base = baseProfile.experience[i];
                              const baseLabel = base
                                ? `${base.title ?? 'N/A'} · ${base.company ?? 'N/A'}`
                                : 'No matching base role (same order as profile)';
                              return (
                                <li key={i} className="flex flex-col gap-1 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                                  <label className="flex items-start gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={cvIncludes.experience_rows[i] !== false}
                                      disabled={!cvIncludes.experience}
                                      onChange={() => {
                                        const next = [...cvIncludes.experience_rows];
                                        next[i] = !next[i];
                                        persistCvIncludes({ ...cvIncludes, experience_rows: next });
                                      }}
                                      className="rounded border-slate-300 mt-1"
                                    />
                                    <span>
                                      <span className="font-medium text-slate-800">
                                        {exp.title ?? 'N/A'} at {exp.company ?? 'N/A'}
                                      </span>
                                      <span className="block text-xs text-slate-500 mt-0.5">Profile source: {baseLabel}</span>
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        ) : app.session_id ? (
                          <span className="text-slate-500">No roles in session</span>
                        ) : (
                          'None yet (generate a resume)'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={cvIncludes.skills}
                          onChange={() => persistCvIncludes({ ...cvIncludes, skills: !cvIncludes.skills })}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">Skills</td>
                      <td className="px-3 py-2 text-slate-600">
                        This application (or base profile if not customized)
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center align-top">
                        <input
                          type="checkbox"
                          checked={cvIncludes.education}
                          onChange={() => persistCvIncludes({ ...cvIncludes, education: !cvIncludes.education })}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 align-top">Education</td>
                      <td className="px-3 py-2 text-slate-600 align-top">
                        {edit.tailored_education.length > 0 ? (
                          <ul className="space-y-2 mt-1">
                            {edit.tailored_education.map((edu, i) => {
                              const base = baseProfile.education[i];
                              const baseLabel = base
                                ? `${String(base.degree ?? 'N/A')} · ${String(base.school ?? 'N/A')}`
                                : 'No matching base entry (same order as profile)';
                              return (
                                <li key={i} className="flex flex-col gap-1 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                                  <label className="flex items-start gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={cvIncludes.education_rows[i] !== false}
                                      disabled={!cvIncludes.education}
                                      onChange={() => {
                                        const next = [...cvIncludes.education_rows];
                                        next[i] = !next[i];
                                        persistCvIncludes({ ...cvIncludes, education_rows: next });
                                      }}
                                      className="rounded border-slate-300 mt-1"
                                    />
                                    <span>
                                      <span className="font-medium text-slate-800">
                                        {String(edu.degree ?? 'N/A')} · {String(edu.school ?? 'N/A')}
                                      </span>
                                      <span className="block text-xs text-slate-500 mt-0.5">Profile source: {baseLabel}</span>
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <span className="text-slate-500">No education rows</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={cvIncludes.certifications}
                          onChange={() => persistCvIncludes({ ...cvIncludes, certifications: !cvIncludes.certifications })}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">Certifications</td>
                      <td className="px-3 py-2 text-slate-600">Base profile</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={cvIncludes.languages}
                          onChange={() => persistCvIncludes({ ...cvIncludes, languages: !cvIncludes.languages })}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">Languages</td>
                      <td className="px-3 py-2 text-slate-600">Base profile</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Application & job"
          subtitle="Core details, dates, and full job description for ATS scoring (saved on blur)"
          defaultOpen={false}
        >
          <div className="space-y-6 pt-2">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Core details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Company</label>
                  <input
                    type="text"
                    value={edit.company_name}
                    onChange={(e) => setEdit((p) => ({ ...p, company_name: e.target.value }))}
                    onBlur={handleSave}
                    placeholder="Company name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Job title</label>
                  <input
                    type="text"
                    value={edit.job_title}
                    onChange={(e) => setEdit((p) => ({ ...p, job_title: e.target.value }))}
                    onBlur={handleSave}
                    placeholder="Job title"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Short description (optional)</label>
                  <input
                    type="text"
                    value={edit.description}
                    onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))}
                    onBlur={handleSave}
                    placeholder="Brief description"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Dates & links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Application date (optional)</label>
                  <input
                    type="date"
                    value={edit.application_date}
                    onChange={(e) => setEdit((p) => ({ ...p, application_date: e.target.value }))}
                    onBlur={handleSave}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Job URL (optional)</label>
                  <input
                    type="url"
                    value={edit.job_url}
                    onChange={(e) => setEdit((p) => ({ ...p, job_url: e.target.value }))}
                    onBlur={handleSave}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Salary from (optional)</label>
                  <input
                    type="number"
                    value={edit.salary_from}
                    onChange={(e) => setEdit((p) => ({ ...p, salary_from: e.target.value }))}
                    onBlur={handleSave}
                    placeholder="e.g. 60000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Salary to (optional)</label>
                  <input
                    type="number"
                    value={edit.salary_to}
                    onChange={(e) => setEdit((p) => ({ ...p, salary_to: e.target.value }))}
                    onBlur={handleSave}
                    placeholder="e.g. 80000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Job description for ATS scoring</h3>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Full job description</label>
                <textarea
                  value={edit.full_job_description}
                  onChange={(e) => setEdit((p) => ({ ...p, full_job_description: e.target.value }))}
                  onBlur={handleSave}
                  rows={7}
                  placeholder="Paste the full job description used for ATS scoring"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </section>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="ATS-tailored profile fields"
          subtitle="Job-specific headline on the resume; saved on blur"
          defaultOpen
        >
          <div className="pt-2">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Tailored headline / title</label>
              <input
                type="text"
                value={edit.tailored_headline}
                onChange={(e) => setEdit((p) => ({ ...p, tailored_headline: e.target.value }))}
                onBlur={handleSave}
                placeholder="Headline optimized for this job"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CollapsibleSection>

        {app.session_id ? (
          <CollapsibleSection
            title="Summary"
            subtitle="Professional summary for this role: preview updates live; use Update PDF files to persist for downloads"
            defaultOpen
          >
            <div className="space-y-3 pt-2">
              <p className="text-sm text-slate-600 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <strong>ATS tip:</strong> Mirror job-description wording where truthful, then re-compute score in the header.
              </p>
              <p className="text-sm text-slate-500">
                Use <code className="text-xs bg-slate-100 px-1 rounded">**double asterisks**</code> for bold in the PDF.
              </p>
              {tailoredLoading && <p className="text-sm text-slate-500">Loading tailored content…</p>}
              {!tailoredLoading && !tailored && (
                <p className="text-sm text-slate-500">Tailored content could not be loaded.</p>
              )}
              {!tailoredLoading && tailored && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Tailored summary</label>
                  <textarea
                    value={tailored.tailored_summary}
                    onChange={(e) => setTailored((p) => (p ? { ...p, tailored_summary: e.target.value } : null))}
                    rows={5}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Professional summary tailored to this job"
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>
        ) : (
          <CollapsibleSection
            title="Summary"
            subtitle="Available after you generate a resume linked to this application"
            defaultOpen={false}
          >
            <p className="text-sm text-slate-500 pt-2">Generate a resume from the dashboard flow to edit a tailored summary here.</p>
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="Skills"
          subtitle="Comma-separated; used in ATS scoring and on the resume (saved on blur)"
          defaultOpen={false}
        >
          <div className="pt-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Tailored skills</label>
            <input
              type="text"
              value={edit.tailored_skills}
              onChange={(e) => setEdit((p) => ({ ...p, tailored_skills: e.target.value }))}
              onBlur={handleSave}
              placeholder="Python, SQL, Stakeholder management, …"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </CollapsibleSection>

        {app.session_id ? (
          <CollapsibleSection
            title="Experience"
            subtitle="Tailored bullets per role: preview updates live; use Update PDF files to persist for downloads"
            defaultOpen
          >
            <div className="pt-2 space-y-3">
              {tailoredLoading && <p className="text-sm text-slate-500">Loading tailored content…</p>}
              {!tailoredLoading && !tailored && (
                <p className="text-sm text-slate-500">Tailored content could not be loaded.</p>
              )}
              {!tailoredLoading && tailored && (
                <div className="space-y-3">
                  {tailored.tailored_experience.map((exp, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                      <p className="text-xs font-medium text-slate-600 mb-1">
                        {exp.title ?? 'N/A'} at {exp.company ?? 'N/A'} {exp.start_date ?? ''} – {exp.end_date ?? ''}
                      </p>
                      <textarea
                        value={exp.description ?? ''}
                        onChange={(e) => {
                          const next = [...(tailored.tailored_experience || [])];
                          next[i] = { ...next[i], description: e.target.value };
                          setTailored((p) => (p ? { ...p, tailored_experience: next } : null));
                        }}
                        rows={4}
                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                        placeholder="Tailored description"
                      />
                    </div>
                  ))}
                  {(!tailored.tailored_experience || tailored.tailored_experience.length === 0) && (
                    <p className="text-sm text-slate-500">No experience entries.</p>
                  )}
                </div>
              )}
            </div>
          </CollapsibleSection>
        ) : (
          <CollapsibleSection
            title="Experience"
            subtitle="Available after you generate a resume linked to this application"
            defaultOpen={false}
          >
            <p className="text-sm text-slate-500 pt-2">Generate a resume from the dashboard flow to edit tailored experience here.</p>
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="Education"
          subtitle="We compare this block to the whole job description; many postings omit degree details, which can lower the education score (see breakdown note below)"
          defaultOpen={false}
        >
          <div className="pt-2 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[11px] text-slate-500">Saved on blur. Add job-relevant tools, coursework, or projects where truthful.</span>
            </div>
            {edit.tailored_education.map((edu, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                <div className="space-y-0.5 mb-2">
                  <p className="text-xs text-slate-700 font-medium">
                    {String(edu.degree ?? 'Degree not set')}
                    {edu.field ? ` in ${String(edu.field)}` : ''}
                  </p>
                  <p className="text-xs text-slate-600">{String(edu.school ?? 'School not set')}</p>
                </div>
                <textarea
                  value={String(edu.description ?? '')}
                  onChange={(e) => {
                    const next = [...edit.tailored_education];
                    next[i] = { ...next[i], description: e.target.value };
                    setEdit((p) => ({ ...p, tailored_education: next }));
                  }}
                  onBlur={handleSave}
                  rows={3}
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  placeholder="Coursework, thesis, projects, tools, certifications aligned with the role"
                />
              </div>
            ))}
            {edit.tailored_education.length === 0 && (
              <p className="text-sm text-slate-500">No tailored education entries for this application.</p>
            )}
          </div>
        </CollapsibleSection>

        {saving && <p className="text-xs text-slate-500 mb-2">Saving application fields…</p>}

        {app.session_id && (
          <>
            <CollapsibleSection
              title="Motivation letter & PDF export"
              subtitle="Generate letter, pick template, sync files for download"
              defaultOpen
            >
              <div className="space-y-4 pt-2">
                {tailoredLoading && <p className="text-sm text-slate-500">Loading…</p>}
                {!tailoredLoading && !tailored && (
                  <p className="text-sm text-slate-500">Tailored content could not be loaded.</p>
                )}
                {!tailoredLoading && tailored && (
                  <>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">Motivation letter</label>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleGenerateMotivationLetter}
                            disabled={letterGenerating}
                            className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                          >
                            {letterGenerating ? 'Generating…' : 'Generate motivation letter'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyMotivationLetter}
                            disabled={!tailored.motivation_letter?.trim()}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {letterCopied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <span className="text-xs text-slate-500">Read-only (auto-updates after generation)</span>
                      </div>
                      <textarea
                        value={tailored.motivation_letter}
                        readOnly
                        rows={8}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50/50"
                        placeholder="Generate a motivation letter to see it here"
                      />
                      {letterError && <p className="mt-2 text-sm text-red-600">{letterError}</p>}
                    </div>
                    <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="flex-1 min-w-[min(100%,280px)] sm:max-w-xl">
                        {tailored && (
                          <CvThemePicker
                            compact
                            template={tailored.template}
                            onTemplateChange={(v) => setTailored((p) => (p ? { ...p, template: v } : null))}
                            accent={tailored.template_accent ?? DEFAULT_CV_ACCENT}
                            onAccentChange={(v) => setTailored((p) => (p ? { ...p, template_accent: v } : null))}
                            showPreview={false}
                          />
                        )}
                        <span className="mt-2 block text-[11px] text-slate-400">
                          Headers, links, and highlights follow this color (this application only).
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSyncPdfs}
                        disabled={savingPdfs}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {savingPdfs ? 'Saving & updating PDFs…' : 'Update PDF files'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Saves summary &amp; experience to the server and rebuilds resume and letter PDFs for download. The resume preview below already reflects your edits.
                    </p>
                    {regenerateError && <p className="text-sm text-red-600">{regenerateError}</p>}
                  </>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Resume preview"
              subtitle="Same HTML as the PDF (updates shortly after you edit)"
              defaultOpen
            >
              <div className="pt-2">
                {previewLoading && <p className="text-sm text-slate-500 mb-3">Updating preview…</p>}
                {previewError && <p className="text-sm text-red-600 mb-3">{previewError}</p>}
                {previewHtml ? (
                  <iframe
                    title="Resume PDF preview"
                    sandbox=""
                    className="w-full h-[min(85vh,920px)] border border-slate-200 rounded-lg bg-white shadow-inner"
                    srcDoc={previewHtml}
                  />
                ) : !previewLoading && !previewError ? (
                  <p className="text-sm text-slate-500">Preview will appear when tailored content is loaded.</p>
                ) : null}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Downloads" subtitle="Resume and motivation letter PDFs" defaultOpen={false}>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Download resume (PDF)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadLetter}
                  className="inline-flex rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Download motivation letter (PDF)
                </button>
              </div>
              {downloadError && <p className="mt-3 text-sm text-red-600">{downloadError}</p>}
            </CollapsibleSection>
          </>
        )}

      </main>
    </div>
  );
}
