'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProfile, putProfile, deleteAccount, type Profile } from '../lib/api';
import { useAuth } from '../lib/auth-context';

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

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft && (draft.full_name || draft.summary || draft.experience?.length)) {
            setProfile({ ...emptyProfile, ...draft });
            setLoading(false);
            return;
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (!user) {
      setLoading(false);
      return;
    }
    getProfile()
      .then((data) => setProfile({ ...emptyProfile, ...data.profile }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const update = (part: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...part }));
    setSaved(false);
  };

  const updateExperience = (index: number, field: string, value: string) => {
    setProfile((p) => {
      const next = [...(p.experience || [])];
      if (!next[index]) next[index] = { title: '', company: '', start_date: null, end_date: null, description: null, location: null };
      (next[index] as Record<string, unknown>)[field] = value || null;
      return { ...p, experience: next };
    });
    setSaved(false);
  };

  const addExperience = () => {
    setProfile((p) => ({
      ...p,
      experience: [...(p.experience || []), { title: '', company: '', start_date: null, end_date: null, description: null, location: null }],
    }));
    setSaved(false);
  };

  const removeExperience = (index: number) => {
    setProfile((p) => ({
      ...p,
      experience: p.experience.filter((_, i) => i !== index),
    }));
    setSaved(false);
  };

  const updateEducation = (index: number, field: string, value: string) => {
    setProfile((p) => {
      const next = [...(p.education || [])];
      if (!next[index]) next[index] = { school: '', degree: null, field: null, start_date: null, end_date: null, description: null };
      (next[index] as Record<string, unknown>)[field] = value || null;
      return { ...p, education: next };
    });
    setSaved(false);
  };

  const addEducation = () => {
    setProfile((p) => ({
      ...p,
      education: [...(p.education || []), { school: '', degree: null, field: null, start_date: null, end_date: null, description: null }],
    }));
    setSaved(false);
  };

  const removeEducation = (index: number) => {
    setProfile((p) => ({
      ...p,
      education: p.education.filter((_, i) => i !== index),
    }));
    setSaved(false);
  };

  const setSkills = (text: string) => {
    const skills = text.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    update({ skills });
  };

  const addCertification = () => {
    setProfile((p) => ({
      ...p,
      certifications: [...(p.certifications || []), { name: '', authority: null, date: null, url: null }],
    }));
    setSaved(false);
  };

  const updateCertification = (index: number, field: string, value: string | null) => {
    setProfile((p) => {
      const next = [...(p.certifications || [])];
      if (!next[index]) next[index] = { name: '', authority: null, date: null, url: null };
      (next[index] as Record<string, unknown>)[field] = value;
      return { ...p, certifications: next };
    });
    setSaved(false);
  };

  const removeCertification = (index: number) => {
    setProfile((p) => ({
      ...p,
      certifications: (p.certifications || []).filter((_, i) => i !== index),
    }));
    setSaved(false);
  };

  const addLanguage = () => {
    setProfile((p) => ({
      ...p,
      languages: [...(p.languages || []), ''],
    }));
    setSaved(false);
  };

  const updateLanguage = (index: number, value: string) => {
    setProfile((p) => {
      const next = [...(p.languages || [])];
      next[index] = value;
      return { ...p, languages: next };
    });
    setSaved(false);
  };

  const removeLanguage = (index: number) => {
    setProfile((p) => ({
      ...p,
      languages: (p.languages || []).filter((_, i) => i !== index),
    }));
    setSaved(false);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ photo_base64: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleSave = useCallback(async () => {
    setSaveError(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(profile));
      }
      await putProfile(profile);
      setSaved(true);
    } catch (err) {
      setSaved(false);
      setSaveError(user ? 'Failed to save.' : 'Please sign in to save your profile to your account.');
    }
  }, [profile, user]);

  const handleDeleteAccount = useCallback(async () => {
    setDeleteError(null);
    setDeleteInProgress(true);
    try {
      await deleteAccount();
      if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY);
      await logout();
      router.push('/');
      router.refresh();
    } catch {
      setDeleteError('Failed to delete account. Try again.');
      setDeleteInProgress(false);
    }
  }, [logout, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Edit profile</h1>
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            ← Back to generator
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {!user && (
          <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
            <Link href="/login" className="font-medium text-blue-600 hover:underline">Sign in</Link>
            {' '}to save your profile to your account.
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Basic info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => update({ full_name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Headline</label>
              <input
                type="text"
                value={profile.headline ?? ''}
                onChange={(e) => update({ headline: e.target.value || null })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
              <textarea
                value={profile.summary}
                onChange={(e) => update({ summary: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={profile.email ?? ''}
                onChange={(e) => update({ email: e.target.value || null })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={profile.phone ?? ''}
                onChange={(e) => update({ phone: e.target.value || null })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={profile.address ?? ''}
                onChange={(e) => update({ address: e.target.value || null })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={profile.linkedin_url ?? ''}
                onChange={(e) => update({ linkedin_url: e.target.value || null })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Profile photo</label>
              <input type="file" accept="image/*" onChange={handlePhoto} className="block w-full text-sm text-slate-600" />
              {profile.photo_base64 && (
                <img src={profile.photo_base64} alt="Profile" className="mt-2 h-20 w-20 object-cover rounded" />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Experience</h2>
            <button
              type="button"
              onClick={addExperience}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          {profile.experience.map((exp, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Title"
                  value={exp.title}
                  onChange={(e) => updateExperience(i, 'title', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Company"
                  value={exp.company}
                  onChange={(e) => updateExperience(i, 'company', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Start date (e.g. 2020-01)"
                  value={exp.start_date ?? ''}
                  onChange={(e) => updateExperience(i, 'start_date', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="End date or Present"
                  value={exp.end_date ?? ''}
                  onChange={(e) => updateExperience(i, 'end_date', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <textarea
                placeholder="Description"
                value={exp.description ?? ''}
                onChange={(e) => updateExperience(i, 'description', e.target.value)}
                rows={2}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeExperience(i)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Education</h2>
            <button
              type="button"
              onClick={addEducation}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          {profile.education.map((edu, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="School"
                  value={edu.school}
                  onChange={(e) => updateEducation(i, 'school', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Degree"
                  value={edu.degree ?? ''}
                  onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Field"
                  value={edu.field ?? ''}
                  onChange={(e) => updateEducation(i, 'field', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Start date (e.g. 2018)"
                  value={edu.start_date ?? ''}
                  onChange={(e) => updateEducation(i, 'start_date', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="End date or Present"
                  value={edu.end_date ?? ''}
                  onChange={(e) => updateEducation(i, 'end_date', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <textarea
                placeholder="Description"
                value={edu.description ?? ''}
                onChange={(e) => updateEducation(i, 'description', e.target.value)}
                rows={2}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeEducation(i)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Skills (comma- or semicolon-separated)</h2>
          <textarea
            value={profile.skills.join(', ')}
            onChange={(e) => setSkills(e.target.value)}
            rows={3}
            placeholder="e.g. Python, JavaScript, Project Management"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Certifications</h2>
            <button
              type="button"
              onClick={addCertification}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          {(profile.certifications || []).map((c, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) => updateCertification(i, 'name', e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Authority"
                  value={c.authority ?? ''}
                  onChange={(e) => updateCertification(i, 'authority', e.target.value || null)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Date"
                  value={c.date ?? ''}
                  onChange={(e) => updateCertification(i, 'date', e.target.value || null)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="URL"
                  value={c.url ?? ''}
                  onChange={(e) => updateCertification(i, 'url', e.target.value || null)}
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCertification(i)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Languages</h2>
            <button
              type="button"
              onClick={addLanguage}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          {(profile.languages || []).map((lang, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                placeholder="e.g. English (Fluent)"
                value={lang}
                onChange={(e) => updateLanguage(i, e.target.value)}
                className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeLanguage(i)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Save profile
          </button>
          {saved && <span className="text-sm text-green-600">Saved to your account.</span>}
          {saveError && <span className="text-sm text-red-600">{saveError}</span>}
        </div>

        {user && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Delete account</h2>
            <p className="text-sm text-slate-600 mb-4">
              Permanently delete your account and all stored data (profile, URLs, photo). This cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete account
            </button>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <div className="rounded-xl bg-white p-6 shadow-xl max-w-md w-full">
              <h2 id="delete-dialog-title" className="text-lg font-semibold text-slate-800 mb-2">Delete account?</h2>
              <p className="text-sm text-slate-600 mb-6">
                This will permanently delete your account and all your data. You will need to sign up again to use CV-Tool. This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                  disabled={deleteInProgress}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteInProgress}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteInProgress ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
              {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
