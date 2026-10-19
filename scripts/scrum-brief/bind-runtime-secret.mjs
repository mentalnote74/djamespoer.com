import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

// Cloudflare Builds secrets are build-only. Bind the existing value to the
// Worker over stdin, after a successful main build and before normal deployment.
// Never write the value to disk, command arguments, or child-process output.
if (process.env.WORKERS_CI === '1' && process.env.WORKERS_CI_BRANCH === 'main') {
  const name = 'SCRUM_BRIEF_GITHUB_TOKEN';
  const value = process.env[name];
  if (!value?.trim()) throw new Error('Required Scrum dispatch build secret is unavailable');
  const require = createRequire(import.meta.url);
  const cli = resolve(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');
  const result = spawnSync(process.execPath, [cli, 'secret', 'put', name, '--name', 'djamespoer-com'], {
    input: value,
    stdio: ['pipe', 'ignore', 'ignore'],
    timeout: 120_000,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG: 'error' },
  });
  if (result.error || result.status !== 0) {
    throw new Error('Scrum dispatch runtime secret binding failed; deployment must stop');
  }
  console.log('Scrum dispatch runtime secret binding installed (value withheld).');
}
