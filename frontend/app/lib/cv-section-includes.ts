/** Mirrors backend job_applications.cv_section_includes (omit key = include). */

export type CvSectionIncludesState = {
  headline: boolean;
  photo: boolean;
  contact: boolean;
  additional_urls: boolean;
  summary: boolean;
  experience: boolean;
  experience_rows: boolean[];
  skills: boolean;
  education: boolean;
  education_rows: boolean[];
  certifications: boolean;
  languages: boolean;
};

function normalizeRows(r: unknown, n: number): boolean[] {
  const arr = Array.isArray(r) ? r.map((x) => x !== false) : [];
  return Array.from({ length: n }, (_, i) => (i < arr.length ? arr[i] !== false : true));
}

export function defaultCvIncludes(
  experienceCount: number,
  educationCount: number,
  saved?: Record<string, unknown> | null
): CvSectionIncludesState {
  const s = (saved || {}) as Record<string, unknown>;
  return {
    headline: s.headline !== false,
    photo: s.photo !== false,
    contact: s.contact !== false,
    additional_urls: s.additional_urls !== false,
    summary: s.summary !== false,
    experience: s.experience !== false,
    experience_rows: normalizeRows(s.experience_rows, experienceCount),
    skills: s.skills !== false,
    education: s.education !== false,
    education_rows: normalizeRows(s.education_rows, educationCount),
    certifications: s.certifications !== false,
    languages: s.languages !== false,
  };
}

export function toApiPayload(state: CvSectionIncludesState): Record<string, unknown> {
  return {
    headline: state.headline,
    photo: state.photo,
    contact: state.contact,
    additional_urls: state.additional_urls,
    summary: state.summary,
    experience: state.experience,
    experience_rows: state.experience_rows,
    skills: state.skills,
    education: state.education,
    education_rows: state.education_rows,
    certifications: state.certifications,
    languages: state.languages,
  };
}
