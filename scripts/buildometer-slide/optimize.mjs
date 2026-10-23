import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/slide-assets/generate.mjs', 'buildometer'], {
  stdio: 'inherit',
});
