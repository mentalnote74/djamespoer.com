import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepare, validateCandidates } from './thingamajob-claim-extraction.mjs';
import { sha256 } from './thingamajob-proof-capture.mjs';

// Local packaging only. No credentials, deployment, model call or workspace impersonation.
export async function prepareStaging(repo) {
  const prepared = await prepare(repo);
  const extractionDirectory = path.join(
    repo,
    'career-source/proof-extractions',
    prepared.fingerprint,
  );
  const bytes = await readFile(path.join(extractionDirectory, 'candidates.json'));
  if (sha256(bytes) !== 'd1570225565b99c8983aaa1f24c4cef77ff8c05425ffe71de74451f58a7aa9c4')
    throw new Error('Accepted candidate set changed');
  const document = JSON.parse(bytes);
  validateCandidates(document, prepared.sources);
  const directory = path.join(repo, 'career-source/proof-staging', document.extractionRunId);
  await mkdir(directory, { recursive: true });
  const sources = [],
    files = [];
  for (const source of prepared.sources) {
    const units = source.units
      .filter((u) => u.text.trim())
      .map(({ locationKey, text }) => ({ locationKey, text }));
    const text = units.map((u) => `[${u.locationKey}]\n${u.text}`).join('\n\n') + '\n';
    const file = `${source.key}.txt`,
      data = Buffer.from(text),
      hash = sha256(data);
    await writeFile(path.join(directory, file), data, { flag: 'wx', mode: 0o600 });
    files.push({
      key: source.key,
      file,
      sha256: hash,
      byteLength: data.length,
      attribution: 'Authorized source projection for extraction run ' + document.extractionRunId,
      sourceLocator: source.sourceLocator,
      originalArtifact: source.artifact,
    });
    // Placeholder deliberately fails evidence lookup until owner uploads and binds each source.
    sources.push({ key: source.key, sourceId: `UNBOUND_${source.key}`, sha256: hash, units });
  }
  const template = { ...document, sources };
  const templateBytes = Buffer.from(JSON.stringify(template, null, 2) + '\n');
  await writeFile(path.join(directory, 'import-template.json'), templateBytes, {
    flag: 'wx',
    mode: 0o600,
  });
  const manifest = {
    extractionRunId: document.extractionRunId,
    baselineRunId: document.baselineRunId,
    candidatesSha256: sha256(bytes),
    templateSha256: sha256(templateBytes),
    files,
    candidateCount: document.claims.length,
    questionCount: document.questions.length,
    state: 'prepared-only-not-staged',
    authority: 'Requires real protected owner session and workspace-bound evidence IDs',
    instructions:
      'Upload these three text projections through existing protected evidence intake. Replace only UNBOUND source IDs with returned owner-scoped evidence IDs; POST unchanged candidate metadata to extraction-runs. Continue identical POST while state=staging. Do not send tokens to this script.',
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(directory, 'manifest.json'), manifestBytes, {
    flag: 'wx',
    mode: 0o600,
  });
  for (const file of files)
    if (sha256(await readFile(path.join(directory, file.file))) !== file.sha256)
      throw new Error('Staging artifact mismatch');
  return {
    directory,
    manifestSha256: sha256(manifestBytes),
    candidateCount: manifest.candidateCount,
    questionCount: manifest.questionCount,
    state: manifest.state,
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(
    JSON.stringify(await prepareStaging(fileURLToPath(new URL('../', import.meta.url))), null, 2),
  );
