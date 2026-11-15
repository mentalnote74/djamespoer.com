import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titleRelationship } from './title-policy.ts';
const role = {
  employerKey: 'fictional-employer',
  startYear: 2015,
  endYear: 2019,
  startMonth: 5,
  endMonth: 6,
  responsibilityAnchors: ['forms', 'accessibility', 'research'],
};
test('title variation never establishes contradiction, canonical title or promotion by itself', () => {
  assert.equal(
    titleRelationship(role, { ...role, startMonth: undefined, endMonth: undefined }),
    'presentation-variants',
  );
  assert.equal(
    titleRelationship(role, { ...role, materialResponsibilityOrSeniorityDisagreement: true }),
    'material-ambiguity',
  );
  assert.equal(
    titleRelationship(role, { ...role, explicitSeparateRoles: true }),
    'material-ambiguity',
  );
  assert.equal(titleRelationship(role, { ...role, startYear: 2020 }), 'unreconciled-role');
  assert.equal(
    titleRelationship(role, { ...role, employerKey: 'other-employer' }),
    'unreconciled-role',
  );
  assert.equal(
    titleRelationship(role, { ...role, responsibilityAnchors: [] }),
    'unreconciled-role',
  );
});
