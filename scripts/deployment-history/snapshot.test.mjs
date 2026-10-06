import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSnapshot, generateSnapshot, writeSnapshotAtomically } from './snapshot.mjs';
import { validateDeploymentSnapshot } from './load-adapter.mjs';
const clock = () => new Date('2026-10-05T20:00:00Z');
const row = {
  id: 'attempt-' + 'a'.repeat(64),
  revision: 'a'.repeat(7),
  createdAt: '2026-10-05T18:00:00.000Z',
  environment: 'production',
  status: 'failed',
};
const source = (rows = []) => ({ acquire: async () => rows, now: clock });
async function withFile(run) {
  const directory = await mkdtemp(join(tmpdir(), 'pipeline-snapshot-test-'));
  try {
    await run(join(directory, 'history.json'), directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
test('isolated legacy v2 snapshot is rejected as v4 pipeline evidence', () => {
  // Historical migration fixture; independent of the current production asset.
  const asset = {
    schemaVersion: 2,
    checkedAt: '2026-10-06T03:31:58.617Z',
    generatedAt: '2026-10-06T03:31:58.617Z',
    refreshStatus: 'ok',
    rows: [],
  };
  assert.equal(validateDeploymentSnapshot(asset).ok, false);
});
test('no default acquisition or synthetic production fallback exists', async () => {
  await assert.rejects(createSnapshot(), /not configured/);
});
test('injected synthetic populated and empty input create sanitized v4 envelopes', async () => {
  assert.deepEqual(await createSnapshot(source()), {
    schemaVersion: 4,
    checkedAt: clock().toISOString(),
    generatedAt: clock().toISOString(),
    refreshStatus: 'ok',
    rows: [],
  });
  assert.deepEqual((await createSnapshot(source([row]))).rows, [row]);
});
test('failed acquisition, normalization and serialization preserve last-good bytes and dates', async () => {
  for (const options of [
    {
      acquire: async () => {
        throw new Error('mock acquisition failed');
      },
    },
    source([row, { ...row, id: 'second', token: 'private' }]),
    source([row, row]),
    { ...source(), now: () => ({ toISOString: () => 'invalid' }) },
  ])
    await withFile(async (output, directory) => {
      const bytes = JSON.stringify(await createSnapshot(source([row]))) + '\n';
      await writeFile(output, bytes);
      await assert.rejects(
        generateSnapshot(output, options),
        (error) => error.lastKnownGoodAvailable === true,
      );
      assert.equal(await readFile(output, 'utf8'), bytes);
      assert.deepEqual(await readdir(directory), ['history.json']);
    });
});
test('atomic replacement stages complete v4 output before touching destination', async () => {
  await withFile(async (output, directory) => {
    await writeFile(output, 'old');
    const snapshot = await createSnapshot(source([row]));
    await writeSnapshotAtomically(output, snapshot, async (temporary, destination) => {
      assert.equal(await readFile(destination, 'utf8'), 'old');
      assert.equal(join(directory, temporary.split(/[\\/]/).at(-1)), temporary);
      assert.deepEqual(JSON.parse(await readFile(temporary, 'utf8')), snapshot);
      await rename(temporary, destination);
    });
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), snapshot);
    assert.deepEqual(await readdir(directory), ['history.json']);
  });
});
test('failed replacement cleans temp output and preserves prior bytes', async () => {
  await withFile(async (output, directory) => {
    await writeFile(output, 'old');
    await assert.rejects(
      writeSnapshotAtomically(output, await createSnapshot(source()), async () => {
        throw new Error('mock failure');
      }),
    );
    assert.equal(await readFile(output, 'utf8'), 'old');
    assert.deepEqual(await readdir(directory), ['history.json']);
  });
});
test('v2, malformed envelopes and private rows cannot replace valid output', async () => {
  await withFile(async (output, directory) => {
    const valid = await createSnapshot(source([row]));
    const bytes = JSON.stringify(valid);
    await writeFile(output, bytes);
    for (const invalid of [
      { ...valid, schemaVersion: 2 },
      { ...valid, schemaVersion: 3 },
      { ...valid, refreshStatus: 'failed' },
      { ...valid, checkedAt: 'invalid' },
      { ...valid, rawProvider: {} },
      { ...valid, rows: [{ ...row, token: 'private' }] },
      { ...valid, toJSON: () => ({ rows: [] }) },
    ]) {
      await assert.rejects(writeSnapshotAtomically(output, invalid));
      assert.equal(await readFile(output, 'utf8'), bytes);
    }
    assert.deepEqual(await readdir(directory), ['history.json']);
  });
});
test('successful populated and verified-empty refreshes replace earlier snapshots', async () => {
  await withFile(async (output) => {
    const populated = await generateSnapshot(output, source([row]));
    const empty = await generateSnapshot(output, {
      ...source(),
      now: () => new Date('2026-10-06T20:00:00Z'),
    });
    assert.equal(empty.rows.length, 0);
    assert.notEqual(empty.checkedAt, populated.checkedAt);
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), empty);
  });
});
test('orphan recovery discards only recognized temps and never promotes candidates', async () => {
  await withFile(async (output, directory) => {
    const bytes = JSON.stringify(await createSnapshot(source([row])));
    await writeFile(output, bytes);
    const orphan = '.history.json-12345678-1234-1234-1234-123456789abc.tmp';
    await writeFile(join(directory, orphan), 'partial');
    await writeFile(
      join(directory, '.other.json-12345678-1234-1234-1234-123456789abc.tmp'),
      'unrelated',
    );
    await writeFile(join(directory, '.history.json-unrecognized.tmp'), 'unrelated');
    await assert.rejects(
      generateSnapshot(output),
      (error) => error.lastKnownGoodAvailable === true,
    );
    assert.equal(await readFile(output, 'utf8'), bytes);
    assert.ok(!(await readdir(directory)).includes(orphan));
    assert.equal((await readdir(directory)).length, 3);
  });
});
test('failed refresh distinguishes unavailable legacy/invalid/missing files from valid v4 history', async () => {
  await withFile(async (output) => {
    for (const contents of [null, 'broken JSON', '{"schemaVersion":2,"rows":[]}']) {
      if (contents !== null) await writeFile(output, contents);
      await assert.rejects(
        generateSnapshot(output),
        (error) => error.lastKnownGoodAvailable === false,
      );
      if (contents !== null) assert.equal(await readFile(output, 'utf8'), contents);
      else await assert.rejects(readFile(output), { code: 'ENOENT' });
    }
  });
});
test('legacy orphan naming is cleaned for the public asset filename', async () => {
  await withFile(async (_output, directory) => {
    const output = join(directory, 'deployment-history.json');
    await writeFile(
      join(directory, '.deployment-history-12345678-1234-1234-1234-123456789abc.tmp'),
      'abandoned',
    );
    await generateSnapshot(output, source());
    assert.deepEqual(await readdir(directory), ['deployment-history.json']);
  });
});
