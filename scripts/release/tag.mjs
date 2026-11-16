import { execFileSync } from 'node:child_process';
import { releaseIdentity } from './identity.mjs';

// Runs in GitHub Actions on every push to main, the same push Workers Builds deploys.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const { version, commit } = releaseIdentity({ run: git });
if (!version) throw new Error('Cannot count today’s releases: history is incomplete.');

const tag = `v${version}`;
const existing = execFileSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], {
  encoding: 'utf8',
}).trim();
if (existing) {
  if (!existing.startsWith(commit)) throw new Error(`${tag} already points at another commit.`);
  console.log(`${tag} already tags ${commit}.`);
} else {
  git('tag', tag, commit);
  git('push', 'origin', `refs/tags/${tag}`);
  console.log(`Tagged ${commit} as ${tag}.`);
}
