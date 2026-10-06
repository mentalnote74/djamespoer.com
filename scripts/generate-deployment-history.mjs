import { fileURLToPath } from 'node:url';
import { createCloudflareBuildAcquisition } from './deployment-history/cloudflare-build-history.mjs';
import { generateSnapshot } from './deployment-history/snapshot.mjs';

const output = fileURLToPath(new URL('../public/data/deployment-history.json', import.meta.url));
try {
  const snapshot = await generateSnapshot(output, {
    acquire: createCloudflareBuildAcquisition({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      getToken: () => process.env.CLOUDFLARE_API_TOKEN,
    }),
  });
  console.log(
    `Verified deployment snapshot: ${snapshot.rows.length} rows, checked ${snapshot.checkedAt}.`,
  );
} catch (error) {
  console.error(
    error.lastKnownGoodAvailable
      ? 'Deployment snapshot generation failed; verified existing snapshot preserved.'
      : 'Deployment snapshot generation failed; no valid existing snapshot is available.',
  );
  process.exitCode = 1;
}
