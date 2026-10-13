import { AccessDenied, createAccessIdentityAdapter } from './access-identity.ts';
import { authorizeWorkspace } from './workspace-access.ts';
import type { IdentityDatabase } from './workspace-access.ts';
import type { JWTVerifyGetKey } from 'jose';

export interface WorkerEnvironment {
  ACCESS_ISSUER: string;
  ACCESS_AUDIENCE: string;
  IDENTITY_DB: IdentityDatabase;
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
      const match = /^\/api\/thingamajob\/workspaces\/([a-zA-Z0-9_-]{1,100})\/access$/.exec(path);
      if (!match) return reply(404, { error: 'Not found' });
      if (request.method !== 'GET') {
        const response = reply(405, { error: 'Method not allowed' });
        response.headers.set('Allow', 'GET');
        return response;
      }
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
        await authorizeWorkspace(env.IDENTITY_DB, identity, match[1], 'owner');
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
