import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evidenceFixture } from './evidence-fixtures.mjs';
import { seedProofOwners, runRoundtripProof, verifyProofPersistence } from './roundtrip-proof.ts';
test('two fictional clients complete both production pipelines, adversarial tool isolation and partial-failure reconciliation', async () => {
  const f = evidenceFixture();
  try {
    for (const name of ['assertions.sql', 'claim-lifecycle.sql', 'unknowns.sql'])
      f.db.exec(readFileSync(new URL(name, import.meta.url), 'utf8'));
    await seedProofOwners(f.database);
    const result = await runRoundtripProof(f.database, f.bucket);
    assert.equal(result.passed, true);
    assert.equal(result.llm, false);
    assert.equal(result.checks.length, 7);
    assert.equal(result.counts.unknowns, 7);
    assert.equal(result.counts.unknown_resolutions, 4);
    assert.ok(result.counts.claims >= 6 && result.counts.claims <= 8);
    assert.equal(result.counts.reviews, 10);
    assert.equal(result.counts.proposals, 10);
    assert.equal((await verifyProofPersistence(f.database, f.bucket)).passed, true);
  } finally {
    f.db.close();
  }
});

test('both client originals, claims, resolutions, history and idempotent retries survive an actual process restart', () => {
  const directory = mkdtempSync(join(tmpdir(), 'scrum85-fictional-'));
  try {
    const script = fileURLToPath(new URL('./proof-process-fixture.mjs', import.meta.url));
    const first = JSON.parse(
      execFileSync(process.execPath, [script, directory, 'create'], { encoding: 'utf8' }),
    );
    const restarted = JSON.parse(
      execFileSync(process.execPath, [script, directory, 'restart'], { encoding: 'utf8' }),
    );
    assert.equal(first.passed, true);
    assert.equal(restarted.passed, true);
    assert.equal(restarted.clients, 2);
    assert.equal(restarted.countsUnchanged, true);
  } finally {
    const target = resolve(directory),
      root = resolve(tmpdir()) + sep;
    if (!target.startsWith(root) || !target.slice(root.length).startsWith('scrum85-fictional-'))
      throw Error('Unsafe fixture cleanup path');
    rmSync(target, { recursive: true, force: true });
  }
});
