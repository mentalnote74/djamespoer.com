import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';

export class AccessDenied extends Error {
  constructor() {
    super('Access denied');
  }
}
export interface HumanIdentity {
  readonly issuer: string;
  readonly subject: string;
  readonly expiresAt: number;
}
const verified = new WeakSet<object>();
export function assertHumanIdentity(identity: HumanIdentity): void {
  if (!verified.has(identity) || identity.expiresAt <= Date.now() / 1000) throw new AccessDenied();
}
export interface AccessConfiguration {
  readonly issuer: string;
  readonly audience: string;
}
/** Configuration/key resolver are trusted server construction inputs, never request data. */
export function createAccessIdentityAdapter(config: AccessConfiguration, keys?: JWTVerifyGetKey) {
  if (
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.issuer) ||
    !/^[a-f0-9]{64}$/.test(config.audience)
  )
    throw new Error('Invalid Access configuration');
  const { issuer, audience } = config;
  const resolver = keys ?? createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs'));
  return async (request: Request): Promise<HumanIdentity> => {
    try {
      const token = request.headers.get('Cf-Access-Jwt-Assertion');
      if (!token || token.length > 16384) throw new AccessDenied();
      const { payload, protectedHeader } = await jwtVerify(token, resolver, {
        issuer,
        audience,
        algorithms: ['RS256'],
        requiredClaims: ['iss', 'aud', 'sub', 'exp', 'iat', 'type', 'email'],
      });
      if (
        !protectedHeader.kid ||
        payload.type !== 'app' ||
        typeof payload.sub !== 'string' ||
        !payload.sub.trim() ||
        payload.sub.length > 200 ||
        typeof payload.email !== 'string' ||
        !payload.email.trim() ||
        'common_name' in payload ||
        'service_token_id' in payload ||
        payload.service_token_status === true ||
        !Number.isInteger(payload.exp) ||
        !Number.isInteger(payload.iat) ||
        payload.iat! > Date.now() / 1000 ||
        payload.exp! <= payload.iat!
      )
        throw new AccessDenied();
      // Email is a signed human-token check, never the actor/workspace lookup key.
      const identity = Object.freeze({ issuer, subject: payload.sub, expiresAt: payload.exp! });
      verified.add(identity);
      return identity;
    } catch {
      // Never expose JWTs, subjects, email, key-fetch errors, or provider diagnostics.
      throw new AccessDenied();
    }
  };
}
