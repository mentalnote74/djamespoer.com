import type { ExtractionRun } from './extraction-run';

export interface AssemblyFact {
  id: string;
  text: string;
  candidateId?: string;
  run?: ExtractionRun;
  reviewed?: boolean;
}
interface Role {
  employer: string;
  title: string;
  dates: string;
  bullets: string[];
  aliases: string[];
  run: ExtractionRun;
  sourceKey: string;
  start: number;
  end: number;
}
const normalized = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
export function resumeWording(text: string): string {
  const plain = text
    .replace(/^The resume (?:lists|reports) (?:an? )?/i, '')
    .replace(/^The owner reported /i, '')
    .replace(/^The owner (?:has |is )?/i, '')
    .replace(/\bthe owner's\b/gi, 'my')
    .replace(/\bthe owner\b/gi, 'I');
  const bullet = plain
    .replace(/^At .+?, I /i, '')
    .replace(/^I /, '')
    .replace(/^Consulted with and advised /i, 'Advised ')
    .replace(/^Was responsible for /i, 'Responsible for ')
    .replace(/^My role included /i, '')
    .replace(/^Pioneering /i, 'Pioneered ')
    .replace(/^Designing and building /i, 'Design and development of ');
  return bullet.charAt(0).toUpperCase() + bullet.slice(1);
}
function paragraph(location: string) {
  return Number(/:p(\d+)$/.exec(location)?.[1] ?? NaN);
}
function belongs(text: string, role: Role) {
  const value = ' ' + normalized(text) + ' ';
  return role.aliases.some((a) => value.includes(' ' + normalized(a) + ' '));
}
/** Collapse redundant presentation only when all substantive words are already present.
 * Never combine evidence, change claims, or collapse differing negation/uncertainty. */
export function conciseBullets(bullets: readonly string[]) {
  const terms = (text: string) =>
    new Set(
      normalized(text)
        .split(' ')
        .filter(
          (w) =>
            !/^(?:i|my|the|a|an|of|at|from|to|and|that|this|in|with|for|was|is|as|on|by)$/.test(w),
        ),
    );
  const caveat = (text: string) =>
    normalized(text)
      .split(' ')
      .filter((w) => /^(?:not|no|never|may|might|could|approximately|reported)$/.test(w))
      .sort()
      .join(' ');
  return [...new Set(bullets)].filter((text, i, rows) => {
    const words = terms(text);
    return !rows.some((other, j) => {
      const otherWords = terms(other);
      return (
        i !== j &&
        words.size >= 5 &&
        caveat(text) === caveat(other) &&
        [...words].every((w) => otherWords.has(w)) &&
        (otherWords.size > words.size || j < i)
      );
    });
  });
}
/** Presentation only. Inputs must already be selected by the server's active-LoT views.
 * Source units supply the historical document structure, never new accomplishment facts. */
export function assembleResume(facts: readonly AssemblyFact[], runs: readonly ExtractionRun[]) {
  const roles: Role[] = [];
  const seenSources = new Set<string>();
  for (const run of runs)
    for (const source of run.document.sources) {
      if (seenSources.has(source.sha256)) continue;
      seenSources.add(source.sha256);
      const units = source.units ?? [];
      let experience = false;
      const sourceRoles: Role[] = [];
      for (let i = 0; i < units.length; i++) {
        const text = units[i].text.trim();
        if (/^(?:professional |work )?experience$/i.test(text)) {
          experience = true;
          continue;
        }
        if (/^(?:education|continuing education|skills|everyday skills)$/i.test(text)) {
          experience = false;
          const previous = sourceRoles.at(-1);
          if (previous && Number.isFinite(paragraph(units[i].locationKey)))
            previous.end = paragraph(units[i].locationKey);
        }
        if (!experience) continue;
        const match =
          /^(.*?)\s{2,}((?:[A-Za-z]+\s+)?\d{4}\s*[-\u2013\u2014]\s*(?:Present|(?:[A-Za-z]+\s+)?\d{4}))$/i.exec(
            text,
          );
        if (!match || !i) continue;
        const employer = match[1].split(/\s+[\u2013\u2014-]\s+/)[0].trim();
        const title = units[i - 1].text.trim();
        if (!title || /\[REDACTED|https?:/i.test(title + employer)) continue;
        const start = paragraph(units[i - 1].locationKey);
        if (!Number.isFinite(start)) continue;
        const previous = sourceRoles.at(-1);
        if (previous) previous.end = start;
        sourceRoles.push({
          employer,
          title,
          dates: /Present/i.test(match[2])
            ? 'Started ' + match[2].split(/\s*[-\u2013\u2014]\s*/)[0]
            : match[2],
          bullets: [],
          aliases: [
            employer.replace(/\s*\([^)]*\)/g, ''),
            ...Array.from(employer.matchAll(/\(([^)]{2,})\)/g), (m) => m[1]),
          ],
          run,
          sourceKey: source.key,
          start,
          end: Infinity,
        });
      }
      roles.push(...sourceRoles);
    }
  const unique = new Map<string, AssemblyFact>();
  // Reviewed wording takes precedence over exact duplicates; source history is untouched.
  for (const f of [...facts].sort((a, b) => Number(!!b.reviewed) - Number(!!a.reviewed))) {
    if (/^(?:At the resume's date|At the résumé's date)/i.test(f.text)) continue;
    const key = normalized(f.text);
    if (!unique.has(key)) unique.set(key, f);
  }
  const summary: string[] = [],
    education: string[] = [],
    training: string[] = [],
    additional: string[] = [];
  const skills = new Set<string>();
  const used = new Set<string>();
  for (const f of unique.values()) {
    const text = resumeWording(f.text);
    for (const technology of [
      'Angular',
      'Angular CLI',
      'JavaScript',
      'TypeScript',
      'HTML5',
      'HTML',
      'CSS',
      'Sass',
      'jQuery',
      'WCAG 2.0',
      'Section 508',
      'ARIA',
      'PowerSchool',
    ])
      if (
        new RegExp('\\b' + technology.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(
          f.text,
        )
      )
        skills.add(technology);
    if (
      /\b(degree|bachelor|master|associate of|applied computer science)\b/i.test(f.text) &&
      !/\btraining|trained\b/i.test(f.text)
    ) {
      // Universities may issue either degrees or training certificates: preserve source wording.
      education.push(text);
      continue;
    }
    if (/\b(certificate|certification|certified|refresher course)\b/i.test(f.text)) {
      training.push(text);
      continue;
    }
    const c = f.run?.document.claims.find((c) => c.id === f.candidateId);
    const positions =
      c?.citations.map((c) => paragraph(c.locationKey)).filter(Number.isFinite) ?? [];
    const role =
      roles.find(
        (r) =>
          r.run === f.run &&
          r.sourceKey === c?.sourceKey &&
          positions.some((p) => p >= r.start && p < r.end),
      ) ??
      roles.find((r) => belongs(f.text, r)) ??
      roles.find(
        (r) =>
          r.run === f.run &&
          c &&
          f.run?.document.sources
            .find((s) => s.key === c.sourceKey)
            ?.units?.some((u) => belongs(u.text, r)) &&
          !f.run.document.sources
            .find((s) => s.key === c.sourceKey)
            ?.units?.some((u) => /^(?:professional |work )?experience$/i.test(u.text.trim())),
      );
    if (role) {
      // Employment heading already carries title/date facts. Do not repeat it as a bullet.
      if (!/^The owner was .+ (?:at|from) /i.test(f.text)) role.bullets.push(text);
      used.add(f.id);
    } else if (/^The owner reported designing/i.test(f.text)) summary.push(text);
    else additional.push(text);
  }
  // Repeated captures of the same source role do not create duplicated employment entries.
  const merged = new Map<string, Role>();
  for (const role of roles.filter(
    (r) =>
      r.bullets.length || [...unique.values()].some((f) => used.has(f.id) && belongs(f.text, r)),
  )) {
    const key = normalized(role.employer + ' ' + role.dates);
    const previous = merged.get(key);
    if (previous) previous.bullets = [...new Set([...previous.bullets, ...role.bullets])];
    else merged.set(key, { ...role, bullets: [...new Set(role.bullets)] });
  }
  return {
    summary,
    roles: [...merged.values()].map(({ employer, title, dates, bullets }) => ({
      employer,
      title,
      dates,
      bullets: conciseBullets(bullets),
    })),
    skills: [...skills],
    education,
    training,
    additional: [...new Set(additional)],
    hasContent: unique.size > 0,
  };
}
