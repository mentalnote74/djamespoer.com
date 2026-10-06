import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyCloudflareActivation } from './cloudflare-activation.mjs';

// Entirely fictional provider projections; not James's deployment history.
const id = (digit) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(4)}-${digit.repeat(12)}`;
const target = {
  accountId: 'a'.repeat(32),
  workerTag: 'b'.repeat(32),
  workerName: 'djamespoer-com',
  triggerId: id('1'),
};
const candidate = { buildId: id('2'), revision: 'c'.repeat(40) };
const build = {
  build_uuid: candidate.buildId,
  status: 'stopped',
  build_outcome: 'success',
  build_trigger_metadata: {
    provider_type: 'github',
    provider_account_name: 'mentalnote74',
    repo_name: 'djamespoer.com',
    branch: 'main',
    root_directory: '/',
    build_command: 'npm run build',
    deploy_command: 'npx wrangler deploy',
    commit_hash: candidate.revision,
    environment_variables: { SECRET: 'private-fixture' },
  },
  trigger: { trigger_uuid: target.triggerId, external_script_id: target.workerTag },
  stopped_on: '2026-10-06T12:00:00Z',
  running_on: '2026-10-06T11:59:00Z',
};
const activation = {
  id: id('3'),
  versions: [{ version_id: id('4'), percentage: 100 }],
  created_on: '2026-10-06T11:59:59Z',
  author_email: 'private-fixture',
};
const envelope = (result, result_info) => ({
  success: true,
  result,
  ...(result_info ? { result_info } : {}),
});

function fixture({
  initial = build,
  records = [activation],
  correlations,
  reread = activation,
  pages,
  failure,
} = {}) {
  const calls = [];
  const read = async (request) => {
    calls.push(request);
    assert.equal(request.method, 'GET');
    if (failure) throw new Error('private-fixture');
    const path = request.path;
    if (path.endsWith(`/builds/builds/${candidate.buildId}`)) return envelope(initial);
    if (path.includes('/deployments?page=')) {
      const page = Number(new URL(`https://fixture.invalid${path}`).searchParams.get('page'));
      return envelope(
        { deployments: pages ? pages[page - 1] : records },
        { page, total_pages: pages?.length ?? 1 },
      );
    }
    if (path.includes('/builds/builds?version_ids=')) {
      const version = path.split('=').at(-1);
      return envelope({
        builds: correlations ? correlations[version] : { undocumentedKey: build },
      });
    }
    if (path.endsWith(`/deployments/${reread.id}`)) return envelope(reread);
    throw new Error('Unexpected read');
  };
  return { read, calls };
}
const run = (source, overrides = {}) =>
  verifyCloudflareActivation({ target, candidate, ...source, ...overrides });
const unverifiable = { outcome: 'unverifiable' };

test('exact activation returns only sanitized correlation with no invented timestamps', async () => {
  const source = fixture();
  const result = await run(source);
  assert.deepEqual(result, {
    outcome: 'verified-activation',
    deploymentId: activation.id,
    versionId: id('4'),
    buildId: candidate.buildId,
    revision: candidate.revision,
    target: 'djamespoer-com',
    environment: 'production',
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /private-fixture|environment_variables|created_on|stopped_on|startedAt|completedAt|statusRecordedAt/,
  );
  assert.equal(source.calls.length, 4);
});

test('full SHA required; short SHA and SHA mismatch do not verify', async () => {
  assert.deepEqual(
    await run(fixture(), { candidate: { ...candidate, revision: candidate.revision.slice(0, 7) } }),
    unverifiable,
  );
  assert.deepEqual(
    await run(
      fixture({
        initial: {
          ...build,
          build_trigger_metadata: { ...build.build_trigger_metadata, commit_hash: 'd'.repeat(40) },
        },
      }),
    ),
    unverifiable,
  );
});

for (const [field, value] of [
  ['repo_name', 'other'],
  ['provider_account_name', 'other'],
  ['branch', 'preview'],
  ['provider_type', 'gitlab'],
  ['root_directory', '/other'],
  ['deploy_command', 'npx wrangler versions upload'],
]) {
  test(`known wrong production context ${field} is ineligible`, async () => {
    assert.deepEqual(
      await run(
        fixture({
          initial: {
            ...build,
            build_trigger_metadata: { ...build.build_trigger_metadata, [field]: value },
          },
        }),
      ),
      { outcome: 'ineligible-pipeline' },
    );
  });
}
test('wrong Worker/production trigger never verifies', async () => {
  assert.deepEqual(
    await run(fixture(), { target: { ...target, workerName: 'other' } }),
    unverifiable,
  );
  assert.deepEqual(
    await run(
      fixture({ initial: { ...build, trigger: { ...build.trigger, trigger_uuid: id('9') } } }),
    ),
    { outcome: 'ineligible-pipeline' },
  );
  assert.deepEqual(
    await run(
      fixture({
        initial: { ...build, trigger: { ...build.trigger, external_script_id: 'e'.repeat(32) } },
      }),
    ),
    { outcome: 'ineligible-pipeline' },
  );
});
test('no activation and ambiguous activations are unverifiable', async () => {
  assert.deepEqual(await run(fixture({ records: [] })), unverifiable);
  assert.deepEqual(
    await run(fixture({ records: [activation, { ...activation, id: id('5') }] })),
    unverifiable,
  );
});
for (const versions of [
  [],
  [{ version_id: id('4'), percentage: 50 }],
  [
    { version_id: id('4'), percentage: 100 },
    { version_id: id('5'), percentage: 100 },
  ],
]) {
  test(`unsupported traffic assignment ${JSON.stringify(versions)} is unverifiable`, async () => {
    assert.deepEqual(await run(fixture({ records: [{ ...activation, versions }] })), unverifiable);
  });
}
test('missing/ambiguous version correlation and wrong build UUID are unverifiable', async () => {
  for (const mapping of [
    {},
    { one: build, two: build },
    { one: { ...build, build_uuid: id('9') } },
  ])
    assert.deepEqual(await run(fixture({ correlations: { [id('4')]: mapping } })), unverifiable);
});
test('matching SHA without build association, and inconsistent correlated context, cannot verify', async () => {
  for (const correlated of [
    { ...build, build_uuid: id('9') },
    {
      ...build,
      build_trigger_metadata: { ...build.build_trigger_metadata, commit_hash: 'd'.repeat(40) },
    },
    { ...build, trigger: { ...build.trigger, trigger_uuid: id('9') } },
  ])
    assert.deepEqual(
      await run(fixture({ correlations: { [id('4')]: { one: correlated } } })),
      unverifiable,
    );
});
test('known Installing failure requires separate matching trusted evidence, not check/build failure alone', async () => {
  const failed = { ...build, build_outcome: 'fail' };
  const source = fixture({ initial: failed });
  assert.deepEqual(await run(source), unverifiable);
  assert.deepEqual(
    await run(source, {
      preDeploymentFailure: {
        buildId: candidate.buildId,
        revision: candidate.revision,
        stage: 'Installing',
      },
    }),
    { outcome: 'ineligible-pipeline' },
  );
  for (const fields of [{ buildId: id('9') }, { revision: 'd'.repeat(40) }, { stage: 'Deploying' }])
    assert.deepEqual(
      await run(source, {
        preDeploymentFailure: {
          buildId: candidate.buildId,
          revision: candidate.revision,
          stage: 'Installing',
          ...fields,
        },
      }),
      unverifiable,
    );
  assert.ok(source.calls.every((call) => !call.path.includes('/deployments')));
});
test('superseded historical activation and repeated SHA remain distinct by explicit deployment UUID', async () => {
  const newer = {
    ...activation,
    id: id('5'),
    versions: [{ version_id: id('6'), percentage: 100 }],
  };
  const records = [newer, activation];
  const source = fixture({
    records,
    correlations: {
      [id('6')]: { other: { ...build, build_uuid: id('7') } },
      [id('4')]: { original: build },
    },
  });
  const historical = await run(source, {
    candidate: { ...candidate, deploymentId: activation.id },
  });
  assert.equal(historical.outcome, 'verified-activation');
  assert.equal(historical.deploymentId, activation.id);
  assert.equal('current' in historical, false);
  const repeated = await run(fixture({ records, reread: newer }), {
    candidate: { ...candidate, deploymentId: newer.id },
  });
  assert.equal(repeated.outcome, 'verified-activation');
  assert.notEqual(repeated.deploymentId, historical.deploymentId);
});
test('duplicate pages deduplicate identical IDs and cache version reads deterministically', async () => {
  const source = fixture({ pages: [[activation], [activation]] });
  assert.equal((await run(source)).outcome, 'verified-activation');
  assert.equal(source.calls.filter((call) => call.path.includes('?version_ids=')).length, 1);
  assert.deepEqual(
    await run(
      fixture({
        records: [
          activation,
          { ...activation, versions: [{ version_id: id('6'), percentage: 100 }] },
        ],
      }),
    ),
    unverifiable,
  );
});
test('changed deployment on re-read prevents publication', async () => {
  assert.deepEqual(
    await run(
      fixture({ reread: { ...activation, versions: [{ version_id: id('6'), percentage: 100 }] } }),
    ),
    unverifiable,
  );
});
test('API failures and malformed responses return safe unverifiable outcomes', async () => {
  assert.deepEqual(await run(fixture({ failure: true })), unverifiable);
  for (const response of [
    null,
    {},
    { success: false, result: build },
    envelope({}),
    envelope({ ...build, trigger: null }),
  ])
    assert.deepEqual(await run({ read: async () => response }), unverifiable);
});
test('malformed list/pagination/correlation responses fail closed', async () => {
  for (const records of [[null], [{ ...activation, id: 'bad' }]])
    assert.deepEqual(await run(fixture({ records })), unverifiable);
  assert.deepEqual(
    await run({
      read: async ({ path }) =>
        path.includes('/deployments?') ? envelope({ deployments: [activation] }) : envelope(build),
    }),
    unverifiable,
  );
  assert.deepEqual(await run(fixture({ correlations: { [id('4')]: null } })), unverifiable);
});

test('changed pagination, late read failure, and initial build identity mismatch fail closed', async () => {
  const source = fixture({ pages: [[activation], [activation]] });
  const read = async (request) => {
    const response = await source.read(request);
    if (request.path.includes('page=2')) response.result_info.total_pages = 3;
    return response;
  };
  assert.deepEqual(await run({ read }), unverifiable);
  const late = fixture();
  assert.deepEqual(
    await run({
      read: async (request) => {
        if (request.path.endsWith(`/deployments/${activation.id}`))
          throw new Error('private fixture');
        return late.read(request);
      },
    }),
    unverifiable,
  );
  assert.deepEqual(
    await run(fixture({ initial: { ...build, build_uuid: id('9') } })),
    unverifiable,
  );
});

// Diagnostic categories describe existing predicates without changing semantic results.
for (const [name, source, category] of [
  ['build UUID', fixture({ initial: { ...build, build_uuid: id('9') } }), 'build-uuid-mismatch'],
  [
    'missing context',
    fixture({ initial: { ...build, build_trigger_metadata: undefined } }),
    'build-context-missing',
  ],
  [
    'repository',
    fixture({
      initial: {
        ...build,
        build_trigger_metadata: { ...build.build_trigger_metadata, repo_name: 'private-fixture' },
      },
    }),
    'repository-mismatch',
  ],
  [
    'branch',
    fixture({
      initial: {
        ...build,
        build_trigger_metadata: { ...build.build_trigger_metadata, branch: 'private-fixture' },
      },
    }),
    'branch-mismatch',
  ],
  [
    'Worker',
    fixture({
      initial: { ...build, trigger: { ...build.trigger, external_script_id: 'private-fixture' } },
    }),
    'worker-mismatch',
  ],
  [
    'production trigger',
    fixture({
      initial: { ...build, trigger: { ...build.trigger, trigger_uuid: 'private-fixture' } },
    }),
    'production-trigger-mismatch',
  ],
  [
    'revision',
    fixture({
      initial: {
        ...build,
        build_trigger_metadata: { ...build.build_trigger_metadata, commit_hash: 'd'.repeat(40) },
      },
    }),
    'exact-revision-mismatch',
  ],
  [
    'build outcome',
    fixture({ initial: { ...build, build_outcome: 'fail' } }),
    'build-success-not-established',
  ],
  [
    'traffic',
    fixture({ records: [{ ...activation, versions: [] }] }),
    'deployment-version-traffic-mismatch',
  ],
  [
    'missing correlation',
    fixture({ correlations: { [id('4')]: {} } }),
    'version-build-correlation-empty',
  ],
  [
    'nonmatching candidate',
    fixture({ correlations: { [id('4')]: { opaque: { ...build, build_uuid: id('9') } } } }),
    'no-deployment-candidate-matched',
  ],
  [
    'ambiguity',
    fixture({ records: [activation, { ...activation, id: id('5') }] }),
    'ambiguous-matching-activations',
  ],
  [
    'confirming reread',
    fixture({ reread: { ...activation, versions: [{ version_id: id('9'), percentage: 100 }] } }),
    'confirming-deployment-reread-mismatch',
  ],
])
  test(`safe diagnostic predicate: ${name}`, async () => {
    const categories = [];
    const withDiagnostics = await run(source, {
      onDiagnostic: (category) => categories.push(category),
    });
    const withoutDiagnostics = await run(source);
    assert.deepEqual(withDiagnostics, withoutDiagnostics);
    assert.ok(categories.includes(category));
    assert.doesNotMatch(
      JSON.stringify(categories),
      /private-fixture|[0-9a-f]{32}|created_on|build_command/,
    );
  });

test('diagnostic observer cannot alter verified activation by throwing', async () => {
  const source = fixture();
  const original = await run(source);
  assert.deepEqual(
    await run(source, {
      onDiagnostic: () => {
        throw new Error('private-fixture');
      },
    }),
    original,
  );
  // Also exercise throwing observers on a failing predicate.
  const failed = fixture({ initial: { ...build, build_outcome: 'fail' } });
  assert.deepEqual(
    await run(failed, {
      onDiagnostic: () => {
        throw new Error('private-fixture');
      },
    }),
    await run(failed),
  );
});

for (const [provenance, map, category] of [
  ['unavailable', {}, 'version-build-correlation-empty'],
  [
    'ambiguous',
    { first: build, second: { ...build, build_uuid: id('a') } },
    'version-build-correlation-multiple',
  ],
  [
    'malformed',
    { malformed: { ...build, build_uuid: 'not-a-uuid' } },
    'version-build-correlation-invalid-build-uuid',
  ],
])
  test(`mixed history stops at ${provenance} provenance before later exact candidate`, async () => {
    // All identities are synthetic and distinct across Worker/trigger/build/deployment/version domains.
    const otherDeployment = { id: id('5'), versions: [{ version_id: id('6'), percentage: 100 }] };
    const secondDeployment = { id: id('7'), versions: [{ version_id: id('8'), percentage: 100 }] };
    const unsupportedDeployment = {
      id: id('9'),
      versions: [{ version_id: id('b'), percentage: 100 }],
    };
    const records = [otherDeployment, secondDeployment, unsupportedDeployment, activation];
    const correlations = {
      [id('6')]: {
        historical: {
          ...build,
          build_uuid: id('c'),
          build_trigger_metadata: { ...build.build_trigger_metadata, commit_hash: 'd'.repeat(40) },
        },
      },
      [id('8')]: {
        historical: {
          ...build,
          build_uuid: id('d'),
          build_trigger_metadata: { ...build.build_trigger_metadata, commit_hash: 'e'.repeat(40) },
        },
      },
      [id('b')]: map,
      [id('4')]: { exact: build },
    };
    const source = fixture({ records, correlations });
    const categories = [];
    assert.deepEqual(
      await run(source, { onDiagnostic: (value) => categories.push(value) }),
      unverifiable,
    );
    assert.deepEqual(categories, [
      'build-uuid-not-matching-candidate',
      'build-uuid-not-matching-candidate',
      category,
    ]);
    assert.deepEqual(
      source.calls
        .filter((call) => call.path.includes('?version_ids='))
        .map((call) => call.path.split('=').at(-1)),
      [id('6'), id('8'), id('b')],
    );
    assert.ok(!source.calls.some((call) => call.path.endsWith(`/deployments/${activation.id}`)));
    // Prove later evidence is independently sufficient under the EXISTING explicit-selection contract.
    const selected = await run(fixture({ records, correlations }), {
      candidate: { ...candidate, deploymentId: activation.id },
    });
    assert.equal(selected.outcome, 'verified-activation');
    assert.equal(selected.deploymentId, activation.id);
    assert.doesNotMatch(JSON.stringify(categories), /private-fixture|[0-9a-f]{32}|commit_hash/);
  });
