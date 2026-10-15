import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCandidates, estimateCost } from './thingamajob-claim-extraction.mjs';
const sources = [
  { key: 'resume', units: [{ locationKey: 'document:p1', text: 'Built a fictional form.' }] },
];
const fixture = () => ({
  claims: [
    {
      id: 'c1',
      sourceKey: 'resume',
      text: 'Built a fictional form.',
      extractionConfidence: 'high',
      uncertainties: [],
      citations: [{ locationKey: 'document:p1', quote: 'Built a fictional form.' }],
    },
  ],
  conflicts: [],
  questions: [],
});
test('candidate citations must literally belong to their approved source location', () => {
  validateCandidates(fixture(), sources);
  for (const mutate of [
    (r) => (r.claims[0].citations[0].quote = 'Invented evidence'),
    (r) => (r.claims[0].citations[0].locationKey = 'other:p1'),
    (r) => (r.claims[0].sourceKey = 'benchmark'),
    (r) => (r.claims[0].citations = []),
  ]) {
    const result = fixture();
    mutate(result);
    assert.throws(() => validateCandidates(result, sources));
  }
});
test('conflicts and owner questions preserve known candidate references', () => {
  const result = fixture();
  result.claims.push({
    ...structuredClone(result.claims[0]),
    id: 'c2',
    uncertainties: ['Date needs owner clarification.'],
  });
  result.conflicts = [
    {
      id: 'conflict1',
      claimIds: ['c1', 'c2'],
      kind: 'possible-conflict',
      explanation: 'Fictional competing dates.',
    },
  ];
  result.questions = [{ question: 'Which date is correct?', claimIds: ['c1', 'c2'] }];
  validateCandidates(result, sources);
  result.conflicts[0].claimIds.push('missing');
  assert.throws(() => validateCandidates(result, sources));
});
test('duplicate candidate IDs and source omissions fail closed', () => {
  const result = fixture();
  result.claims.push(result.claims[0]);
  assert.throws(() => validateCandidates(result, sources));
  assert.throws(() => validateCandidates(fixture(), [...sources, { key: 'ips', units: [] }]));
});
test('usage costing includes reported cache writes and all output/reasoning tokens', () => {
  assert.equal(
    estimateCost({
      input_tokens: 6477,
      input_tokens_details: { cache_write_tokens: 6474, cached_tokens: 0 },
      output_tokens: 6763,
    }),
    0.167642,
  );
  assert.equal(estimateCost(null), null);
});
