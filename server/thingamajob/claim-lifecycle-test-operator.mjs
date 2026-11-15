// Explicit TEST-only operator boundary. No browser route, JWT copying or impersonation.
import fs from 'node:fs';
import path from 'node:path';
import { operatorSupersedeClaim } from './claim-lifecycle-operator.ts';
const config = JSON.parse(
  fs.readFileSync(new URL('./wrangler.private.jsonc', import.meta.url), 'utf8'),
);
const test = config.env?.test;
const binding = test?.d1_databases?.find((b) => b.binding === 'IDENTITY_DB');
const account = config.account_id;
const databaseId = binding?.database_id;
if (
  test?.name !== 'thingamajob-api-test' ||
  binding?.database_name !== 'thingamajob-identity-test' ||
  !/^[a-f0-9]{32}$/.test(account ?? '') ||
  !/^[a-f0-9-]{36}$/.test(databaseId ?? '')
)
  throw new Error('Verified ignored TEST configuration required');
const token = fs
  .readFileSync(
    path.join(process.env.APPDATA, 'xdg.config', '.wrangler', 'config', 'default.toml'),
    'utf8',
  )
  .match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error('Authenticated Cloudflare operator required');
const instructionFile = process.argv[2];
if (!instructionFile) throw new Error('Supply explicit TEST owner instruction JSON file');
const instruction = JSON.parse(fs.readFileSync(instructionFile, 'utf8'));
async function api(route, body) {
  const response = await fetch('https://api.cloudflare.com/client/v4/accounts/' + account + route, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!data.success)
    throw new Error('Cloudflare TEST operation unavailable (' + response.status + ')');
  return data.result;
}
const deployed = await api('/d1/database/' + databaseId);
if (deployed.name !== 'thingamajob-identity-test') throw new Error('TEST resource mismatch');
const query = (sql, params = []) => api('/d1/database/' + databaseId + '/query', { sql, params });
const database = {
  prepare(sql) {
    return {
      sql,
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        return (await query(this.sql, this.values))[0].results[0] ?? null;
      },
    };
  },
  async batch(statements) {
    if (statements.length !== 1)
      throw new Error('Operator transition must remain a single atomic statement');
    return query(statements[0].sql, statements[0].values);
  },
};
if (process.argv[3] !== '--apply') {
  const ids = await query(
    'SELECT workspace_id,claim_id,proposal_id,review_id,version FROM thingamajob_active_claims WHERE workspace_id=? AND claim_id IN (?,?)',
    [instruction.workspaceId, instruction.obsoleteClaimId, instruction.input.replacementClaimId],
  );
  console.log(
    JSON.stringify({ mode: 'read-only', database: deployed.name, claims: ids[0].results }),
  );
} else {
  console.log(JSON.stringify(await operatorSupersedeClaim(database, instruction)));
}
