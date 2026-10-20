import type { RoleEvaluation, EvaluatedRequirement } from './jd-contract.ts';

/** Presentation only: consumes final validated outcomes; never reclassifies evidence. */
export function evaluationSummary(result: RoleEvaluation, completeInventory: boolean): string {
  const rows = result.requirements;
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
  const list = (items: EvaluatedRequirement[]) =>
    ordered(items)
      .slice(0, 2)
      .map((r) => brief(r.requirement))
      .join('; ');
  const sentences: string[] = [];
  if (requiredGaps.length)
    sentences.push('This role has material gaps against the stated required qualifications.');
  else if (required.some((r) => r.outcome === 'UNKNOWN'))
    sentences.push(
      'Overall fit remains uncertain because some required qualifications are unresolved.',
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
  if (strengths.length) sentences.push('Relevant strengths include: ' + list(strengths) + '.');
  const clarification = ordered(unresolved).find(
    (r) =>
      r.basis === 'conflicting_evidence' ||
      (r.question &&
        (r.kind !== 'professional_qualification' ||
          ['ambiguous_requirement', 'historical_current_uncertainty'].includes(r.basis))),
  );
  if (clarification)
    sentences.push(
      clarification.basis === 'conflicting_evidence'
        ? 'Conflicting career evidence needs clarification for: ' +
            brief(clarification.requirement) +
            '.'
        : 'Clarification needed: ' + brief(clarification.question!) + '?',
    );
  if (!completeInventory && unresolved.some((r) => r.kind === 'professional_qualification'))
    sentences.push(
      'Career-record coverage is unconfirmed, so missing evidence is not a known qualification gap.',
    );
  return sentences.join(' ');
}
