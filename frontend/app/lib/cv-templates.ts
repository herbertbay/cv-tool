/** Default accent for new resumes (matches backend normalize default). */
export const DEFAULT_CV_ACCENT = '#2563eb';

export type CvTemplateOption = {
  value: string;
  label: string;
  /** Short hint for picker UI */
  hint?: string;
};

export const CV_TEMPLATE_BASELINE: CvTemplateOption[] = [
  { value: 'cv_base.html', label: 'Modern', hint: 'Clean sans-serif, versatile' },
  { value: 'cv_executive.html', label: 'Executive', hint: 'Serif, formal' },
];

export const CV_TEMPLATE_THEMES: CvTemplateOption[] = [
  { value: 'cv_theme_aurora.html', label: 'Aurora', hint: 'Bold top band, circular photo' },
  { value: 'cv_theme_rail.html', label: 'Signal rail', hint: 'Left rail + tinted band' },
  { value: 'cv_theme_sidebar.html', label: 'Sidebar stripe', hint: 'Vertical accent bar' },
  { value: 'cv_theme_minimal.html', label: 'Minimal luxe', hint: 'Uppercase name, airy' },
  { value: 'cv_theme_bold.html', label: 'Bold impact', hint: 'Heavy type, strong blocks' },
  { value: 'cv_theme_card.html', label: 'Soft cards', hint: 'Rounded panels, friendly' },
  { value: 'cv_theme_magazine.html', label: 'Magazine', hint: 'Italic serif, two-column skills' },
  { value: 'cv_theme_ink.html', label: 'Ink header', hint: 'Dark banner, high contrast' },
  { value: 'cv_theme_citrus.html', label: 'Citrus pop', hint: 'Playful pills & dashed frame' },
  { value: 'cv_theme_horizon.html', label: 'Horizon', hint: 'Layered rules, underline skills' },
  { value: 'cv_theme_nordic.html', label: 'Nordic calm', hint: 'Light gray header, quiet type' },
  { value: 'cv_theme_construct.html', label: 'Construct', hint: 'Mono grid, brutalist frame' },
  { value: 'cv_theme_soft.html', label: 'Soft bloom', hint: 'Gradient header, pill skills' },
  { value: 'cv_theme_typewriter.html', label: 'Typewriter', hint: 'Courier, dashed rules' },
  { value: 'cv_theme_serif.html', label: 'Centered classic', hint: 'Palatino, centered masthead' },
  { value: 'cv_theme_stream.html', label: 'Stream', hint: 'Timeline accent, flowing sections' },
  { value: 'cv_theme_caps.html', label: 'All caps', hint: 'Spaced caps, editorial' },
  { value: 'cv_theme_split.html', label: 'Split wash', hint: 'Two-tone header wash' },
];

export const CV_TEMPLATE_OPTIONS: CvTemplateOption[] = [...CV_TEMPLATE_BASELINE, ...CV_TEMPLATE_THEMES];

export function normalizeClientAccentHex(input: string | null | undefined): string {
  const d = DEFAULT_CV_ACCENT;
  if (!input || typeof input !== 'string') return d;
  const s = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const r = s[1],
      g = s[2],
      b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return d;
}
