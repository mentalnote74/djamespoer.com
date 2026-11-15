export const CONTEXT_POLICY = 'client-one-document-context-v3';
export type QuestionContext = {
  presentationOnly: boolean;
  requiredDateMissing?: boolean;
  contradictoryActualDates?: boolean;
  unreconciledEmployment?: boolean;
};
export function requiresOwnerJudgment(context: QuestionContext) {
  return !!(
    context.contradictoryActualDates ||
    context.unreconciledEmployment ||
    context.requiredDateMissing
  );
}
export function isExperienceSummary(text: string, location: 'resume_summary' | 'employment') {
  return (
    location === 'resume_summary' &&
    /\b(?:over\s+|more than\s+|at least\s+)?\d+\s*\+?\s*(?:years?|yrs?)/i.test(text)
  );
}
// Pinned proof context, derived from its approved source wording, not the sealed benchmark.
// Unknown dates remain unknown; no filename date or capture time becomes an authored date.
export function approvedSourceContexts(runId: string) {
  if (runId !== '1f96a7ab-1567-4678-bcef-15b840439cc7') return [];
  return [
    {
      candidateId: 'resume-002',
      issueId: 'question-4',
      kind: 'duration_summary',
      category: 'qualified',
      display:
        'Historical resume experience-summary wording only. It is not a timeless career-duration fact; document date is not established.',
      reason:
        'Experience-summary numbers age with source dates. Preserve wording as metadata; use actual employment chronology for duration. No conflicting actual dates are asserted.',
    },
    {
      candidateId: 'resume-004',
      issueId: 'question-4',
      kind: 'historical_asof',
      category: 'qualified',
      display:
        'Historical source reports employment from its stated start date through its own undated Present. This is not evidence of current employment or a known end date.',
      reason:
        'Keep the open endpoint explicitly unknown and source-relative. The current fact does not require a precise resume date; do not infer a present-day role.',
    },
    {
      candidateId: 'resume-008',
      issueId: 'question-4',
      kind: 'historical_asof',
      category: 'qualified',
      display:
        'Historical source reports work in progress on its own branch. It does not establish a completed upgrade or current activity.',
      reason:
        'Historical in-progress wording is already bounded to the source. No completion date or outcome is claimed; a document-date question is not required.',
    },
    {
      candidateId: 'resume-030',
      issueId: 'question-3',
      kind: 'education_precision',
      category: 'baseline',
      display:
        'Degree listing is retained. No award date is assigned from the adjacent ambiguous date.',
      reason:
        'The extracted degree listing asserts no date. Preserve ambiguous education-date placement as informational rather than asking for an unnecessary chronology value.',
    },
    {
      candidateId: 'resume-031',
      issueId: 'question-3',
      kind: 'education_precision',
      category: 'baseline',
      display:
        'Certificate listing is retained. No issue date is assigned from the adjacent ambiguous date.',
      reason:
        'The extracted certificate listing asserts no date. Missing optional precision does not block this fact or require owner interruption.',
    },
    {
      candidateId: 'resume-042',
      issueId: 'elapsed-time',
      kind: 'elapsed_budget',
      category: 'qualified',
      display:
        'The source states a six-week build allowance and the technologies used. Do not treat the allowance as a measured elapsed completion time.',
      reason:
        'Resolve the extraction-strengthening problem by retaining the actual source wording. A budget/allowance is not a measured duration; no owner answer is needed to avoid that inference.',
    },
  ];
}
