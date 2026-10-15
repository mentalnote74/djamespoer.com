import { readPublishedHistory } from './published-history.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createProductionDeploymentAcquisition } from './production-deployments.mjs';
import { generateSnapshot } from './snapshot.mjs';
import { validateDeploymentSnapshot } from './load-adapter.mjs';

/** Explicit manual-release preparation; never runs during ordinary local/preview builds. */
export async function refreshProductionDeployments({
  environment = process.env,
  output = fileURLToPath(new URL('../../public/data/deployment-history.json', import.meta.url)),
  createAcquisition = createProductionDeploymentAcquisition,
  acquireArchive = readPublishedHistory,
  now,
} = {}) {
  const prior = JSON.parse(await readFile(output, 'utf8'));
  if (!validateDeploymentSnapshot(prior).ok) throw new Error('Invalid existing history snapshot.');
  const acquire = createAcquisition({
    accountId: environment.CLOUDFLARE_ACCOUNT_ID,
    getToken: () => environment.DEPLOYMENT_HISTORY_READ_TOKEN,
  });
  return generateSnapshot(output, {
    acquireArchive,
    acquire: async () => {
      const recent = await acquire();
      const archive = new Map(prior.rows.map((row) => [row.id, row]));
      recent.forEach((row) => archive.set(row.id, row));
      return [...archive.values()].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
      );
    },
    ...(now ? { now } : {}),
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const snapshot = await refreshProductionDeployments();
    console.log(`Production history refreshed: ${snapshot.rows.length} sanitized records.`);
  } catch {
    console.error(
      'Production history refresh failed; deployment must stop. Existing history preserved.',
    );
    process.exitCode = 1;
  }
}
