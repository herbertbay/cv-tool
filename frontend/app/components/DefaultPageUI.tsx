'use client';

import Link from 'next/link';
import { openPreviewCvHtml, type UserData } from '../lib/api';

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

export function DefaultPageUI({ userData, onOpenCreate }: { userData: UserData; onOpenCreate: () => void }) {
  const p = userData.profile;

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
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 border-l-4 border-l-blue-700">
          <h2 className="text-base font-semibold text-slate-800">Your information</h2>
        </div>
        <div className="p-6">
          {p.photo_base64 && (
            <div className="flex justify-center mb-4">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 w-24 h-24 shadow-inner">
                <img src={p.photo_base64} alt="Profile" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {infoItems.length === 0 ? (
              <div className="flex gap-2 py-2 px-3 rounded-md bg-slate-50/80 border border-slate-100 sm:col-span-2">
                <span className="flex-shrink-0 text-blue-600/80" aria-hidden><PersonIcon /></span>
                <p className="text-sm text-slate-500">No information yet. Edit your profile to add details.</p>
              </div>
            ) : infoItems.map(({ label, value, icon }) => (
              <div key={label} className="flex gap-2 py-2 px-3 rounded-md bg-slate-50/80 border border-slate-100">
                <span className="flex-shrink-0 text-blue-600/90 mt-0.5" aria-hidden>{icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="text-sm text-slate-800 mt-0.5 break-words leading-snug">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/profile" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Edit information
            </Link>
            <button type="button" onClick={onOpenCreate} className="inline-flex items-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 transition-colors">
              Create CV & motivation letter
            </button>
            <button type="button" onClick={() => openPreviewCvHtml('cv_executive.html').catch((e) => window.alert(e.message))} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Preview CV (HTML)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
