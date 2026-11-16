import { execFileSync } from 'node:child_process';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** Calendar day of an instant in Eastern time, as `YYYY.MM.DD`. */
export function easternDay(instant) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(instant))
    .replaceAll('-', '.');
}

/**
 * Date-based release version for the newest commit in `dates` (first-parent
 * committer dates, newest first). Every push to main deploys, so the Nth main
 * commit of an Eastern day is that day's Nth release: `2026.11.16-2`.
 * Returns null when the history is cut off before the day began, because the
 * count would then be a guess.
 */
export function versionFor(dates, complete) {
  const day = easternDay(dates[0]);
  const sameDay = dates.findIndex((date) => easternDay(date) !== day);
  if (sameDay === -1 && !complete) return null;
  return `${day}-${sameDay === -1 ? dates.length : sameDay}`;
}

export function buildChannel(env) {
  if (env.WORKERS_CI !== '1') return 'local';
  return env.WORKERS_CI_BRANCH === 'main' ? 'production' : 'preview';
}

/** Version and commit of the checkout being built. Same answer in CI and in the tag workflow. */
export function releaseIdentity({ env = process.env, run = git, now = new Date() } = {}) {
  const shallow = () => run('rev-parse', '--is-shallow-repository') === 'true';
  if (shallow()) {
    try {
      run('fetch', '--quiet', '--unshallow');
    } catch {
      // Keep the shallow history; versionFor reports null if it can't count.
    }
  }
  const commit = run('rev-parse', 'HEAD');
  const dates = run('log', '--first-parent', '--format=%cI', '-n', '500', 'HEAD').split('\n');
  return {
    version: versionFor(dates, !shallow() && dates.length < 500),
    commit,
    shortCommit: commit.slice(0, 7),
    channel: buildChannel(env),
    builtAt: now.toISOString(),
  };
}
