import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  boundedBytes,
  MAX_EVIDENCE_BYTES,
  validateEvidence,
} from '../server/thingamajob/evidence-validation.ts';

export const resumeLocator = 'career-source/resumes/historical/DJamesPoerResume.10.21.docx';
export const websiteLocator = 'https://djamespoer.com/';
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Local operator capture only. No authenticated workspace or deployed ingestion is implied. */
export async function captureRun(root, resume, fetchSource = fetch) {
  // Validate before creating a run. The existing structural validator is not a truth verifier.
  const provenance = await validateEvidence(
    resume,
    path.basename(resumeLocator),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Client-provided historical James resume; approved ordinary extraction input',
    resumeLocator,
  );
  const resumeCapturedAt = new Date().toISOString();
  // Fixed approved public origin, no redirects, credentials, crawling, scripts or private retrieval.
  const response = await fetchSource(websiteLocator, {
    redirect: 'error',
    credentials: 'omit',
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'text/html' },
  });
  if (
    !response.ok ||
    response.redirected ||
    (response.url && response.url !== websiteLocator) ||
    !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')
  )
    throw new Error('Public source capture failed; no run committed');
  const html = await boundedBytes(response.body, MAX_EVIDENCE_BYTES);
  // Preserve exact response-body bytes as inert data; reuse UTF-8/size/control validation.
  await validateEvidence(
    html,
    'website.html.txt',
    'text/plain',
    'James public portfolio',
    websiteLocator,
  );
  const websiteCapturedAt = new Date().toISOString();
  const runId = randomUUID();
  const directory = path.join(root, runId);
  await mkdir(root, { recursive: true });
  await mkdir(directory); // Fail closed on collision; never overwrite/reconcile an existing run.
  const sources = [
    {
      sourceId: randomUUID(),
      file: 'resume.docx',
      bytes: resume,
      capturedAt: resumeCapturedAt,
      mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ...provenance,
    },
    {
      sourceId: randomUUID(),
      file: 'website.html',
      bytes: html,
      capturedAt: websiteCapturedAt,
      mediaType: 'text/html',
      sourceType: 'html',
      filename: 'website.html',
      attribution: 'James public portfolio; approved ordinary extraction input',
      sourceLocator: websiteLocator,
      httpStatus: response.status,
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      captureScope: 'Root HTML response only; not rendered DOM, linked routes or external assets',
    },
  ];
  const manifest = {
    formatVersion: 1,
    runId,
    purpose: 'client-one-independent-lot-proof',
    stage: 'sources-captured-before-extraction',
    execution: 'local-operator-only',
    createdAt: new Date().toISOString(),
    benchmarkUsed: false,
    sources: sources.map(({ bytes, ...source }) => ({
      ...source,
      runId,
      version: 1,
      byteLength: bytes.length,
      sha256: sha256(bytes),
    })),
  };
  for (const source of sources)
    await writeFile(path.join(directory, source.file), source.bytes, { flag: 'wx', mode: 0o600 });
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(directory, 'manifest.json'), manifestBytes, {
    flag: 'wx',
    mode: 0o600,
  });
  // Completion seal written last. Partial directories are retained, never mistaken for committed runs.
  const manifestSha256 = sha256(manifestBytes);
  await writeFile(path.join(directory, 'COMMITTED.sha256'), manifestSha256 + '\n', {
    flag: 'wx',
    mode: 0o600,
  });
  await verifyRun(directory, manifestSha256);
  return { runId, directory, manifestSha256, sources: manifest.sources };
}

export async function verifyRun(directory, expectedManifestHash) {
  const bytes = await readFile(path.join(directory, 'manifest.json'));
  const seal = (await readFile(path.join(directory, 'COMMITTED.sha256'), 'utf8')).trim();
  if (seal !== expectedManifestHash || sha256(bytes) !== expectedManifestHash)
    throw new Error('Capture manifest integrity failure');
  const manifest = JSON.parse(bytes);
  if (manifest.runId !== path.basename(directory) || manifest.sources.length !== 2)
    throw new Error('Invalid capture run');
  for (const source of manifest.sources) {
    if (!['resume.docx', 'website.html'].includes(source.file) || source.runId !== manifest.runId)
      throw new Error('Invalid source linkage');
    const original = await readFile(path.join(directory, source.file));
    if (original.length !== source.byteLength || sha256(original) !== source.sha256)
      throw new Error('Captured original integrity failure');
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = fileURLToPath(new URL('../', import.meta.url));
  const input = await realpath(path.join(repo, resumeLocator));
  const allowed = await realpath(path.join(repo, 'career-source/resumes/historical'));
  if (path.dirname(input) !== allowed) throw new Error('Unexpected resume location');
  const result = await captureRun(
    path.join(repo, 'career-source/proof-runs'),
    await readFile(input),
  );
  console.log(JSON.stringify(result, null, 2)); // Metadata only; never log source bodies.
}
