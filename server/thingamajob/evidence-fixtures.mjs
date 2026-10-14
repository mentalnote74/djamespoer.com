// Fictional test-only documents/identities; no live/private material.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { createWorker } from './worker.ts';

export function fictionalPdf() {
  const head = '%PDF-1.7\n',
    one = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    two = '2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n';
  const prefix = head + one + two;
  return new TextEncoder().encode(
    prefix +
      'xref\n0 3\n0000000000 65535 f \n' +
      String(head.length).padStart(10, '0') +
      ' 00000 n \n' +
      String((head + one).length).padStart(10, '0') +
      ' 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n' +
      prefix.length +
      '\n%%EOF\n',
  );
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function fictionalDocx(compression = 8) {
  const parts = [
    [
      '[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ],
    [
      '_rels/.rels',
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ],
    [
      'word/document.xml',
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Fictional fixture. No career facts.</w:t></w:r></w:p></w:body></w:document>',
    ],
  ];
  const local = [],
    central = [];
  let offset = 0;
  for (const [filename, content] of parts) {
    const name = Buffer.from(filename),
      data = Buffer.from(content),
      packed = compression === 8 ? deflateRawSync(data) : data,
      crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(compression, 8);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(packed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, packed);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(compression, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(packed.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += header.length + name.length + packed.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(parts.length, 8);
  end.writeUInt16LE(parts.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, directory, end]));
}

const issuer = 'https://fictional-team.cloudflareaccess.com',
  audience = 'd'.repeat(64);
const { privateKey, publicKey } = await generateKeyPair('RS256');
const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'fictional' }] });
export async function signedEvidenceRequest(path, subject = 'one', options = {}) {
  const jwt = await new SignJWT({ type: 'app', email: 'fictional@example.invalid' })
    .setProtectedHeader({ alg: 'RS256', kid: 'fictional' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
  return new Request('https://api-test.djamespoer.com' + path, {
    ...options,
    headers: {
      'Cf-Access-Jwt-Assertion': jwt,
      Origin: 'https://api-test.djamespoer.com',
      'Sec-Fetch-Site': 'same-origin',
      ...options.headers,
    },
  });
}
export function evidenceFixture() {
  const db = new DatabaseSync(':memory:');
  for (const file of ['identity.sql', 'originals.sql', 'evidence.sql'])
    db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  for (const s of ['one', 'two']) {
    db.prepare('INSERT INTO thingamajob_actors VALUES (?,?,?,1)').run('actor-' + s, issuer, s);
    db.prepare('INSERT INTO thingamajob_workspaces VALUES (?,?,1)').run(
      'workspace-' + s,
      'actor-' + s,
    );
    db.prepare('INSERT INTO thingamajob_memberships VALUES (?,?,1)').run(
      'actor-' + s,
      'workspace-' + s,
    );
  }
  const database = {
    prepare(sql) {
      const values = [];
      return {
        sql,
        values,
        bind(...args) {
          values.push(...args);
          return this;
        },
        async first() {
          return db.prepare(sql).get(...values) ?? null;
        },
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
  const objects = new Map();
  let reads = 0;
  const bucket = {
    async head(key) {
      return objects.has(key) ? {} : null;
    },
    async put(key, bytes, options) {
      if (objects.has(key)) return null;
      objects.set(key, Uint8Array.from(bytes));
      return {};
    },
    async get(key) {
      reads++;
      const bytes = objects.get(key);
      return bytes
        ? {
            async arrayBuffer() {
              return Uint8Array.from(bytes).buffer;
            },
          }
        : null;
    },
  };
  return {
    db,
    database,
    objects,
    bucket,
    get reads() {
      return reads;
    },
    worker: createWorker(keys),
    env: {
      ACCESS_ISSUER: issuer,
      ACCESS_AUDIENCE: audience,
      IDENTITY_DB: database,
      PRIVATE_ORIGINALS: bucket,
      TEST_BOOTSTRAP_ENABLED: 'true',
    },
  };
}
export function uploadForm(
  bytes = new TextEncoder().encode('Fictional fixture, no career facts.'),
  name = 'fixture.txt',
  mime = 'text/plain',
  attribution = 'Fictional author',
  locator = 'Fictional source reference',
) {
  const form = new FormData();
  form.set('file', new File([Uint8Array.from(bytes)], name, { type: mime }));
  form.set('attribution', attribution);
  form.set('sourceLocator', locator);
  return form;
}
