import type { Profile } from './api';

function isEmpty(v: string | null | undefined): boolean {
  return !String(v ?? '').trim();
}

/**
 * Counts empty *required* profile fields (badge, block generation, red highlights).
 *
 * Required: full name, summary, email; ≥1 experience (title, company, start/end dates);
 * ≥1 education (school, degree, field, start/end dates); ≥1 skill; ≥1 language;
 * per certification row: name only.
 *
 * Optional (not counted): headline, phone, address, LinkedIn, photo; experience &
 * education descriptions; certification authority, date, URL.
 */
export function getProfileCompleteness(profile: Profile): {
  emptyCount: number;
  paths: Set<string>;
} {
  const paths = new Set<string>();
  let emptyCount = 0;

  const mark = (path: string, empty: boolean) => {
    if (empty) {
      emptyCount += 1;
      paths.add(path);
    }
  };

  mark('basic.full_name', isEmpty(profile.full_name));
  mark('basic.summary', isEmpty(profile.summary));
  mark('basic.email', isEmpty(profile.email));

  const exps = profile.experience || [];
  if (exps.length === 0) {
    emptyCount += 1;
    paths.add('experience.section');
  } else {
    exps.forEach((exp, i) => {
      mark(`experience.${i}.title`, isEmpty(exp.title));
      mark(`experience.${i}.company`, isEmpty(exp.company));
      mark(`experience.${i}.start_date`, isEmpty(exp.start_date));
      mark(`experience.${i}.end_date`, isEmpty(exp.end_date));
    });
  }

  const edus = profile.education || [];
  if (edus.length === 0) {
    emptyCount += 1;
    paths.add('education.section');
  } else {
    edus.forEach((edu, i) => {
      mark(`education.${i}.school`, isEmpty(edu.school));
      mark(`education.${i}.degree`, isEmpty(edu.degree));
      mark(`education.${i}.field`, isEmpty(edu.field));
      mark(`education.${i}.start_date`, isEmpty(edu.start_date));
      mark(`education.${i}.end_date`, isEmpty(edu.end_date));
    });
  }

  const skills = profile.skills || [];
  const hasSkill = skills.some((s) => String(s).trim());
  mark('skills', !hasSkill);

  const certs = profile.certifications || [];
  certs.forEach((c, i) => {
    mark(`cert.${i}.name`, isEmpty(c.name));
  });

  const langs = profile.languages || [];
  if (langs.length === 0) {
    emptyCount += 1;
    paths.add('languages.section');
  } else {
    langs.forEach((lang, i) => {
      mark(`languages.${i}`, isEmpty(lang));
    });
  }

  return { emptyCount, paths };
}

/** Number of empty required profile fields (dashboard badge, validation). */
export function countProfileEmptyFields(profile: Profile): number {
  return getProfileCompleteness(profile).emptyCount;
}
