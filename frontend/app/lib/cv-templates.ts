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

/** Curated accents that read well on white; custom colors are clamped to the same lightness band. */
export const CV_ACCENT_PRESETS: { label: string; value: string }[] = [
  { label: 'Blue', value: '#2563eb' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Indigo', value: '#4338ca' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Rose', value: '#be123c' },
  { label: 'Amber', value: '#b45309' },
  { label: 'Orange', value: '#c2410c' },
  { label: 'Slate', value: '#475569' },
  { label: 'Forest', value: '#166534' },
];

/** Python colorsys rgb_to_hls (H, L, S). */
function rgbToHls(r: number, g: number, b: number): [number, number, number] {
  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  const sumc = maxc + minc;
  const l = sumc / 2.0;
  if (minc === maxc) {
    return [0.0, l, 0.0];
  }
  const s = l <= 0.5 ? (maxc - minc) / sumc : (maxc - minc) / (2.0 - sumc);
  const rc = (maxc - r) / (maxc - minc);
  const gc = (maxc - g) / (maxc - minc);
  const bc = (maxc - b) / (maxc - minc);
  let h: number;
  if (r === maxc) h = bc - gc;
  else if (g === maxc) h = 2.0 + rc - bc;
  else h = 4.0 + gc - rc;
  h = ((h / 6.0) % 1.0 + 1.0) % 1.0;
  return [h, l, s];
}

function _v(m1: number, m2: number, h: number): number {
  h = ((h % 1.0) + 1.0) % 1.0;
  if (h < 1.0 / 6.0) return m1 + (m2 - m1) * h * 6.0;
  if (h < 0.5) return m2;
  if (h < 2.0 / 3.0) return m1 + (m2 - m1) * (2.0 / 3.0 - h) * 6.0;
  return m1;
}

/** Python colorsys hls_to_rgb. */
function hlsToRgb(h: number, l: number, s: number): [number, number, number] {
  if (s === 0.0) {
    return [l, l, l];
  }
  let m2: number;
  if (l <= 0.5) m2 = l * (1.0 + s);
  else m2 = l + s - l * s;
  const m1 = 2.0 * l - m2;
  return [_v(m1, m2, h + 1.0 / 3.0), _v(m1, m2, h), _v(m1, m2, h - 1.0 / 3.0)];
}

/**
 * Match backend clamp_accent_for_white_background: HSL lightness in ~18–52%
 * so accents stay readable on white backgrounds.
 */
export function clampAccentForWhiteBackground(hexInput: string | null | undefined): string {
  const base = normalizeClientAccentHex(hexInput);
  const h = base.slice(1);
  if (h.length !== 6) return base;
  const r = parseInt(h.slice(0, 2), 16) / 255.0;
  const g = parseInt(h.slice(2, 4), 16) / 255.0;
  const b = parseInt(h.slice(4, 6), 16) / 255.0;
  const [hue, light, sat] = rgbToHls(r, g, b);
  const l2 = Math.max(0.18, Math.min(light, 0.52));
  const [r2, g2, b2] = hlsToRgb(hue, l2, sat);
  const ri = Math.round(Math.max(0, Math.min(1, r2)) * 255);
  const gi = Math.round(Math.max(0, Math.min(1, g2)) * 255);
  const bi = Math.round(Math.max(0, Math.min(1, b2)) * 255);
  return `#${ri.toString(16).padStart(2, '0')}${gi.toString(16).padStart(2, '0')}${bi.toString(16).padStart(2, '0')}`;
}

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
