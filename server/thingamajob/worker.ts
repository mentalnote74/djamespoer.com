import { AccessDenied, createAccessIdentityAdapter } from './access-identity.ts';
import { authorizeWorkspace } from './workspace-access.ts';
import type { IdentityDatabase } from './workspace-access.ts';
import type { JWTVerifyGetKey } from 'jose';
import { bootstrapOwnWorkspace } from './self-workspace.ts';
import { testStartPage } from './test-start.ts';
import { ownStorageWorkspace, storageReadiness } from './storage-readiness.ts';
import type { PrivateOriginals } from './storage-readiness.ts';

export interface WorkerEnvironment {
  ACCESS_ISSUER: string;
  ACCESS_AUDIENCE: string;
  IDENTITY_DB: IdentityDatabase;
  TEST_BOOTSTRAP_ENABLED?: string;
  TEST_REFERENCE_WORKSPACE?: string;
  PRIVATE_ORIGINALS?: PrivateOriginals;
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
      const storage = testEnabled
        ? /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/storage$/.exec(path)
        : null;
      const match = /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/access$/.exec(path);
      if (!match && !storage && !(testEnabled && (start || bootstrap || reference || ownStorage)))
        return reply(404, { error: 'Not found' });
      const expectedMethod = bootstrap ? 'POST' : 'GET';
      if (request.method !== expectedMethod) {
        const response = reply(405, { error: 'Method not allowed' });
        response.headers.set('Allow', expectedMethod);
        return response;
      }
      if (
        bootstrap &&
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
        return error instanceof AccessDenied
          ? reply(403, { error: 'Access denied' })
          : reply(503, { error: 'Service unavailable' });
      }
    },
  };
}

export default createWorker();
