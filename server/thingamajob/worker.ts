import { resolveBaselineIssue } from './baseline-service.ts';
import { AccessDenied, createAccessIdentityAdapter } from './access-identity.ts';
import { stageExtractionRun, getExtractionRun } from './extraction-staging.ts';
import { authorizeWorkspace, recheckWorkspace } from './workspace-access.ts';
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
import {
  intakeEvidence,
  evidenceMetadata,
  downloadEvidence,
  listEvidence,
} from './evidence-service.ts';
import {
  createProposal,
  reviewProposal,
  getProposal,
  AssertionInputError,
  ReviewConflict,
} from './assertion-service.ts';
import { assertionPage } from './assertion-page.ts';
import { unknownPage } from './unknown-page.ts';
import { verificationPage } from './verification-page.ts';
import { boundedBytes } from './evidence-validation.ts';
import { supersedeClaim } from './claim-lifecycle.ts';
import { workflowSnapshot } from './workflow-snapshot.ts';
import { canonicalTruth } from './canonical-truth.ts';
import {
  createUnknown,
  answerUnknown,
  proposeUnknownAnswer,
  resolveUnknown,
  getUnknown,
  listUnknowns,
  UnknownInputError,
  UnknownConflict,
} from './unknown-service.ts';

export interface WorkerEnvironment {
  ACCESS_ISSUER: string;
  ACCESS_AUDIENCE: string;
  IDENTITY_DB: IdentityDatabase;
  TEST_BOOTSTRAP_ENABLED?: string;
  TEST_REFERENCE_WORKSPACE?: string;
  PRIVATE_ORIGINALS?: PrivateOriginals & Partial<OriginalBucket>;
  TEST_VERIFICATION?: { fetch(request: Request): Promise<Response> };
  TEST_UI?: { fetch(request: Request): Promise<Response> };
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
      const ownAssertions = path === '/api/thingamajob/test/assertions';
      const ownUnknowns = path === '/api/thingamajob/test/unknowns';
      const verification = path === '/api/thingamajob/test/two-client-verification';
      const workflow = path === '/api/thingamajob/test/workflow';
      const truth = path === '/api/thingamajob/test/truth';
      const uiPrefix = '/api/thingamajob/test/app/';
      const ui = path === uiPrefix.slice(0, -1) || path.startsWith(uiPrefix);
      const extraction = testEnabled
        ? /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/extraction-runs\/([a-zA-Z0-9_-]{1,100})(\/resolve)?$/.exec(
            path,
          )
        : null;
      const unknowns = testEnabled
        ? /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/unknowns(?:\/([a-zA-Z0-9_-]{1,100})(?:\/(answers|resolve)(?:\/([a-zA-Z0-9_-]{1,100})\/proposal)?)?)?$/.exec(
            path,
          )
        : null;
      if (unknowns?.[3] === 'resolve' && unknowns[4]) return reply(404, { error: 'Not found' });
      const claims = testEnabled
        ? /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/claims\/([a-zA-Z0-9_-]{1,100})\/(supersede|corrections)$/.exec(
            path,
          )
        : null;
      const assertions = testEnabled
        ? /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/assertions(?:\/([a-zA-Z0-9_-]{1,100})(\/review)?)?$/.exec(
            path,
          )
        : null;
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
        !extraction &&
        !storage &&
        !evidence &&
        !assertions &&
        !claims &&
        !unknowns &&
        !(
          testEnabled &&
          (start ||
            bootstrap ||
            reference ||
            ownStorage ||
            roundtrip ||
            ownEvidence ||
            ownAssertions ||
            ownUnknowns ||
            verification ||
            workflow ||
            truth ||
            ui)
        )
      )
        return reply(404, { error: 'Not found' });
      const expectedMethod =
        bootstrap ||
        claims ||
        (evidence && !evidence[2]) ||
        (assertions && (!assertions[2] || assertions[3])) ||
        (unknowns && (!unknowns[2] || unknowns[3]))
          ? 'POST'
          : 'GET';
      if (
        request.method !== expectedMethod &&
        !(roundtrip && request.method === 'POST') &&
        !(verification && request.method === 'POST') &&
        !(extraction && request.method === 'POST') &&
        !(evidence && !evidence[2] && request.method === 'GET') &&
        !(unknowns && !unknowns[2] && request.method === 'GET')
      ) {
        const response = reply(405, { error: 'Method not allowed' });
        response.headers.set(
          'Allow',
          extraction ||
            roundtrip ||
            verification ||
            (evidence && !evidence[2]) ||
            (unknowns && !unknowns[2])
            ? 'GET, POST'
            : expectedMethod,
        );
        return response;
      }
      if (
        (bootstrap ||
          ((extraction ||
            roundtrip ||
            verification ||
            evidence ||
            assertions ||
            unknowns ||
            claims) &&
            request.method === 'POST')) &&
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
        if (extraction) {
          const scope = await authorizeWorkspace(env.IDENTITY_DB, identity, extraction[1], 'owner');
          if (extraction[3]) {
            if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });
            return reply(
              200,
              await resolveBaselineIssue(request, env.IDENTITY_DB, scope, extraction[2]),
            );
          }
          if (request.method === 'GET')
            return reply(200, await getExtractionRun(env.IDENTITY_DB, scope, extraction[2]));
          const binding = env.PRIVATE_ORIGINALS;
          if (!binding || typeof binding.put !== 'function' || typeof binding.get !== 'function')
            return reply(503, { error: 'Storage unavailable' });
          return reply(
            200,
            await stageExtractionRun(
              request,
              env.IDENTITY_DB,
              { put: binding.put.bind(binding), get: binding.get.bind(binding) },
              scope,
              extraction[2],
            ),
          );
        }
        if (ui) {
          if (!env.TEST_UI) return reply(503, { error: 'Presentation unavailable' });
          if (path === uiPrefix.slice(0, -1))
            return Response.redirect(new URL(uiPrefix, request.url), 302);
          const assetPath = path.slice(uiPrefix.length);
          if (
            assetPath.includes('..') ||
            !/^(?:[a-zA-Z0-9_-]+\.(?:js|css|woff2|ico)|index\.html)?$/.test(assetPath)
          )
            return reply(404, { error: 'Not found' });
          const url = new URL(request.url);
          url.pathname = '/' + (assetPath || 'index.html');
          url.search = '';
          const asset = await env.TEST_UI.fetch(new Request(url, { method: 'GET' }));
          const headers = new Headers(asset.headers);
          headers.set('Cache-Control', 'no-store');
          headers.set('X-Content-Type-Options', 'nosniff');
          headers.set('Referrer-Policy', 'no-referrer');
          headers.set('X-Robots-Tag', 'noindex, nofollow');
          headers.set(
            'Content-Security-Policy',
            "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          );
          return new Response(asset.body, { status: asset.status, headers });
        }
        if (claims) {
          const scope = await authorizeWorkspace(env.IDENTITY_DB, identity, claims[1], 'owner');
          return reply(
            200,
            claims[3] === 'corrections'
              ? await createProposal(request, env.IDENTITY_DB, scope, undefined, claims[2])
              : await supersedeClaim(request, env.IDENTITY_DB, scope, claims[2]),
          );
        }
        if (truth) {
          const scope = await ownStorageWorkspace(env.IDENTITY_DB, identity);
          return reply(200, await canonicalTruth(env.IDENTITY_DB, scope));
        }
        if (workflow) {
          const scope = await ownStorageWorkspace(env.IDENTITY_DB, identity);
          return reply(200, await workflowSnapshot(env.IDENTITY_DB, scope));
        }
        if (verification) {
          const scope = await ownStorageWorkspace(env.IDENTITY_DB, identity);
          await recheckWorkspace(scope);
          if (!env.TEST_VERIFICATION) return reply(503, { error: 'Verification unavailable' });
          if (request.method === 'GET') {
            const nonce = crypto.randomUUID();
            return new Response(verificationPage.replace('<script>', `<script nonce="${nonce}">`), {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
                'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
                'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'no-referrer',
              },
            });
          }
          if (request.body && (await boundedBytes(request.body, 1)).length)
            return reply(400, { error: 'Verification accepts no arguments' });
          const response = await env.TEST_VERIFICATION.fetch(
            new Request('https://verification.internal/run', { method: 'POST' }),
          );
          await recheckWorkspace(scope);
          if (response.status !== 200)
            return reply(503, {
              error: 'Verification unavailable; operator inspection may be required',
            });
          return reply(200, await response.json());
        }
        if (ownUnknowns || unknowns) {
          const scope = unknowns
            ? await authorizeWorkspace(env.IDENTITY_DB, identity, unknowns[1], 'owner')
            : await ownStorageWorkspace(env.IDENTITY_DB, identity);
          if (ownUnknowns) {
            const nonce = crypto.randomUUID();
            return new Response(
              unknownPage(scope.workspaceId).replace('<script>', `<script nonce="${nonce}">`),
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
          if (!unknowns?.[2])
            return reply(
              200,
              request.method === 'GET'
                ? await listUnknowns(env.IDENTITY_DB, scope)
                : await createUnknown(request, env.IDENTITY_DB, scope),
            );
          if (unknowns[3] === 'resolve')
            return reply(200, await resolveUnknown(request, env.IDENTITY_DB, scope, unknowns[2]));
          if (unknowns[3] === 'answers')
            return reply(
              200,
              unknowns[4]
                ? await proposeUnknownAnswer(
                    request,
                    env.IDENTITY_DB,
                    scope,
                    unknowns[2],
                    unknowns[4],
                  )
                : await answerUnknown(request, env.IDENTITY_DB, scope, unknowns[2]),
            );
          return reply(200, await getUnknown(env.IDENTITY_DB, scope, unknowns[2]));
        }
        if (ownAssertions || assertions) {
          const scope = assertions
            ? await authorizeWorkspace(env.IDENTITY_DB, identity, assertions[1], 'owner')
            : await ownStorageWorkspace(env.IDENTITY_DB, identity);
          if (ownAssertions) {
            const nonce = crypto.randomUUID();
            return new Response(
              assertionPage(scope.workspaceId).replace('<script>', `<script nonce="${nonce}">`),
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
          if (assertions?.[3])
            return reply(200, await reviewProposal(request, env.IDENTITY_DB, scope, assertions[2]));
          if (assertions?.[2])
            return reply(200, await getProposal(env.IDENTITY_DB, scope, assertions[2]));
          return reply(200, await createProposal(request, env.IDENTITY_DB, scope));
        }
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
          if (evidence && !evidence[2] && request.method === 'GET')
            return reply(200, await listEvidence(env.IDENTITY_DB, scope));
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
        if (error instanceof UnknownInputError)
          return reply(400, { error: 'Invalid UNKNOWN input' });
        if (error instanceof UnknownConflict) return reply(409, { error: 'UNKNOWN conflict' });
        if (error instanceof AssertionInputError)
          return reply(400, { error: 'Invalid assertion input' });
        if (error instanceof ReviewConflict) return reply(409, { error: 'Review conflict' });
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
