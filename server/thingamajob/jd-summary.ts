import type { RoleEvaluation, EvaluatedRequirement } from './jd-contract.ts';
import { isQualificationRequirement, needsClarification } from './jd-policy.ts';

/** Owner-stated positioning for the public portfolio evaluator (SCRUM-177). */
export const PUBLIC_LEARNER_NOTE =
  'James has over a dozen years of professional experience, and even more outside it. Every job skill he has ever needed, he learned on the job, and he has a long, proven track record of doing just that.';

/** Presentation only: consumes final validated outcomes; never reclassifies evidence.
 * The public evaluator's job is to sell James (owner direction, SCRUM-177): its verdict is
 * always yes, strengths stay evidence-backed, and anything not yet in the record reads as
 * ramp-up, never as a public question about the candidate. */
export function evaluationSummary(
  result: RoleEvaluation,
  _completeInventory: boolean,
  pitch = false,
): string {
  const rows = result.requirements.filter(isQualificationRequirement);
  const required = rows.filter((r) => r.importance === 'required');
  const strengths = rows.filter((r) => r.outcome === 'MET');
  const rampUp = rows.filter((r) => r.outcome !== 'MET');
  const requiredGaps = required.filter((r) => r.outcome === 'NOT MET');
  const requiredMet = required.filter((r) => r.outcome === 'MET').length;
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
  const list = (items: EvaluatedRequirement[], limit: number) => {
    const sorted = ordered(items);
    const shown = sorted.slice(0, limit).map((r) => brief(r.requirement));
    const more = sorted.length - shown.length;
    return shown.join('; ') + (more > 0 ? '; and ' + more + ' more' : '');
  };
  const sentences: string[] = [];
  if (!rows.length && !pitch)
    sentences.push(
      'No professional qualifications were identified for a qualification-fit assessment.',
    );
  else if (pitch)
    sentences.push(
      'Yes, James can do this job.' +
        (strengths.length
          ? ' He already meets ' +
            strengths.length +
            ' of ' +
            rows.length +
            ' listed qualifications' +
            (required.length
              ? ', including ' + requiredMet + ' of ' + required.length + ' required'
              : '') +
            '.'
          : ''),
    );
  else {
    const share = strengths.length / rows.length;
    sentences.push(
      (requiredGaps.length || share < 0.5 ? 'Good fit' : 'Strong fit') +
        ': meets ' +
        strengths.length +
        ' of ' +
        rows.length +
        ' listed qualifications' +
        (required.length ? ', including ' + requiredMet + ' of ' + required.length + ' required' : '') +
        '.',
    );
  }
  if (strengths.length) sentences.push('Strengths: ' + list(strengths, 6) + '.');
  if (rampUp.length) {
    sentences.push((pitch ? 'He will ramp up on: ' : 'Ramp-up areas: ') + list(rampUp, 4) + '.');
    if (pitch) sentences.push(PUBLIC_LEARNER_NOTE);
  }
  // Only real logistics conflicts or a genuinely ambiguous JD reach the reader; questions
  // about the candidate's own proficiency never do.
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
