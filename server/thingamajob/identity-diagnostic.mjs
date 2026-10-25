// Operator-only, read-only diagnostics. Never returns identity or provisions records.
import {
  compactVerify,
  createRemoteJWKSet,
  customFetch,
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
} from 'jose';
import { pathToFileURL } from 'node:url';

const codes = new Set([
  'ERR_JWT_EXPIRED',
  'ERR_JWT_CLAIM_VALIDATION_FAILED',
  'ERR_JWT_INVALID',
  'ERR_JWS_INVALID',
  'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
  'ERR_JOSE_ALG_NOT_ALLOWED',
  'ERR_JOSE_NOT_SUPPORTED',
  'ERR_JWKS_TIMEOUT',
  'ERR_JWKS_NO_MATCHING_KEY',
  'ERR_JWKS_MULTIPLE_MATCHING_KEYS',
  'ERR_JWKS_INVALID',
  'ERR_JWK_INVALID',
  'ERR_JOSE_GENERIC',
]);
const messages = {
  'secure-pipe/input': 'Required input fields are missing or malformed.',
  'JSON parse': 'Input is not a valid JSON object.',
  'JWT structure': 'JWT structure or protected header is invalid.',
  'issuer validation': 'Expected issuer format or signed issuer claim is invalid.',
  'audience validation': 'Expected audience format or signed audience claim is invalid.',
  'signing-key retrieval': 'Trusted signing-key retrieval failed.',
  'signature verification': 'JWT signature verification failed.',
  'claims validation': 'Required signed human-token claims failed validation.',
  'token expiry/time validation': 'Token time validation failed.',
  'subject extraction': 'Verified human subject is missing or invalid.',
};

export function inspectJwtStructure(jwt) {
  const result = {
    inputPresent: typeof jwt === 'string' && jwt.length > 0,
    inputWithinExpectedSize: typeof jwt === 'string' && jwt.length <= 16384,
    containsInternalWhitespace: typeof jwt === 'string' && /\s/.test(jwt),
    hasExactlyThreeJwtSegments: typeof jwt === 'string' && jwt.split('.').length === 3,
    protectedHeaderDecoded: false,
    algorithmAllowed: false,
    keyIdPresent: false,
  };
  // Preserve the supplied string; even surrounding whitespace is not normalized.
  if (
    result.inputPresent &&
    result.inputWithinExpectedSize &&
    !result.containsInternalWhitespace &&
    result.hasExactlyThreeJwtSegments
  ) {
    try {
      const header = decodeProtectedHeader(jwt);
      result.protectedHeaderDecoded = true;
      result.algorithmAllowed = header.alg === 'RS256';
      result.keyIdPresent = typeof header.kid === 'string' && header.kid.length > 0;
    } catch {
      /* Boolean failure only; no header or raw error escapes. */
    }
  }
  return result;
}

export async function diagnoseIdentity(input, { keys, fetcher = fetch } = {}) {
  const report = {
    ok: false,
    stage: 'JSON parse',
    httpStatus: null,
    errorCode: null,
    message: '',
    jwtParsingBegan: false,
    signatureValidationBegan: false,
    claimsValidationBegan: false,
    structure: null,
  };
  let values, jwt, payload;
  try {
    values = JSON.parse(input);
    report.stage = 'secure-pipe/input';
    if (
      !values ||
      typeof values !== 'object' ||
      !['aud', 'issuer', 'jwt'].every((field) => typeof values[field] === 'string')
    )
      throw new Error('INPUT');
    const audience = values.aud.trim(),
      issuer = values.issuer.trim();
    jwt = values.jwt;
    report.stage = 'issuer validation';
    if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)) throw new Error('INPUT');
    report.stage = 'audience validation';
    if (!/^[a-f0-9]{64}$/.test(audience)) throw new Error('INPUT');
    report.stage = 'JWT structure';
    report.jwtParsingBegan = true;
    report.structure = inspectJwtStructure(jwt);
    if (
      !report.structure.inputPresent ||
      !report.structure.inputWithinExpectedSize ||
      report.structure.containsInternalWhitespace ||
      !report.structure.hasExactlyThreeJwtSegments ||
      !report.structure.protectedHeaderDecoded ||
      !report.structure.algorithmAllowed ||
      !report.structure.keyIdPresent
    )
      throw new Error('INPUT');
    decodeJwt(jwt); // Structure only; these unverified claims establish no authority.
    const resolver =
      keys ??
      createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs'), {
        [customFetch]: async (...args) => {
          const response = await fetcher(...args);
          report.httpStatus = response.status;
          return response;
        },
      });
    const trackedKeys = async (...args) => {
      report.stage = 'signing-key retrieval';
      const key = await resolver(...args);
      report.stage = 'signature verification';
      report.signatureValidationBegan = true;
      return key;
    };
    await compactVerify(jwt, trackedKeys, { algorithms: ['RS256'] });
    report.stage = 'claims validation';
    report.claimsValidationBegan = true;
    ({ payload } = await jwtVerify(jwt, resolver, {
      issuer,
      audience,
      algorithms: ['RS256'],
      requiredClaims: ['iss', 'aud', 'sub', 'exp', 'iat', 'type', 'email'],
    }));
    if (
      payload.type !== 'app' ||
      typeof payload.email !== 'string' ||
      !payload.email.trim() ||
      'common_name' in payload ||
      'service_token_id' in payload ||
      payload.service_token_status === true
    )
      throw new Error('INPUT');
    report.stage = 'token expiry/time validation';
    if (
      !Number.isInteger(payload.exp) ||
      !Number.isInteger(payload.iat) ||
      payload.iat > Date.now() / 1000 ||
      payload.exp <= payload.iat
    )
      throw new Error('INPUT');
    report.stage = 'subject extraction';
    if (typeof payload.sub !== 'string' || !payload.sub.trim() || payload.sub.length > 200)
      throw new Error('INPUT');
    report.ok = true;
    report.message = 'Signed human identity checks passed; identity values are not returned.';
  } catch (error) {
    report.errorCode = codes.has(error?.code) ? error.code : 'LOCAL_DIAGNOSTIC_FAILURE';
    if (report.claimsValidationBegan) {
      if (
        error?.code === 'ERR_JWT_EXPIRED' ||
        (error?.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' &&
          ['exp', 'iat', 'nbf'].includes(error.claim))
      )
        report.stage = 'token expiry/time validation';
      else if (error?.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' && error.claim === 'iss')
        report.stage = 'issuer validation';
      else if (error?.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' && error.claim === 'aud')
        report.stage = 'audience validation';
    }
    // Never pass through error.message, stack, claims, URLs, token or provider bodies.
    report.message = messages[report.stage];
  } finally {
    input = '';
    values = null;
    jwt = null;
    payload = null;
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 32768) {
      input = '';
      break;
    }
  }
  const report = await diagnoseIdentity(input);
  input = '';
  console.log(JSON.stringify(report));
  process.exitCode = report.ok ? 0 : 1;
}
