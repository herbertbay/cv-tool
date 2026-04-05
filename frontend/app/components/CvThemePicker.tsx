'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Profile } from '../lib/api';
import { previewCvGuestHtml } from '../lib/api';
import {
  CV_TEMPLATE_BASELINE,
  CV_TEMPLATE_THEMES,
  DEFAULT_CV_ACCENT,
  CV_ACCENT_PRESETS,
  clampAccentForWhiteBackground,
  normalizeClientAccentHex,
} from '../lib/cv-templates';

export type CvThemePickerProps = {
  template: string;
  onTemplateChange: (value: string) => void;
  accent: string;
  onAccentChange: (value: string) => void;
  /** When set with showPreview, loads HTML from the guest preview API. */
  previewProfile?: Profile | null;
  additionalUrls?: string[];
  showPreview?: boolean;
  previewHeight?: number;
  /** Smaller labels (e.g. application detail). */
  compact?: boolean;
  className?: string;
};

export function CvThemePicker({
  template,
  onTemplateChange,
  accent,
  onAccentChange,
  previewProfile,
  additionalUrls,
  showPreview = false,
  previewHeight = 520,
  compact = false,
  className = '',
}: CvThemePickerProps) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const profileKey = useMemo(() => JSON.stringify(previewProfile ?? null), [previewProfile]);
  const urlsKey = useMemo(() => JSON.stringify(additionalUrls ?? []), [additionalUrls]);

  useEffect(() => {
    if (!showPreview || !previewProfile) {
      setPreviewHtml(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewErr(null);
    previewCvGuestHtml({
      profile: previewProfile,
      template,
      template_accent: accent,
      additional_urls: additionalUrls,
    })
      .then((html) => {
        if (!cancelled) setPreviewHtml(html);
      })
      .catch((e) => {
        if (!cancelled) setPreviewErr(e instanceof Error ? e.message : 'Preview failed');
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showPreview, profileKey, template, accent, urlsKey, previewProfile, additionalUrls]);

  const labelCls = compact
    ? 'block text-xs font-medium uppercase tracking-wider text-slate-500 mb-1'
    : 'block text-sm font-medium text-slate-700 mb-1';
  const displayHex = normalizeClientAccentHex(accent);
  const displayForColorInput = clampAccentForWhiteBackground(displayHex);

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="cv-theme-template-select">
            Resume template
          </label>
          <select
            id="cv-theme-template-select"
            value={template}
            onChange={(e) => onTemplateChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <optgroup label="Baseline">
              {CV_TEMPLATE_BASELINE.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Creative themes">
              {CV_TEMPLATE_THEMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <span className={labelCls}>Accent color</span>
          <p className="mb-2 text-xs text-slate-500">
            Preset colors stay readable on white. Custom colors are adjusted for contrast automatically.
          </p>
          <div className="flex flex-wrap gap-2">
            {CV_ACCENT_PRESETS.map((p) => {
              const clamped = clampAccentForWhiteBackground(p.value);
              const selected = clampAccentForWhiteBackground(displayHex).toLowerCase() === clamped.toLowerCase();
              return (
                <button
                  key={p.value}
                  type="button"
                  title={p.label}
                  aria-label={`${p.label} ${clamped}`}
                  aria-pressed={selected}
                  onClick={() => onAccentChange(p.value)}
                  className={`h-9 w-9 rounded-full border-2 shadow-sm transition-transform hover:scale-105 ${
                    selected ? 'border-slate-900 ring-2 ring-offset-1 ring-slate-400' : 'border-white ring-1 ring-slate-200'
                  }`}
                  style={{ backgroundColor: clamped }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="color"
              aria-label="Custom accent color"
              value={displayForColorInput}
              onChange={(e) => onAccentChange(clampAccentForWhiteBackground(e.target.value))}
              className="h-10 w-16 cursor-pointer rounded border border-slate-300 bg-white p-1"
            />
            <input
              type="text"
              value={accent}
              onChange={(e) => onAccentChange(e.target.value)}
              onBlur={() => onAccentChange(clampAccentForWhiteBackground(normalizeClientAccentHex(accent)))}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm font-mono"
              placeholder={DEFAULT_CV_ACCENT}
            />
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
          {previewLoading && <p className="p-4 text-sm text-slate-500">Updating preview…</p>}
          {previewErr && <p className="p-4 text-sm text-red-600">{previewErr}</p>}
          {previewHtml && !previewLoading && (
            <iframe
              title="CV preview"
              sandbox=""
              className="w-full border-0 bg-white"
              style={{ height: previewHeight, minHeight: 320 }}
              srcDoc={previewHtml}
            />
          )}
        </div>
      )}
    </div>
  );
}
