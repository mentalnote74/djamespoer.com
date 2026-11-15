import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeJd,
  fromJdFile,
  fromJobUrl as readUrl,
  intakeJd as readInput,
  htmlText,
} from './jd-intake.ts';
const publicDns = async () => ['93.184.215.14'];
const fromJobUrl = (url, transport) => readUrl(url, transport, publicDns);
const intakeJd = (request, transport) => readInput(request, transport, publicDns);
import { fictionalDocx, evidenceFixture, signedEvidenceRequest } from './evidence-fixtures.mjs';
const clean =
  'Senior UX Engineer\nRequired qualifications\nBuild accessible Angular applications.\nPreferred qualifications\nExperience with design systems.\nLocation: Remote, eligible applicants in Peru or Ecuador.\nCompensation: $100,000–$120,000.';
test('all text inputs share stable normalization while keeping requirements, preferences and material constraints', () => {
  const noisy = [
    'Opt-Out Signal Honored',
    'We and our third-party partners use cookies and similar technologies.',
    'Accept',
    'Reject',
    'Built In Logo',
    'Companies',
    'Jobs',
    'Articles',
    'Join',
    'Log In',
    'Example Corp',
    'Senior UX Engineer',
    'The Role',
    clean,
    'Candidates must provide a non-VOIP phone number.',
    'Similar Jobs',
    'Other Corp',
    'Wrong Job — $200,000',
    'Privacy Policy',
  ].join('\n');
  const normalized = normalizeJd(noisy);
  for (const part of [
    'Required qualifications',
    'Preferred qualifications',
    'Peru or Ecuador',
    '$100,000–$120,000',
    'non-VOIP phone',
  ])
    assert(normalized.jobDescription.includes(part));
  for (const part of ['Wrong Job', 'Privacy Policy', 'partners use cookies'])
    assert(!normalized.jobDescription.includes(part));
  assert.equal(normalizeJd(normalized.jobDescription).jobDescription, normalized.jobDescription);
  assert.equal(normalizeJd(clean).jobDescription, clean);
  assert(normalized.removedLines > 0);
});
test('file intake reads UTF-8 text/Markdown/HTML and validated DOCX without execution; unsupported/corrupt/oversized files recover to paste', async () => {
  for (const name of ['job.txt', 'job.md', 'job.markdown'])
    assert.equal((await fromJdFile(new File([clean], name))).jobDescription, clean);
  const html =
    '<html><nav>Navigation only</nav><article><h1>Senior UX Engineer</h1><p>Required qualifications: Angular &amp; accessibility.</p></article><footer>Privacy Policy</footer><script>alert(1)</script></html>';
  const result = await fromJdFile(new File([html], 'job.html'));
  assert(result.jobDescription.includes('Angular & accessibility'));
  assert(!result.jobDescription.includes('alert(1)'));
  assert(!result.jobDescription.includes('Privacy Policy'));
  const docx = await fromJdFile(new File([fictionalDocx()], 'job.docx'));
  assert(docx.jobDescription.includes('Fictional fixture'));
  for (const file of [
    new File(['%PDF'], 'job.pdf'),
    new File(['not a zip'], 'job.docx'),
    new File([new Uint8Array([0, 1, 2])], 'job.txt'),
    new File(['x'.repeat(1000001)], 'job.txt'),
  ])
    await assert.rejects(() => fromJdFile(file));
});
test('URL intake extracts a single JobPosting including structured compensation and eligibility without forwarding credentials', async () => {
  const job = {
    '@type': 'JobPosting',
    title: 'Senior UX Engineer',
    description:
      '<h2>Required qualifications</h2><p>Angular accessibility experience.</p><h2>Preferred</h2><p>Testing experience.</p>',
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: { name: 'Peru' },
    baseSalary: { currency: 'USD', value: 100000 },
    eligibilityToWorkRequirement: 'Authorized to work in Peru',
  };
  const result = await fromJobUrl(
    'https://careers.acme.org/openings/frontend-engineer',
    async (url, init) => {
      assert.equal(init.redirect, 'manual');
      assert.equal(init.headers.Cookie, undefined);
      assert.equal(init.headers.Authorization, undefined);
      return new Response(
        '<nav>Noise</nav><script type="application/ld+json">' +
          JSON.stringify(job) +
          '</script><footer>Wrong content</footer>',
        { headers: { 'Content-Type': 'text/html' } },
      );
    },
  );
  for (const text of ['Required qualifications', 'Preferred', 'TELECOMMUTE', 'Peru', '100000'])
    assert(result.jobDescription.includes(text));
  assert(!result.jobDescription.includes('Wrong content'));
  await assert.rejects(
    () =>
      fromJobUrl(
        'https://builtin.com/jobs',
        async () =>
          new Response(
            '<script type="application/ld+json">' + JSON.stringify([job, job]) + '</script>',
            { headers: { 'Content-Type': 'text/html' } },
          ),
      ),
    /multiple job postings/,
  );
});
test('public URL guards, redirects, unreadable pages and blocked providers fail safely before evaluation', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    throw Error('Must not fetch');
  };
  for (const url of [
    'http://builtin.com/job/a',
    'https://127.0.0.1/',
    'https://builtin.com.evil.invalid/',
    'https://user:password@builtin.com/',
    'https://builtin.com:8443/',
  ])
    await assert.rejects(() => fromJobUrl(url, fetcher));
  assert.equal(calls, 0);
  await assert.rejects(() =>
    fromJobUrl(
      'https://builtin.com/job/a',
      async () =>
        new Response(null, {
          status: 302,
          headers: { Location: 'http://169.254.169.254/credentials' },
        }),
    ),
  );
  await assert.rejects(
    () =>
      fromJobUrl('https://builtin.com/job/a', async () => new Response('blocked', { status: 403 })),
    /paste/i,
  );
  await assert.rejects(
    () =>
      fromJobUrl(
        'https://builtin.com/job/a',
        async () =>
          new Response('<html>Enable JavaScript</html>', {
            headers: { 'Content-Type': 'text/html' },
          }),
      ),
    /scripts|paste/i,
  );
});

test('general non-ATS page extraction keeps job context and distinguishes search results', async () => {
  const html =
    '<html><head><title>Noise title</title></head><nav>Login and links</nav><main><header><h1>Senior UX Engineer</h1></header><p>Location: Remote in Peru</p><p>Compensation: $100,000</p><div class="job-description"><h2>Required qualifications</h2><p>Accessible Angular applications.</p><h2>Preferred qualifications</h2><p>Design systems.</p></div><section><h2>Similar jobs</h2><p>Wrong posting</p></section></main><footer>Privacy policy</footer></html>';
  const result = await fromJobUrl(
    'https://careers.acme.org/openings/frontend',
    async () => new Response(html, { headers: { 'Content-Type': 'text/html' } }),
  );
  for (const value of [
    'Senior UX Engineer',
    'Remote in Peru',
    '$100,000',
    'Required qualifications',
    'Preferred qualifications',
    'Design systems',
  ])
    assert(result.jobDescription.includes(value));
  for (const value of ['Wrong posting', 'Noise title', 'Login and links'])
    assert(!result.jobDescription.includes(value));
  await assert.rejects(
    () =>
      fromJobUrl(
        'https://www.monster.com/jobs/search?q=engineer',
        async () =>
          new Response('<main><h1>Engineering jobs</h1><p>Search jobs</p></main>', {
            headers: { 'Content-Type': 'text/html' },
          }),
      ),
    /search\/results page/,
  );
  await assert.rejects(
    () =>
      fromJobUrl(
        'https://careers.acme.org/results',
        async () =>
          new Response(
            '<main><h1>23 jobs found</h1><a href="/jobs/one">One</a><a href="/jobs/two">Two</a><p>Required skills vary.</p></main>',
            { headers: { 'Content-Type': 'text/html' } },
          ),
      ),
    /search\/results page/,
  );
});

test('private/mixed DNS answers and redirected private hosts never receive a request', async () => {
  let calls = 0;
  const forbidden = async () => {
    calls++;
    throw Error('Must not fetch');
  };
  for (const address of [
    '10.0.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '2001:db8::1',
  ])
    await assert.rejects(
      () =>
        readUrl('https://careers.acme.org/job', forbidden, async () => ['93.184.215.14', address]),
      /private or reserved/,
    );
  assert.equal(calls, 0);
  await assert.rejects(
    () =>
      readUrl(
        'https://careers.acme.org/job',
        async () => {
          calls++;
          return new Response(null, {
            status: 302,
            headers: { Location: 'https://private.acme.org/job' },
          });
        },
        async (host) => (host.startsWith('private.') ? ['192.168.1.2'] : ['93.184.215.14']),
      ),
    /private or reserved/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    () => readUrl('https://careers.acme.org/job', forbidden, async () => []),
    /no usable public DNS/,
  );
});
test('intake is same-origin, TEST-only, own-owner scoped, and never writes evidence/claims/evaluations', async () => {
  const f = evidenceFixture();
  try {
    const path = '/api/thingamajob/test/jd-input';
    const post = async (subject, body, headers = {}) =>
      f.worker.fetch(
        await signedEvidenceRequest(path, subject, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body),
        }),
        f.env,
      );
    for (const subject of ['one', 'two']) {
      const r = await post(subject, { method: 'text', text: clean });
      assert.equal(r.status, 200);
      assert.equal((await r.json()).jobDescription, clean);
    }
    assert.equal(
      (await post('one', { method: 'text', text: clean, workspaceId: 'workspace-two' })).status,
      400,
    );
    assert.equal(
      (await post('one', { method: 'text', text: clean }, { Origin: 'https://evil.invalid' }))
        .status,
      403,
    );
    f.db.exec("UPDATE thingamajob_memberships SET active=0 WHERE actor_id='actor-one'");
    assert.equal((await post('one', { method: 'text', text: clean })).status, 403);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_evidence').get().n, 0);
    assert.equal(
      (
        await f.worker.fetch(await signedEvidenceRequest(path, 'two', { method: 'POST' }), {
          ...f.env,
          TEST_BOOTSTRAP_ENABLED: 'false',
        })
      ).status,
      404,
    );
    const form = new FormData();
    form.set('file', new File([clean], 'job.txt'));
    const read = await intakeJd(
      new Request('https://fictional.invalid', { method: 'POST', body: form }),
    );
    assert.equal(read.method, 'file');
    assert.equal(read.jobDescription, clean);
  } finally {
    f.db.close();
  }
});
