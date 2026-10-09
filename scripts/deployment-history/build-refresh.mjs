import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createCloudflareBuildAcquisition } from './cloudflare-build-history.mjs';
import { generateSnapshot } from './snapshot.mjs';

const defaultOutput = fileURLToPath(
  new URL('../../public/data/deployment-history.json', import.meta.url),
);

/** Build-time refresh only. Local compilation never implicitly makes authenticated reads. */
export async function refreshHistoryForBuild({
  environment = process.env,
  output = defaultOutput,
  createAcquisition = createCloudflareBuildAcquisition,
  now,
} = {}) {
  if (environment.WORKERS_CI === undefined) return { mode: 'local', refreshed: false };
  if (
    environment.WORKERS_CI !== '1' ||
    typeof environment.WORKERS_CI_BRANCH !== 'string' ||
    !environment.WORKERS_CI_BRANCH.trim() ||
    environment.WORKERS_CI_BRANCH !== environment.WORKERS_CI_BRANCH.trim()
  ) {
    throw new Error('Cloudflare build context is unavailable or unsupported.');
  }
  if (environment.WORKERS_CI_BRANCH !== 'main') return { mode: 'preview', refreshed: false };

  // A separate read-only secret must not replace or broaden Wrangler's deployment token.
  if (
    typeof environment.CLOUDFLARE_ACCOUNT_ID !== 'string' ||
    !/^[0-9a-f]{32}$/.test(environment.CLOUDFLARE_ACCOUNT_ID) ||
    typeof environment.DEPLOYMENT_HISTORY_READ_TOKEN !== 'string' ||
    !environment.DEPLOYMENT_HISTORY_READ_TOKEN.trim()
  ) {
    throw new Error(
      'Production history refresh requires build-only Cloudflare read configuration.',
    );
  }
  const snapshot = await generateSnapshot(output, {
    acquire: createAcquisition({
      accountId: environment.CLOUDFLARE_ACCOUNT_ID,
      getToken: () => environment.DEPLOYMENT_HISTORY_READ_TOKEN,
    }),
    ...(now ? { now } : {}),
  });
  return {
    mode: 'production',
    refreshed: true,
    rowCount: snapshot.rows.length,
    checkedAt: snapshot.checkedAt,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await refreshHistoryForBuild();
    console.log(
      result.refreshed
        ? `Build history refreshed: ${result.rowCount} sanitized rows, checked ${result.checkedAt}.`
        : `${result.mode === 'local' ? 'Local' : 'Preview'} build: using the existing history snapshot; no refresh requested.`,
    );
  } catch {
    // No causes, provider fields, credential values, or untrusted error text in build logs.
    console.error(
      'Production history refresh failed; build stopped. Existing snapshot was not replaced by failed acquisition.',
    );
    process.exitCode = 1;
  }
}
