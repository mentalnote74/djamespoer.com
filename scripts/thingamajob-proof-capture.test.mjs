import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fictionalDocx } from '../server/thingamajob/evidence-fixtures.mjs';
import { captureRun, verifyRun, websiteLocator } from './thingamajob-proof-capture.mjs';

test('capture links exact inert originals to a sealed run and detects later tampering', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'fictional-proof-'));
  try {
    const resume = fictionalDocx();
    const html = '<!doctype html><title>Fictional source</title><script>neverExecute()</script>';
    const result = await captureRun(root, resume, async (url, options) => {
      assert.equal(url, websiteLocator);
      assert.equal(options.redirect, 'error');
      assert.equal(options.credentials, 'omit');
      return new Response(html, { headers: { 'content-type': 'text/html' } });
    });
    const manifest = await verifyRun(result.directory, result.manifestSha256);
    assert.equal(manifest.benchmarkUsed, false);
    assert.equal(manifest.stage, 'sources-captured-before-extraction');
    assert.equal(manifest.sources.length, 2);
    assert.deepEqual(
      await readFile(path.join(result.directory, 'resume.docx')),
      Buffer.from(resume),
    );
    assert.equal(await readFile(path.join(result.directory, 'website.html'), 'utf8'), html);
    for (const source of manifest.sources) {
      assert.equal(source.runId, result.runId);
      assert.ok(Number.isFinite(Date.parse(source.capturedAt)));
    }
    await assert.rejects(verifyRun(result.directory, '0'.repeat(64)), /integrity/);
    await writeFile(path.join(result.directory, 'website.html'), 'tampered');
    await assert.rejects(verifyRun(result.directory, result.manifestSha256), /integrity/);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('invalid input and failed/non-HTML retrieval leave no committed run', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'fictional-proof-'));
  try {
    await assert.rejects(
      captureRun(root, new Uint8Array([1]), () => {
        throw Error('must not fetch');
      }),
    );
    for (const response of [
      new Response('blocked', { status: 403 }),
      new Response('{}', { headers: { 'content-type': 'application/json' } }),
    ])
      await assert.rejects(captureRun(root, fictionalDocx(), async () => response));
    assert.deepEqual(await readdir(root), []);
  } finally {
    await rm(root, { recursive: true });
  }
});
