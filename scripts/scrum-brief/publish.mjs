import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { generate } from './generate.mjs';
const run = (command, args, extra = {}) =>
  execFileSync(command, args, { stdio: 'inherit', ...extra });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const files = [
  'src/app/components/daily-scrum-brief/brief.generated.ts',
  'public/data/product-journal.json',
];
try {
  if (
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    process.env.GITHUB_REPOSITORY !== 'mentalnote74/djamespoer.com'
  )
    throw Error('Publication requires the main-only GitHub workflow');
  // Do not carry an unconfirmed older release candidate forward as published history.
  const prior = JSON.parse(await readFile(files[1], 'utf8'));
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const liveResponse = await fetch(
    'https://djamespoer.com/data/product-journal.json?verify=' + git('rev-parse', 'HEAD'),
    { cache: 'no-store', signal: AbortSignal.timeout(15000) },
  );
  if (!liveResponse.ok) throw Error('Current published journal unavailable; no history advanced.');
  const live = await liveResponse.json();
  if (prior.latestDate < today && live.latestDate !== prior.latestDate)
    throw Error(
      'Earlier journal candidate was not confirmed live; resolve its Workers Builds failure before advancing history.',
    );
  const brief = await generate();
  run('npm', ['run', 'build']);
  run('git', ['restore', '--', 'src/app/generated/build-info.ts']);
  const changed = git('diff', '--name-only', '--', ...files);
  if (changed) {
    run('git', ['config', 'user.name', 'github-actions[bot]']);
    run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
    run('git', ['add', '--', ...files]);
    const staged = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
    if (staged.some((path) => !files.includes(path)))
      throw Error('Unexpected staged publication file');
    run('git', ['commit', '-m', 'Publish Daily Scrum Brief ' + brief.date]);
    run('git', ['push', 'origin', 'HEAD:main']);
  } else console.log('Same-day publication already current; no duplicate commit.');
  const sha = git('rev-parse', 'HEAD');
  const hash = (data) => createHash('sha256').update(data).digest('hex');
  const expected = hash(await readFile(files[1]));
  let published = false;
  const deadline = Date.now() + 600_000;
  for (let attempt = 0; attempt < 40 && Date.now() < deadline; attempt++) {
    try {
      const response = await fetch(
        'https://djamespoer.com/data/product-journal.json?release=' + sha,
        { cache: 'no-store', signal: AbortSignal.timeout(15000) },
      );
      if (response.ok && hash(Buffer.from(await response.arrayBuffer())) === expected) {
        published = true;
        break;
      }
    } catch {
      /* Transient polling errors never change committed journal content. */
    }
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  if (!published)
    throw Error(
      'Cloudflare publication not confirmed within ten minutes; inspect the content commit Workers Builds check, then rerun this workflow. Last successful site remains live.',
    );
  console.log('Published and verified Daily Scrum Brief ' + brief.date + ' at commit ' + sha);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `Published **${brief.date}**. Commit: ${sha}. [Journal](https://djamespoer.com/product-journal/${brief.date}).\n`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Publication failed');
  process.exitCode = 1;
}
