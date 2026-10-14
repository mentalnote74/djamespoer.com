import { AccessDenied } from './access-identity.ts';
import { recheckWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';
import { storeOriginal, loadOriginal } from './original-storage.ts';
import type { OriginalBucket } from './original-storage.ts';
import {
  boundedBytes,
  EvidenceInputError,
  MAX_EVIDENCE_BYTES,
  validateEvidence,
} from './evidence-validation.ts';

export async function intakeEvidence(
  request: Request,
  database: IdentityDatabase,
  bucket: OriginalBucket,
  scope: WorkspaceAccess,
) {
  await recheckWorkspace(scope);
  const contentType = request.headers.get('Content-Type') ?? '';
  if (!/^multipart\/form-data;.*boundary=/i.test(contentType)) throw new EvidenceInputError(415);
  const raw = await boundedBytes(request.body, MAX_EVIDENCE_BYTES + 100_000);
  let form: FormData;
  try {
    form = await new Response(raw, { headers: { 'Content-Type': contentType } }).formData();
  } catch {
    throw new EvidenceInputError();
  }
  for (const key of form.keys())
    if (!['file', 'attribution', 'sourceLocator'].includes(key) || form.getAll(key).length !== 1)
      throw new EvidenceInputError();
  const file = form.get('file');
  if (!(file instanceof File)) throw new EvidenceInputError();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const provenance = await validateEvidence(
    bytes,
    file.name,
    file.type,
    form.get('attribution'),
    form.get('sourceLocator') ?? '',
  );
  const saved = await storeOriginal(
    database,
    bucket,
    scope,
    request.headers.get('Idempotency-Key') ?? '',
    bytes,
    0,
    provenance,
  );
  const evidence = await evidenceMetadata(database, scope, saved.sourceId);
  return { ...evidence, replayed: saved.replayed };
}

export async function evidenceMetadata(
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  sourceId: string,
) {
  await recheckWorkspace(scope);
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(sourceId)) throw new AccessDenied();
  const row = await database
    .prepare(
      `SELECT e.source_id, e.filename, e.source_type, e.attribution, e.source_locator,
    e.acquired_at, e.version, o.sha256, o.byte_length
    FROM thingamajob_evidence e JOIN thingamajob_originals o
      ON o.workspace_id=e.workspace_id AND o.source_id=e.source_id AND o.version=e.version
    WHERE e.workspace_id=? AND e.source_id=?`,
    )
    .bind(scope.workspaceId, sourceId)
    .first<{
      source_id: string;
      filename: string;
      source_type: string;
      attribution: string;
      source_locator: string;
      acquired_at: number;
      version: number;
      sha256: string;
      byte_length: number;
    }>();
  if (!row) throw new AccessDenied();
  await recheckWorkspace(scope);
  return {
    sourceId: row.source_id,
    filename: row.filename,
    sourceType: row.source_type,
    attribution: row.attribution,
    sourceLocator: row.source_locator,
    acquiredAt: new Date(row.acquired_at * 1000).toISOString(),
    version: row.version,
    sha256: row.sha256,
    byteLength: row.byte_length,
  };
}

export async function downloadEvidence(
  database: IdentityDatabase,
  bucket: OriginalBucket,
  scope: WorkspaceAccess,
  sourceId: string,
) {
  const metadata = await evidenceMetadata(database, scope, sourceId);
  const original = await loadOriginal(database, bucket, scope, sourceId);
  return new Response(Uint8Array.from(original.bytes), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(metadata.filename).replace(/['()*]/g, (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase())}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "sandbox; default-src 'none'",
    },
  });
}
