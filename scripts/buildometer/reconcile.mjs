import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectMeasurement, sameSnapshot } from '../../server/buildometer/project.ts';
export const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function verifiedRelease(evidence, now = Date.now()) {
  const r = evidence?.release;
  if (
    !r ||
    r.environment !== 'production' ||
    r.status !== 'succeeded' ||
    r.stage !== 'deployed' ||
    !/^[a-f0-9]{40}$/.test(r.sha) ||
    !r.id ||
    !/^https:\/\//.test(r.evidenceUrl ?? '') ||
    !Number.isFinite(Date.parse(r.deployedAt)) ||
    Date.parse(r.deployedAt) > now ||
    !Number.isFinite(Date.parse(evidence.verifiedAt)) ||
    Date.parse(evidence.verifiedAt) < Date.parse(r.deployedAt) ||
    Date.parse(evidence.verifiedAt) > now
  )
    throw Error(
      'Verified successful production release receipt required; pending/failed builds give no shipped credit',
    );
  return r;
}
export function prepareReconciliation(
  { ledger, inventory, evidence, decisions },
  now = Date.now(),
) {
  projectMeasurement(ledger);
  const release = verifiedRelease(evidence, now);
  const rows = new Map();
  for (const row of inventory) {
    if (rows.has(row.key)) throw Error('Duplicate inventory member');
    rows.set(row.key, row);
  }
  const original = ledger.observations.at(-1).members;
  const members = structuredClone(original);
  const excluded = new Set(
    Object.values(ledger.exclusions ?? {})
      .filter(Array.isArray)
      .flat(),
  );
  for (const key of decisions.add ?? []) {
    const row = rows.get(key);
    if (
      !row ||
      excluded.has(key) ||
      row.type === 'Epic' ||
      /ONBOARDING SAMPLE/.test(row.title) ||
      members.some((m) => m.key === key)
    )
      throw Error('Invalid scope addition: ' + key);
    if (![0, 1, 2, 3, 5, 8, 13].includes(row.points))
      throw Error('Missing/invalid estimate: ' + key);
    members.push({ key, title: row.title, points: row.points, shipped: false, disposition: 'not' });
  }
  for (const change of decisions.remove ?? []) {
    const index = members.findIndex((m) => m.key === change.key);
    if (index < 0 || !change.reason?.trim())
      throw Error('Removal requires known member and reason');
    members.splice(index, 1);
  }
  for (const change of decisions.reestimate ?? []) {
    const member = members.find((m) => m.key === change.key);
    if (!member || !change.reason?.trim() || ![0, 1, 2, 3, 5, 8, 13].includes(change.points))
      throw Error('Reestimate requires member, allowed points and reason');
    member.points = change.points;
  }
  for (const key of decisions.ship ?? []) {
    const member = members.find((m) => m.key === key),
      claim = evidence.items?.find((i) => i.key === key);
    if (
      !member ||
      !claim ||
      !/^[a-f0-9]{40}$/.test(claim.commit) ||
      !claim.acceptanceNote?.trim() ||
      !claim.evidencePath?.trim()
    )
      throw Error('Whole-story release evidence required: ' + key);
    member.shipped = true;
    member.disposition = 'shipped';
  }
  for (const change of decisions.unship ?? []) {
    const member = members.find((m) => m.key === change.key);
    if (!member || !change.reason?.trim()) throw Error('Reopen/revert requires member and reason');
    member.shipped = false;
    member.disposition = 'not';
  }
  const keys = new Set(members.map((m) => m.key));
  for (const m of members)
    if (rows.get(m.key)?.parent && keys.has(rows.get(m.key).parent))
      throw Error('Parent/child double counting: ' + m.key);
  const changes = [];
  for (const m of members) {
    const old = original.find((o) => o.key === m.key);
    if (!old || old.points !== m.points || old.shipped !== m.shipped)
      changes.push({ key: m.key, before: old ?? null, after: m });
  }
  for (const m of original)
    if (!keys.has(m.key)) changes.push({ key: m.key, before: m, after: null });
  const scopeChanged = changes.some(
    (c) => !c.before || !c.after || c.before.points !== c.after.points,
  );
  const candidateLedger = structuredClone(ledger);
  // Validate without inventing an observation when the snapshot is unchanged.
  if (!sameSnapshot(original, members))
    candidateLedger.observations.push({
      id: 'candidate-validation',
      observedAt: new Date(now).toISOString(),
      reason: 'Unapplied candidate validation',
      members,
    });
  const projection = projectMeasurement(candidateLedger),
    current = projection.observations.at(-1);
  const deferred = decisions.defer ?? [];
  const unresolved = inventory
    .filter(
      (x) =>
        !keys.has(x.key) &&
        !excluded.has(x.key) &&
        x.type !== 'Epic' &&
        !/ONBOARDING SAMPLE/.test(x.title),
    )
    .map((x) => ({
      key: x.key,
      points: x.points,
      reason:
        deferred.find((d) => d.key === x.key)?.reason ??
        (x.points === null
          ? 'Estimate and membership review required'
          : 'Membership review required'),
    }));
  const content = {
    schemaVersion: 1,
    ledgerHash: digest(ledger),
    inventoryHash: digest(inventory),
    evidenceHash: digest(evidence),
    release,
    members,
    changes,
    scopeChanged,
    decisions,
    unresolved,
    totals: Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'date')),
  };
  return { ...content, candidateHash: digest(content) };
}
export function validateApproval(candidate, ledger, approval) {
  const { candidateHash, ...content } = candidate;
  if (candidateHash !== digest(content) || candidate.ledgerHash !== digest(ledger))
    throw Error('Candidate or ledger changed; prepare and review again');
  if (
    approval.candidateHash !== candidateHash ||
    !approval.reviewRef?.trim() ||
    !approval.reviewer?.trim()
  )
    throw Error('Exact candidate hash, reviewer and recorded review reference required');
  if (candidate.scopeChanged && !approval.scopeReviewRef?.trim())
    throw Error('Owner scope/estimate review reference required');
  return (
    !sameSnapshot(ledger.observations.at(-1).members, candidate.members) ||
    (candidate.decisions.verifyUnchangedRelease === true &&
      Date.parse(candidate.release.deployedAt) > Date.parse(ledger.observations.at(-1).observedAt))
  );
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith('--') || !args[i + 1])
      throw Error('Named option/value pairs required');
    options[args[i].slice(2)] = args[i + 1];
  }
  const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
  const ledger = await json('scripts/buildometer/project-ledger.json');
  if (command === 'prepare') {
    for (const key of ['inventory', 'evidence', 'decisions', 'out'])
      if (!options[key]) throw Error('prepare requires --' + key);
    const inventory = (await readFile(options.inventory, 'utf8'))
      .split(/\r?\n/)
      .filter((s) => s.trim())
      .map((s) => JSON.parse(s));
    const evidence = await json(options.evidence);
    verifiedRelease(evidence);
    // The operator supplies reviewed evidence; ancestry validates that claimed code really reached that release.
    execFileSync('git', ['merge-base', '--is-ancestor', evidence.release.sha, 'HEAD']);
    for (const item of evidence.items ?? [])
      execFileSync('git', ['merge-base', '--is-ancestor', item.commit, evidence.release.sha]);
    for (const item of evidence.items ?? []) {
      execFileSync('git', ['cat-file', '-e', item.commit + ':' + item.evidencePath]);
      execFileSync('git', ['cat-file', '-e', evidence.release.sha + ':' + item.evidencePath]);
    }
    const candidate = prepareReconciliation({
      ledger,
      inventory,
      evidence,
      decisions: await json(options.decisions),
    });
    await mkdir(options.out, { recursive: true });
    await writeFile(
      resolve(options.out, 'candidate.json'),
      JSON.stringify(candidate, null, 2) + '\n',
    );
    await writeFile(
      resolve(options.out, 'candidate-members.json'),
      JSON.stringify(candidate.members, null, 2) + '\n',
    );
    console.log(
      JSON.stringify({
        candidateHash: candidate.candidateHash,
        scopeChanged: candidate.scopeChanged,
        changes: candidate.changes.length,
        unresolved: candidate.unresolved.length,
        totals: candidate.totals,
      }),
    );
  } else if (command === 'apply') {
    if (!options.candidate || !options.approval)
      throw Error('apply requires --candidate and --approval');
    const candidate = await json(options.candidate),
      approval = await json(options.approval);
    if (!validateApproval(candidate, ledger, approval)) {
      console.log('Unchanged evidence: no observation appended.');
      return;
    }
    const activeReceipt = await json('scripts/buildometer/release-evidence.json');
    const activeRelease = verifiedRelease(activeReceipt);
    if (digest(activeReceipt) !== candidate.evidenceHash)
      throw Error('Release evidence changed; prepare and review again');
    if (
      activeRelease.id !== candidate.release.id ||
      activeRelease.sha !== candidate.release.sha ||
      activeRelease.deployedAt !== candidate.release.deployedAt
    )
      throw Error('Release receipt changed; prepare and review again');
    const members = resolve(options.candidate, '../candidate-members.json');
    // Compare the companion file too; never apply a different snapshot from the reviewed manifest.
    if (digest(await json(members)) !== digest(candidate.members))
      throw Error('Candidate member file changed');
    const reason = `${approval.reviewRef}; reviewer ${approval.reviewer}; candidate ${candidate.candidateHash}; release ${candidate.release.id}; scope review ${approval.scopeReviewRef ?? 'unchanged approved scope'}`;
    execFileSync(
      process.execPath,
      [
        'scripts/buildometer/project.mjs',
        'observe',
        members,
        reason,
        ...(candidate.decisions.verifyUnchangedRelease === true
          ? ['--verified-release-review']
          : []),
      ],
      { stdio: 'inherit' },
    );
  } else if (command === 'release-check') {
    const evidence = await json(options.evidence ?? 'scripts/buildometer/release-evidence.json');
    const release = verifiedRelease(evidence);
    const current = ledger.observations.at(-1);
    const pending = Date.parse(release.deployedAt) > Date.parse(current.observedAt);
    console.log(
      JSON.stringify({
        check: 'BOM release reconciliation',
        status: pending ? 'pending-reconciliation' : 'observed',
        observedAt: current.observedAt,
        latestEligibleReleaseAt: release.deployedAt,
        releaseId: release.id,
        action: pending
          ? 'Prepare and review a complete candidate; do not edit the percentage.'
          : 'No newer recorded eligible release. Unchanged rebuilds append nothing.',
      }),
    );
    if (pending && options.strict === 'true') process.exitCode = 2;
  } else
    throw Error(
      'Use prepare, apply or release-check; see docs/buildometer/release-reconciliation.md',
    );
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch((error) => {
    console.error('BOM reconciliation: ' + error.message);
    process.exitCode = 1;
  });
