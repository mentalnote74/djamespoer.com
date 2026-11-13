import type { RoleEvaluation, EvaluatedRequirement } from './jd-contract.ts';
import { isQualificationRequirement, needsClarification } from './jd-policy.ts';

/** Presentation only: consumes final validated outcomes; never reclassifies evidence. */
export function evaluationSummary(result: RoleEvaluation, _completeInventory: boolean): string {
  const rows = result.requirements.filter(isQualificationRequirement);
  const required = rows.filter((r) => r.importance === 'required');
  const missing = rows.filter((r) => r.outcome === 'NOT MET');
  const requiredGaps = required.filter((r) => r.outcome === 'NOT MET');
  const strengths = rows.filter((r) => r.outcome === 'MET');
  const unresolved = rows.filter((r) => r.outcome === 'UNKNOWN');
  const rank = (r: EvaluatedRequirement) =>
    r.importance === 'required' ? 0 : r.importance === 'unspecified' ? 1 : 2;
  const ordered = (items: EvaluatedRequirement[]) => [...items].sort((a, b) => rank(a) - rank(b));
  const brief = (text: string) => {
    const clean = text
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.?!]+$/, '');
    return clean.length > 190 ? clean.slice(0, 187).replace(/\s+\S*$/, '') + '…' : clean;
  };
  const list = (items: EvaluatedRequirement[], limit = 2) => {
    const sorted = ordered(items);
    const shown = sorted.slice(0, limit).map((r) => brief(r.requirement));
    const more = sorted.length - shown.length;
    return shown.join('; ') + (more > 0 ? '; and ' + more + ' more' : '');
  };
  const sentences: string[] = [];
  if (!rows.length)
    sentences.push(
      'No professional qualifications were identified for a qualification-fit assessment.',
    );
  else if (requiredGaps.length)
    sentences.push('This role has material gaps against the stated required qualifications.');
  else if (required.some((r) => r.outcome === 'UNKNOWN'))
    sentences.push(
      'No required qualification is contradicted by the career evidence; some are not yet documented.',
    );
  else if (required.length)
    sentences.push('The career evidence supports the stated required qualifications.');
  else if (missing.length)
    sentences.push('This role is a partial fit against the stated qualifications.');
  else if (unresolved.length)
    sentences.push('Overall fit remains uncertain on the available evidence.');
  else sentences.push('The career evidence supports the stated qualifications.');
  if (missing.length) {
    const gaps = requiredGaps.length ? requiredGaps : missing;
    const label = requiredGaps.length
      ? 'Decisive required gaps include'
      : missing.every((r) => r.importance === 'preferred')
        ? 'Preferred gaps include'
        : 'Qualification gaps include';
    sentences.push(label + ': ' + list(gaps) + '.');
  }
  if (rows.length)
    sentences.push(
      'Meets ' +
        strengths.length +
        ' of ' +
        rows.length +
        ' listed qualifications' +
        (required.length
          ? ' (' + required.filter((r) => r.outcome === 'MET').length + ' of ' + required.length + ' required)'
          : '') +
        '.',
    );
  if (strengths.length) sentences.push('Relevant strengths include: ' + list(strengths, 6) + '.');
  if (unresolved.length)
    sentences.push('Not yet documented in the career record: ' + list(unresolved, 4) + '.');
  // Public readers are not the candidate: questions about the candidate's own current
  // proficiency belong to the owner workflow, not the visitor-facing summary.
  const clarification = ordered(result.requirements).find(
    (r) => needsClarification(r) && r.basis !== 'historical_current_uncertainty',
  );
  if (clarification)
    sentences.push(
      clarification.basis === 'conflicting_evidence'
        ? 'Conflicting ' +
            (isQualificationRequirement(clarification) ? 'career' : 'logistical') +
            ' evidence needs clarification for: ' +
            brief(clarification.requirement) +
            '.'
        : (isQualificationRequirement(clarification)
            ? 'Clarification needed: '
            : 'Logistical clarification needed: ') +
            brief(
              clarification.question ?? 'Does your stated constraint still apply to this role?',
            ) +
            '?',
    );
  return sentences.join(' ');
}
