import { readFile, writeFile, appendFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  projectMeasurement,
  applyProject,
  sameSnapshot,
} from '../../server/buildometer/project.ts';
import { emptyData } from '../../server/buildometer/derive.ts';
import { jiraReader } from './generate.mjs';

export const reconciliationPath = 'public/data/buildometer-reconciliation.json';
export const ledgerPath = 'scripts/buildometer/project-ledger.json';
/** Files the daily recalculation may change; the publisher commits them with the journal. */
export const observationFiles = [
  ledgerPath,
  'public/data/buildometer-project.json',
  'server/buildometer/project-members.generated.ts',
  'src/app/generated/buildometer-summary.ts',
];
const ESTIMATE = 'customfield_10016';
const POINTS = [0, 1, 2, 3, 5, 8, 13];
const VOID = /won'?t|duplicate|cannot|declined|obsolete/i;
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));

/**
 * SCRUM-213: today's known scope and shipped credit, recalculated from Jira.
 * Scope: estimated non-epic, non-subtask issues that are not parked or explicitly excluded.
 * Points: the Jira estimate (an existing member keeps its last estimate if Jira has none).
 * Shipped: the Done status category. Earlier shipped credit is never revoked.
 */
export function recalculateMembers(previous, issues, exclusions = {}) {
  const excluded = new Set(Object.values(exclusions).filter(Array.isArray).flat());
  const members = new Map(previous.map((m) => [m.key, { ...m }]));
  for (const issue of issues) {
    const f = issue.fields ?? {};
    const points = POINTS.includes(f[ESTIMATE]) ? f[ESTIMATE] : null;
    const done = f.status?.statusCategory?.key === 'done' && !VOID.test(f.resolution?.name ?? '');
    const current = members.get(issue.key);
    if (current) {
      if (points !== null) current.points = points;
      if (done && !current.shipped)
        Object.assign(current, { shipped: true, disposition: 'shipped' });
      continue;
    }
    const type = f.issuetype ?? {};
    if (
      excluded.has(issue.key) ||
      type.subtask ||
      type.name === 'Epic' ||
      (f.labels ?? []).includes('parked') ||
      points === null ||
      !String(f.summary ?? '').trim() ||
      (f.status?.statusCategory?.key === 'done' && !done)
    )
      continue;
    members.set(issue.key, {
      key: issue.key,
      title: String(f.summary).trim(),
      points,
      shipped: done,
      disposition: done ? 'shipped' : 'open',
    });
  }
  return [...members.values()].sort(
    (a, b) => Number(a.key.split('-')[1]) - Number(b.key.split('-')[1]),
  );
}

const summarize = (ledger) => {
  const p = projectMeasurement(ledger),
    current = p.observations.at(-1);
  const data = emptyData(p.observedAt);
  applyProject(data, p);
  return {
    observedAt: p.observedAt,
    shipped: current.shipped,
    total: current.total,
    remaining: current.remaining,
    percent: data.metrics.completion.value,
  };
};

async function readAllIssues(read) {
  const issues = [];
  let token;
  do {
    const page = await read(
      '/search/jql?' +
        new URLSearchParams({
          jql: 'project = SCRUM ORDER BY key ASC',
          fields: `summary,status,issuetype,labels,resolution,${ESTIMATE}`,
          maxResults: '100',
          ...(token ? { nextPageToken: token } : {}),
        }),
    );
    if (!Array.isArray(page.issues)) throw Error('Invalid Jira inventory page');
    issues.push(...page.issues);
    token = page.isLast === false ? page.nextPageToken : undefined;
    if (page.isLast === false && !token) throw Error('Incomplete Jira inventory');
  } while (token);
  if (!issues.length) throw Error('Empty Jira inventory');
  return issues;
}

/** Ordering boundary: failures retain the last observation, never become fresh ones. */
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
    if (!['observed', 'checked', 'pending'].includes(result?.status))
      throw Error('Invalid check result');
  } catch {
    result = {
      status: 'failed',
      reason: 'Daily Jira recalculation failed; last recorded numbers retained.',
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
      ledger = await json(ledgerPath);
      return { scope: 'djamespoer.com known scope (Jira SCRUM)', ...summarize(ledger) };
    },
    reconcile: async (before) => {
      const issues = await readAllIssues(jiraReader());
      const previous = ledger.observations.at(-1).members;
      const members = recalculateMembers(previous, issues, ledger.exclusions);
      if (sameSnapshot(previous, members))
        return {
          status: 'checked',
          reason: 'Recalculated from Jira; no change since the last observation.',
        };
      const dir = await mkdtemp(join(tmpdir(), 'bom-'));
      try {
        const file = join(dir, 'members.json');
        await writeFile(file, JSON.stringify(members));
        const after = summarize({
          ...ledger,
          observations: [
            ...ledger.observations,
            { id: 'preview', observedAt: new Date().toISOString(), reason: 'preview', members },
          ],
        });
        const reason = `SCRUM-213 daily Jira recalculation: ${after.shipped}/${after.total} points (shipped ${after.shipped - before.shipped >= 0 ? '+' : ''}${after.shipped - before.shipped}, scope ${after.total - before.total >= 0 ? '+' : ''}${after.total - before.total}).`;
        // The canonical projector appends, validates and regenerates every derived file.
        execFileSync(
          process.execPath,
          ['scripts/buildometer/project.mjs', 'observe', file, reason],
          {
            stdio: 'inherit',
          },
        );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
      return {
        status: 'observed',
        reason: 'Recalculated from Jira and recorded a new observation.',
        ...summarize(await json(ledgerPath)),
      };
    },
    save: async (receipt) => {
      await writeFile(reconciliationPath, JSON.stringify(receipt, null, 2) + '\n');
      console.log('Daily Buildometer: ' + receipt.status + '; observed ' + receipt.observedAt);
      if (process.env.GITHUB_STEP_SUMMARY)
        await appendFile(
          process.env.GITHUB_STEP_SUMMARY,
          `Buildometer: **${receipt.status}**, checked ${receipt.checkedAt}; ${receipt.shipped}/${receipt.total} (${receipt.percent}%), observed ${receipt.observedAt}. ${receipt.reason}\n`,
        );
    },
    compose,
  });
}
