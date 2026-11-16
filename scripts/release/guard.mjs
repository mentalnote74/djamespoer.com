import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Prebuild rewrites these on every build, so they never mean someone has unreviewed work.
const REGENERATED = ['src/app/generated/'];
// What the production build and the Worker read. Scratch folders outside these never ship.
const SHIPPED = [
  'src',
  'public',
  'server',
  'scripts',
  'angular.json',
  'package.json',
  'package-lock.json',
  'wrangler.jsonc',
  'tsconfig.json',
  'tsconfig.app.json',
];

/** Paths from `git status --porcelain` that would ship without being committed. */
export function uncommitted(porcelain) {
  return porcelain
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ''))
    .filter((path) => !REGENERATED.some((prefix) => path.startsWith(prefix)));
}

/** Refuse a manual production deploy unless the checkout is exactly what main says ships. */
export function guardDeploy(git) {
  git('fetch', '--quiet', 'origin', 'main');
  const dirty = uncommitted(
    git('status', '--porcelain', '--untracked-files=all', '--', ...SHIPPED),
  );
  if (dirty.length) {
    return `Refusing to deploy: these files are not committed and would ship anyway:\n  ${dirty.join('\n  ')}\nCommit them, stash them or move them out of the checkout first.`;
  }
  try {
    git('merge-base', '--is-ancestor', 'HEAD', 'origin/main');
  } catch {
    return 'Refusing to deploy: HEAD is not on origin/main. Merge the work to main first; production ships only from main.';
  }
  return null;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problem = guardDeploy((...args) =>
    execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
  );
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  console.log('Deploy guard: clean checkout on origin/main.');
}
