// Fictional local persistence fixture, run by roundtrip-proof.test.mjs only.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { seedProofOwners, runRoundtripProof, verifyProofPersistence } from './roundtrip-proof.ts';
const [directory, phase] = process.argv.slice(2);
if (!directory || !['create', 'restart'].includes(phase)) throw Error('Invalid fixture invocation');
const db = new DatabaseSync(path.join(directory, 'fictional.sqlite'));
const database = {
  prepare(sql) {
    const values = [];
    return {
      bind(...args) {
        values.push(...args);
        return this;
      },
      async first() {
        return db.prepare(sql).get(...values) ?? null;
      },
      sql,
      values,
    };
  },
  async batch(statements) {
    db.exec('BEGIN');
    try {
      const result = statements.map((s) => db.prepare(s.sql).run(...s.values));
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  },
};
function objectPath(key) {
  if (!/^workspaces\/scrum85-(one|two)\/originals\/[a-f0-9-]{36}$/.test(key))
    throw Error('Fixture key denied');
  return path.join(directory, 'objects', ...key.split('/'));
}
const bucket = {
  async put(key, bytes) {
    const file = objectPath(key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      fs.writeFileSync(file, bytes, { flag: 'wx' });
      return {};
    } catch (error) {
      if (error.code === 'EEXIST') return null;
      throw error;
    }
  },
  async get(key) {
    const file = objectPath(key);
    if (!fs.existsSync(file)) return null;
    return {
      async arrayBuffer() {
        return Uint8Array.from(fs.readFileSync(file)).buffer;
      },
    };
  },
  async head(key) {
    return fs.existsSync(objectPath(key)) ? {} : null;
  },
};
try {
  if (phase === 'create') {
    for (const name of [
      'identity.sql',
      'originals.sql',
      'evidence.sql',
      'assertions.sql',
      'claim-lifecycle.sql',
      'unknowns.sql',
    ])
      db.exec(fs.readFileSync(new URL(name, import.meta.url), 'utf8'));
    await seedProofOwners(database);
    const result = await runRoundtripProof(database, bucket);
    console.log(
      JSON.stringify({
        passed: result.passed,
        checks: result.checks.length,
        mode: 'local SQLite/disk process one',
      }),
    );
  } else {
    const result = await verifyProofPersistence(database, bucket);
    console.log(
      JSON.stringify({ ...result, mode: 'new Node process / reopened SQLite / disk originals' }),
    );
  }
} finally {
  db.close();
}
