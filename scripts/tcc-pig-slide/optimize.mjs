// Registered full-canvas export; source preparation remains scene-specific.
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/slide-assets/generate.mjs', 'tcc-pig'], {
  stdio: 'inherit',
});
