import { AccessDenied, createAccessIdentityAdapter } from './access-identity.ts';
import { authorizeWorkspace } from './workspace-access.ts';
import type { IdentityDatabase } from './workspace-access.ts';
import type { JWTVerifyGetKey } from 'jose';
import { bootstrapOwnWorkspace } from './self-workspace.ts';
import { testStartPage } from './test-start.ts';
import { ownStorageWorkspace, storageReadiness } from './storage-readiness.ts';
import type { PrivateOriginals } from './storage-readiness.ts';
import { StorageConflict, storeOriginal, verifyOriginal } from './original-storage.ts';
import type { OriginalBucket } from './original-storage.ts';
import { storageRoundtripPage } from './storage-roundtrip-page.ts';
import { evidencePage } from './evidence-page.ts';
import { EvidenceInputError } from './evidence-validation.ts';
import { intakeEvidence, evidenceMetadata, downloadEvidence } from './evidence-service.ts';

export interface WorkerEnvironment {
  ACCESS_ISSUER: string;
  ACCESS_AUDIENCE: string;
  IDENTITY_DB: IdentityDatabase;
  TEST_BOOTSTRAP_ENABLED?: string;
  TEST_REFERENCE_WORKSPACE?: string;
  PRIVATE_ORIGINALS?: PrivateOriginals & Partial<OriginalBucket>;
}

function reply(status: number, body: object): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

/** Keys are an operator/test construction seam, never request-supplied. */
export function createWorker(keys?: JWTVerifyGetKey) {
  return {
    async fetch(request: Request, env: WorkerEnvironment): Promise<Response> {
      const path = new URL(request.url).pathname;
      const testEnabled =
        env.TEST_BOOTSTRAP_ENABLED === 'true' &&
        new URL(request.url).origin === 'https://api-test.djamespoer.com';
      const start = path === '/api/thingamajob/test/start';
      const bootstrap = path === '/api/thingamajob/bootstrap';
      const reference = path === '/api/thingamajob/test/reference-access';
      const ownStorage = path === '/api/thingamajob/test/storage';
      const roundtrip = path === '/api/thingamajob/test/storage-roundtrip';
      const ownEvidence = path === '/api/thingamajob/test/evidence';
      const evidence = testEnabled
        ? /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/evidence(?:\/([a-zA-Z0-9_-]{1,100})(\/original)?)?$/.exec(
            path,
          )
        : null;
      const storage = testEnabled
        ? /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/storage$/.exec(path)
        : null;
      const match = /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/access$/.exec(path);
      if (
        !match &&
        !storage &&
        !evidence &&
        !(
          testEnabled &&
          (start || bootstrap || reference || ownStorage || roundtrip || ownEvidence)
        )
      )
        return reply(404, { error: 'Not found' });
      const expectedMethod = bootstrap || (evidence && !evidence[2]) ? 'POST' : 'GET';
      if (request.method !== expectedMethod && !(roundtrip && request.method === 'POST')) {
        const response = reply(405, { error: 'Method not allowed' });
        response.headers.set('Allow', roundtrip ? 'GET, POST' : expectedMethod);
        return response;
      }
      if (
        (bootstrap || ((roundtrip || evidence) && request.method === 'POST')) &&
        (request.headers.get('Origin') !== 'https://api-test.djamespoer.com' ||
          (request.headers.has('Sec-Fetch-Site') &&
            request.headers.get('Sec-Fetch-Site') !== 'same-origin'))
      )
        return reply(403, { error: 'Access denied' });
      let authenticate;
      try {
        if (!env.IDENTITY_DB || typeof env.IDENTITY_DB.prepare !== 'function')
          throw new Error('Missing binding');
        authenticate = createAccessIdentityAdapter(
          { issuer: env.ACCESS_ISSUER, audience: env.ACCESS_AUDIENCE },
          keys,
        );
      } catch {
        return reply(503, { error: 'Service unavailable' });
      }
      try {
        const identity = await authenticate(request);
        if (ownEvidence || evidence) {
          const scope = evidence
            ? await authorizeWorkspace(env.IDENTITY_DB, identity, evidence[1], 'owner')
            : await ownStorageWorkspace(env.IDENTITY_DB, identity);
          if (ownEvidence) {
            const nonce = crypto.randomUUID();
            return new Response(
              evidencePage(scope.workspaceId).replace('<script>', `<script nonce="${nonce}">`),
              {
                headers: {
                  'Content-Type': 'text/html; charset=utf-8',
                  'Cache-Control': 'no-store',
                  'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
                  'X-Content-Type-Options': 'nosniff',
                  'Referrer-Policy': 'no-referrer',
                },
              },
            );
          }
          if (evidence?.[2] && !evidence[3])
            return reply(200, await evidenceMetadata(env.IDENTITY_DB, scope, evidence[2]));
          const binding = env.PRIVATE_ORIGINALS;
          if (!binding || typeof binding.put !== 'function' || typeof binding.get !== 'function')
            throw new Error('Storage unavailable');
          const bucket = { put: binding.put.bind(binding), get: binding.get.bind(binding) };
          if (evidence?.[2])
            return await downloadEvidence(env.IDENTITY_DB, bucket, scope, evidence[2]);
          return reply(200, await intakeEvidence(request, env.IDENTITY_DB, bucket, scope));
        }
        if (roundtrip) {
          const scope = await ownStorageWorkspace(env.IDENTITY_DB, identity);
          if (request.method === 'GET') {
            const nonce = crypto.randomUUID();
            return new Response(
              storageRoundtripPage.replace('<script>', `<script nonce="${nonce}">`),
              {
                headers: {
                  'Content-Type': 'text/html; charset=utf-8',
                  'Cache-Control': 'no-store',
                  'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
                  'X-Content-Type-Options': 'nosniff',
                  'Referrer-Policy': 'no-referrer',
                },
              },
            );
          }
          const binding = env.PRIVATE_ORIGINALS;
          if (!binding || typeof binding.put !== 'function' || typeof binding.get !== 'function')
            throw new Error('Storage unavailable');
          const bucket = { put: binding.put.bind(binding), get: binding.get.bind(binding) };
          const saved = await storeOriginal(
            env.IDENTITY_DB,
            bucket,
            scope,
            request.headers.get('Idempotency-Key') ?? '',
            new TextEncoder().encode(
              'Fictional Thingamajob TEST storage fixture. No career facts.\n',
            ),
          );
          const checked = await verifyOriginal(env.IDENTITY_DB, bucket, scope, saved.sourceId);
          return reply(200, { ...checked, replayed: saved.replayed });
        }
        if (storage || ownStorage) {
          const scope = storage
            ? await authorizeWorkspace(env.IDENTITY_DB, identity, storage[1], 'owner')
            : await ownStorageWorkspace(env.IDENTITY_DB, identity);
          return reply(200, await storageReadiness(scope, env.PRIVATE_ORIGINALS));
        }
        if (start) {
          const nonce = crypto.randomUUID();
          return new Response(testStartPage.replace('<script>', `<script nonce="${nonce}">`), {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
              'X-Content-Type-Options': 'nosniff',
              'Referrer-Policy': 'no-referrer',
            },
          });
        }
        if (bootstrap) {
          const scope = await bootstrapOwnWorkspace(env.IDENTITY_DB, identity);
          if (!scope) return reply(202, { pending: true });
          return reply(200, { workspaceId: scope.workspaceId });
        }
        const workspace = reference ? env.TEST_REFERENCE_WORKSPACE : match?.[1];
        if (!workspace) return reply(503, { error: 'Service unavailable' });
        await authorizeWorkspace(env.IDENTITY_DB, identity, workspace, 'owner');
        return reply(200, { authorized: true, operation: 'owner' });
      } catch (error) {
        if (error instanceof EvidenceInputError)
          return reply(error.status, { error: 'Invalid evidence input' });
        if (error instanceof StorageConflict) return reply(409, { error: 'Storage conflict' });
        return error instanceof AccessDenied
          ? reply(403, { error: 'Access denied' })
          : reply(503, { error: 'Service unavailable' });
      }
    },
  };
}

export default createWorker();
