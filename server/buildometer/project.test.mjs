import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { projectMeasurement, applyProject } from './project.ts';
import { emptyData } from './derive.ts';
const ledger = JSON.parse(
  await readFile(new URL('../../scripts/buildometer/project-ledger.json', import.meta.url)),
);
test('approved T0 is computed from unique item-level estimates and shipped dispositions', () => {
  const p = projectMeasurement(ledger),
    d = emptyData(new Date().toISOString());
  applyProject(d, p);
  assert.equal(d.metrics.completion.value, 38.5);
  assert.equal(d.metrics.done.value, 152);
  assert.equal(d.metrics.remaining.value, 243);
  assert.equal(d.supportingFacts.project.total, 395);
  assert.equal(d.series.burndown.length, 1);
  assert.equal(d.metrics.scopeChange.value, 0);
  assert.equal(d.metrics.velocity.value, null);
  assert.equal(JSON.stringify(p).includes('SCRUM-'), false);
});
test('prospective growth, reestimate, removal, shipment and reopening retain historical observations', () => {
  const l = structuredClone(ledger),
    first = l.observations[0];
  first.observedAt = '2026-10-18T00:00:00Z';
  const members = structuredClone(first.members);
  members.push({
    key: 'SCRUM-999',
    title: 'Approved new scope',
    points: 5,
    shipped: false,
    disposition: 'not',
  });
  members.find((m) => m.key === 'SCRUM-25').shipped = true;
  l.observations.push({
    id: 'later',
    reason: 'approved change',
    observedAt: '2026-10-18T01:00:00Z',
    members,
  });
  let p = projectMeasurement(l),
    d = emptyData('2026-10-18T01:00:00Z');
  applyProject(d, p);
  assert.equal(d.supportingFacts.project.total, 400);
  assert.equal(d.metrics.done.value, 155);
  assert.equal(d.metrics.scopeChange.value, 5);
  assert.equal(d.series.burndown[0].value, 243);
  const next = structuredClone(members).filter((m) => m.key !== 'SCRUM-999');
  next.find((m) => m.key === 'SCRUM-25').shipped = false;
  next.find((m) => m.key === 'SCRUM-65').points = 2;
  l.observations.push({
    id: 'third',
    reason: 'removal/reestimate/reopen',
    observedAt: '2026-10-18T02:00:00Z',
    members: next,
  });
  p = projectMeasurement(l);
  applyProject(d, p);
  assert.equal(d.supportingFacts.project.total, 396);
  assert.equal(d.metrics.done.value, 152);
  assert.equal(d.supportingFacts.project.removed, 5);
  assert.equal(d.supportingFacts.project.reestimated, 1);
});
test('duplicate members, rewritten approval, invalid points and invalid observation chronology fail closed', () => {
  for (const mutate of [
    (l) => l.observations[0].members.push(l.observations[0].members[0]),
    (l) => l.approvedOpening.total++,
    (l) => (l.observations[0].members[0].points = -1),
    (l) => (l.observations[0].observedAt = 'invalid'),
  ]) {
    const l = structuredClone(ledger);
    mutate(l);
    assert.throws(() => projectMeasurement(l));
  }
});
