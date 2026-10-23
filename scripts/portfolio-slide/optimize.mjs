// Current PortfolioSlide is the conservatory; earlier screenshot-stack recipes
// remain in Git history with their archived sources.
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/slide-assets/generate.mjs', 'conservatory'], {
  stdio: 'inherit',
});
