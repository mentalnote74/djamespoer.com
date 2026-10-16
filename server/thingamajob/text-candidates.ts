import { evidenceMetadata } from './evidence-service.ts';
import { loadOriginal } from './original-storage.ts';
import type { OriginalBucket } from './original-storage.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';
import { recheckWorkspace } from './workspace-access.ts';
import { createProposal } from './assertion-service.ts';
import { boundedBytes, EvidenceInputError } from './evidence-validation.ts';

// Extractive suggestions only: no paraphrase, inferred chronology, or truth promotion.
export function textCandidates(text: string) {
  if (!text.trim()) throw new EvidenceInputError();
  if (text.length > 80_000) throw new EvidenceInputError(413);
  const candidates: { statement: string; locator: string; excerpt: string }[] = [];
  const seen = new Map<string, number>();
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const statement = raw.replace(/^\s*[-*•]\s+/, '').trim();
    if (!statement) continue;
    if (statement.length > 4000) throw new EvidenceInputError(413);
    // Contact details remain in the private original, never suggested as career facts.
    if (
      /^(?:email|phone|mobile|address)\s*:/i.test(statement) ||
      /^[^\s@]+@[^\s@]+$/.test(statement) ||
      /^(?:https?:\/\/|www\.)\S+$/.test(statement) ||
      (/^\+?[\d ().-]+$/.test(statement) && statement.replace(/\D/g, '').length >= 10)
    )
      continue;
    const key = statement.normalize('NFKC').replace(/\s+/g, ' ').toLowerCase();
    const previous = seen.get(key);
    if (previous !== undefined) {
      candidates[previous].locator += `, line ${index + 1}`;
      if (candidates[previous].locator.length > 2000) throw new EvidenceInputError(413);
      continue;
    }
    seen.set(key, candidates.length);
    candidates.push({ statement, excerpt: raw, locator: `Text lines v1: line ${index + 1}` });
  }
  if (candidates.length > 100) throw new EvidenceInputError(413);
  return candidates;
}

export async function sourceCandidates(
  request: Request,
  database: IdentityDatabase,
  bucket: OriginalBucket,
  scope: WorkspaceAccess,
  sourceId: string,
) {
  const source = await evidenceMetadata(database, scope, sourceId);
  if (source.sourceType !== 'txt') throw new EvidenceInputError(415);
  if (source.byteLength > 320_000) throw new EvidenceInputError(413);
  const original = await loadOriginal(database, bucket, scope, sourceId);
  const candidates = textCandidates(
    new TextDecoder('utf-8', { fatal: true }).decode(original.bytes),
  );
  await recheckWorkspace(scope);
  if (request.method === 'GET') return { source, method: 'text-lines-v1', candidates };
  const input: unknown = JSON.parse(
    new TextDecoder().decode(await boundedBytes(request.body, 1024)),
  );
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).length !== 1 ||
    !('index' in input) ||
    !Number.isInteger(input.index) ||
    typeof input.index !== 'number' ||
    !candidates[input.index]
  )
    throw new EvidenceInputError();
  const candidate = candidates[input.index];
  // Stable source/version/index key makes resuming this source safe after a lost response.
  return createProposal(
    new Request('https://internal.invalid/assertions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `text-v1-${sourceId}-${input.index}`,
      },
      body: JSON.stringify({
        statement: candidate.statement,
        proposerAttribution: 'Extractive source suggestion (text-lines-v1); owner review required',
        evidence: [{ sourceId, locator: candidate.locator }],
      }),
    }),
    database,
    scope,
  );
}
