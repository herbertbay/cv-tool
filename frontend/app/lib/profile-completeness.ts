import type { Profile } from './api';

function isEmpty(v: string | null | undefined): boolean {
  return !String(v ?? '').trim();
}

/**
 * Counts empty inputs required for a complete base resume (matches Edit profile form).
 * Used for dashboard badge and blocking tailored CV generation.
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
  mark('basic.headline', isEmpty(profile.headline));
  mark('basic.summary', isEmpty(profile.summary));
  mark('basic.email', isEmpty(profile.email));
  mark('basic.phone', isEmpty(profile.phone));
  mark('basic.address', isEmpty(profile.address));
  mark('basic.linkedin_url', isEmpty(profile.linkedin_url));
  mark('basic.photo', !String(profile.photo_base64 ?? '').trim());

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
      mark(`experience.${i}.description`, isEmpty(exp.description));
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
      mark(`education.${i}.description`, isEmpty(edu.description));
    });
  }

  const skills = profile.skills || [];
  const hasSkill = skills.some((s) => String(s).trim());
  mark('skills', !hasSkill);

  const certs = profile.certifications || [];
  certs.forEach((c, i) => {
    mark(`cert.${i}.name`, isEmpty(c.name));
    mark(`cert.${i}.authority`, isEmpty(c.authority));
    mark(`cert.${i}.date`, isEmpty(c.date));
    mark(`cert.${i}.url`, isEmpty(c.url));
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

export function countProfileEmptyFields(profile: Profile): number {
  return getProfileCompleteness(profile).emptyCount;
}
