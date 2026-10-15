import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  requiresOwnerJudgment,
  isExperienceSummary,
  approvedSourceContexts,
} from './context-policy.ts';
test('time-relative career summaries are presentation metadata, not employment-duration contradictions', () => {
  for (const text of ['over 9 years of experience', '10+ years', '12 years of experience'])
    assert.equal(isExperienceSummary(text, 'resume_summary'), true);
  assert.equal(
    isExperienceSummary('12 years of employment at a fictional employer', 'employment'),
    false,
  );
  assert.equal(requiresOwnerJudgment({ presentationOnly: true }), false);
  assert.equal(
    requiresOwnerJudgment({ presentationOnly: true, contradictoryActualDates: true }),
    true,
  );
  assert.equal(requiresOwnerJudgment({ presentationOnly: false, requiredDateMissing: true }), true);
  assert.equal(
    requiresOwnerJudgment({ presentationOnly: false, unreconciledEmployment: true }),
    true,
  );
});
test('pinned source context suppresses presentation questions without inventing dates or promoting a duration', () => {
  const contexts = approvedSourceContexts('1f96a7ab-1567-4678-bcef-15b840439cc7');
  assert.equal(contexts.length, 6);
  assert.equal(contexts.find((c) => c.candidateId === 'resume-002').category, 'qualified');
  assert.equal(contexts.filter((c) => c.category === 'baseline').length, 2);
  assert.equal(new Set(contexts.map((c) => c.issueId)).size, 3);
  assert.deepEqual(approvedSourceContexts('unapproved-run'), []);
});
