import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { projectMeasurement, applyProject } from '../../server/buildometer/project.ts';
import { emptyData } from '../../server/buildometer/derive.ts';
import { verifiedRelease } from '../buildometer/reconcile.mjs';
import { jiraReader } from './generate.mjs';

export const reconciliationPath = 'public/data/buildometer-reconciliation.json';
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const projectionOnly = (path) =>
  /^(docs\/|AI_HANDOFF\.md$)/.test(path) ||
  [
    'scripts/buildometer/project-ledger.json',
    'scripts/buildometer/release-evidence.json',
    'public/data/buildometer-project.json',
    'public/data/buildometer-release.json',
    'public/data/buildometer-reconciliation.json',
    'server/buildometer/project-members.generated.ts',
    'src/app/generated/buildometer-summary.ts',
  ].includes(path);

/** Ordering boundary: failures retain approved values, never become fresh observations. */
export async function reconciliationBeforeBrief({
  readApproved,
  reconcile,
  compose,
  save,
  now = () => new Date(),
}) {
  const approved = await readApproved(); // Invalid canonical evidence blocks publication entirely.
  let result;
  try {
    result = await reconcile(approved);
    if (!['checked', 'pending'].includes(result?.status)) throw Error('Invalid check result');
  } catch {
    result = {
      status: 'failed',
      reason: 'Canonical reconciliation check failed; last approved numbers retained.',
    };
  }
  const receipt = { schemaVersion: 1, checkedAt: now().toISOString(), ...approved, ...result };
  await save(receipt);
  return compose(receipt);
}

export async function runBeforeBrief(compose) {
  let ledger;
  return reconciliationBeforeBrief({
    readApproved: async () => {
      ledger = await json('scripts/buildometer/project-ledger.json');
      const p = projectMeasurement(ledger),
        current = p.observations.at(-1);
      const data = emptyData(p.observedAt);
      applyProject(data, p);
      return {
        scope: 'Approved djamespoer.com ledger only',
        observedAt: p.observedAt,
        shipped: current.shipped,
        total: current.total,
        remaining: current.remaining,
        percent: data.metrics.completion.value,
      };
    },
    reconcile: async () => {
      const evidence = await json('scripts/buildometer/release-evidence.json');
      const release = verifiedRelease(evidence);
      const members = ledger.observations.at(-1).members;
      const read = jiraReader();
      const jql = 'key in (' + members.map((m) => m.key).join(',') + ')';
      const page = await read(
        '/search/jql?' +
          new URLSearchParams({ jql, fields: 'status,customfield_10016', maxResults: '100' }),
      );
      if (
        !Array.isArray(page.issues) ||
        page.isLast === false ||
        page.issues.length !== members.length
      )
        throw Error('Incomplete approved-scope inventory');
      const rows = new Map(page.issues.map((i) => [i.key, i]));
      if (rows.size !== members.length) throw Error('Duplicate inventory');
      const pending = members
        .filter(
          (m) =>
            !rows.has(m.key) ||
            rows.get(m.key).fields.customfield_10016 !== m.points ||
            (!m.shipped && rows.get(m.key).fields.status.name === 'Done'),
        )
        .map((m) => m.key);
      // Reuse the canonical projector: no new calculator, append or approval bypass.
      execFileSync(process.execPath, ['scripts/buildometer/project.mjs'], { stdio: 'inherit' });
      let newerRecordedRelease = false;
      try {
        execFileSync(
          process.execPath,
          ['scripts/buildometer/reconcile.mjs', 'release-check', '--strict', 'true'],
          { stdio: 'inherit' },
        );
      } catch (error) {
        if (error.status !== 2) throw error;
        newerRecordedRelease = true;
      }
      const response = await fetch('https://djamespoer.com/data/buildometer-release.json', {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
      if (!response.ok) throw Error('Production receipt unavailable');
      const live = await response.json();
      if (!/^[a-f0-9]{40}$/.test(live.sha)) throw Error('Invalid production receipt');
      execFileSync('git', ['merge-base', '--is-ancestor', live.sha, 'HEAD']);
      const paths = execFileSync('git', ['diff', '--name-only', release.sha, live.sha], {
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter(Boolean);
      const unreviewedRelease = paths.some((path) => !projectionOnly(path));
      return {
        status: pending.length || newerRecordedRelease || unreviewedRelease ? 'pending' : 'checked',
        reason:
          pending.length || newerRecordedRelease || unreviewedRelease
            ? 'Pending approval/release reconciliation; last approved numbers retained. No new shipped credit inferred from Jira Done.'
            : 'Approved scope recalculated and checked; no new observation required.',
        pendingKeys: pending,
        productionSha: live.sha,
        newerRecordedRelease,
        unreviewedRelease,
      };
    },
    save: async (receipt) => {
      await writeFile(reconciliationPath, JSON.stringify(receipt, null, 2) + '\n');
      console.log('Daily reconciliation: ' + receipt.status + '; observed ' + receipt.observedAt);
      if (process.env.GITHUB_STEP_SUMMARY)
        await appendFile(
          process.env.GITHUB_STEP_SUMMARY,
          `Buildometer check: **${receipt.status}**, checked ${receipt.checkedAt}; approved ${receipt.shipped}/${receipt.total} (${receipt.percent}%), observed ${receipt.observedAt}. ${receipt.reason}\n`,
        );
    },
    compose,
  });
}
