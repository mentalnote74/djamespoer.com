import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import ts from 'typescript';
import { sha256, verifyRun } from './thingamajob-proof-capture.mjs';

export const scope = [
  {
    key: 'ips',
    url: 'https://djamespoer.com/work/ips',
    exportName: 'IPS_CASE_STUDY',
    headings: [
      'Overview',
      'Translating State Rules Into Interface Logic',
      'Preventing Invalid Submissions',
      'Technologies & Practices',
    ],
  },
  {
    key: 'tcc',
    url: 'https://djamespoer.com/work/tcc',
    exportName: 'TCC_CASE_STUDY',
    headings: [
      'Overview',
      'Ascend And The Oregon Implementation',
      'Structured Comparative Usability Research',
      'The Result: Neither A Nor B',
    ],
  },
];
const priorRun = '4fff8dd5-0e07-4a8b-8c54-286b69c34c0b';
const priorHash = '70b4605927260052297611b40442ce0703b60b0d80829b91f6c127f3bdbc68e2';
const limit = 10_000_000;

/** Runs identically in browser and synthetic DOM tests. Local expected copy is validation only. */
export function extractSections(expected, headings, document = globalThis.document) {
  const normalize = (text) => text.replace(/\s+/g, ' ').trim();
  const articles = document.querySelectorAll('main article.case-study');
  if (articles.length !== 1) throw new Error('Missing or ambiguous live article');
  const article = articles[0];
  const titles = article.querySelectorAll(':scope > h1');
  if (titles.length !== 1 || normalize(titles[0].textContent) !== normalize(expected.title))
    throw new Error('Live title differs');
  const introductions = article.querySelectorAll(':scope > p');
  if (
    introductions.length !== 1 ||
    normalize(introductions[0].textContent) !== normalize(expected.introduction)
  )
    throw new Error('Missing, ambiguous or different role/date introduction');
  const text = (node) => node.innerText ?? node.textContent;
  const sections = [...article.querySelectorAll(':scope > section')];
  const result = [
    {
      heading: 'Role/date introduction',
      order: 0,
      location: 'main article.case-study > p',
      text: text(introductions[0]),
    },
  ];
  for (const heading of headings) {
    const matched = sections.filter((s) =>
      [...s.querySelectorAll('h2')].some((h) => normalize(h.textContent) === heading),
    );
    const expectedSections = expected.sections.filter((s) => s.heading === heading);
    if (
      matched.length !== 1 ||
      expectedSections.length !== 1 ||
      matched[0].querySelectorAll('h2').length !== 1
    )
      throw new Error(`Missing or ambiguous heading: ${heading}`);
    const section = matched[0],
      specification = expectedSections[0];
    const expectedText = [
      heading,
      ...(specification.paragraphs ?? []),
      ...(specification.items ?? []),
    ].join(' ');
    const comparisonText = [...section.children].map((node) => text(node)).join(' ');
    if (normalize(comparisonText) !== normalize(expectedText))
      throw new Error(`Live content differs: ${heading}`);
    const order = sections.indexOf(section) + 1;
    result.push({
      heading,
      order,
      location: `main article.case-study > section:nth-of-type(${order})`,
      text: text(section),
    });
  }
  return result;
}

async function expectedCopy(repo, descriptor) {
  const source = await readFile(
    path.join(repo, `src/app/components/case-study/${descriptor.key}.content.ts`),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  }).outputText;
  return (await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`))[
    descriptor.exportName
  ];
}

export async function captureBaseline(repo) {
  const root = path.join(repo, 'career-source/proof-runs');
  const originalDirectory = path.join(root, priorRun);
  const prior = await verifyRun(originalDirectory, priorHash);
  const resume = prior.sources.find((s) => s.file === 'resume.docx');
  const runId = randomUUID(),
    directory = path.join(root, runId);
  await mkdir(directory); // Partial run retained on failure; never overwrite existing captures.
  const artifacts = [],
    pages = [],
    extractionInputs = [];
  const save = async (file, bytes) => {
    const data = Buffer.from(bytes);
    if (!data.length || data.length > limit) throw new Error('Capture size outside bounds');
    await writeFile(path.join(directory, file), data, { flag: 'wx', mode: 0o600 });
    const artifact = { file, byteLength: data.length, sha256: sha256(data) };
    artifacts.push(artifact);
    return artifact;
  };
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    for (const descriptor of scope) {
      const expected = await expectedCopy(repo, descriptor);
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1000 });
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = new URL(request.url());
        const allowed =
          url.origin === 'https://djamespoer.com' &&
          (request.isNavigationRequest()
            ? request.url() === descriptor.url
            : ['script', 'stylesheet', 'image', 'font'].includes(request.resourceType()) &&
              !url.pathname.startsWith('/api/'));
        void (allowed ? request.continue() : request.abort());
      });
      const response = await page.goto(descriptor.url, {
        waitUntil: 'networkidle0',
        timeout: 30_000,
      });
      if (
        !response ||
        response.status() !== 200 ||
        page.url() !== descriptor.url ||
        response.request().redirectChain().length ||
        !/^text\/html(?:;|$)/i.test(response.headers()['content-type'] ?? '')
      )
        throw new Error('Unexpected public page response');
      const responseArtifact = await save(
        `${descriptor.key}.response.html`,
        await response.buffer(),
      );
      await page.waitForSelector('main article.case-study h2', { timeout: 15_000 });
      const robots = await page.$$eval('meta[name="robots"],meta[name="googlebot"]', (nodes) =>
        nodes.map((n) => n.content).join(','),
      );
      if (/noindex|none/i.test(robots + ',' + (response.headers()['x-robots-tag'] ?? '')))
        throw new Error('Noindex source refused');
      const capturedAt = new Date().toISOString();
      const renderedArtifact = await save(`${descriptor.key}.rendered.html`, await page.content());
      const sections = await page.evaluate(extractSections, expected, descriptor.headings);
      const sourceId = randomUUID();
      const selected = sections.map((section) => ({
        ...section,
        sourceId,
        runId,
        pageUrl: descriptor.url,
        capturedAt,
        sha256: sha256(Buffer.from(section.text)),
      }));
      const selectedArtifact = await save(
        `${descriptor.key}.selected.json`,
        JSON.stringify(selected, null, 2) + '\n',
      );
      extractionInputs.push({ kind: 'selected-public-sections', sourceId, ...selectedArtifact });
      pages.push({
        sourceId,
        runId,
        pageUrl: descriptor.url,
        capturedAt,
        status: response.status(),
        responseHeaders: Object.fromEntries(
          ['content-type', 'etag', 'last-modified', 'x-robots-tag'].map((key) => [
            key,
            response.headers()[key] ?? null,
          ]),
        ),
        responseArtifact,
        renderedArtifact,
        selectedArtifact,
        sectionCount: selected.length,
        validation:
          'Exact local approved copy comparison, whitespace-normalized; local copy never substituted',
      });
      await page.close();
    }
    // Reuse source bytes, identity, capture time and provenance unchanged; only the run reference is new.
    await save('resume.docx', await readFile(path.join(originalDirectory, 'resume.docx')));
    extractionInputs.unshift({
      kind: 'historical-resume',
      sourceId: resume.sourceId,
      file: 'resume.docx',
      sha256: resume.sha256,
      originalRunId: priorRun,
      originalManifestSha256: priorHash,
    });
    const manifest = {
      formatVersion: 1,
      runId,
      stage: 'curated-baseline-captured-before-extraction',
      createdAt: new Date().toISOString(),
      benchmarkUsed: false,
      execution: 'local-operator-only',
      resume: { ...resume, linkedBaselineRunId: runId },
      pages,
      artifacts,
      extractionInputs,
      exclusions: [
        'Previous homepage capture',
        'All unselected sections, navigation and footer',
        'EXL',
        'Thingamajob',
        'Status, scaffolds and private content',
      ],
      provenanceOnly:
        'Full response/rendered snapshots must not enter extraction; use extractionInputs only',
    };
    const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
    await writeFile(path.join(directory, 'manifest.json'), bytes, { flag: 'wx', mode: 0o600 });
    const manifestSha256 = sha256(bytes);
    for (const artifact of artifacts)
      if (sha256(await readFile(path.join(directory, artifact.file))) !== artifact.sha256)
        throw new Error('Artifact verification failed');
    await writeFile(path.join(directory, 'COMMITTED.sha256'), manifestSha256 + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    return {
      runId,
      directory,
      manifestSha256,
      pages: pages.map((p) => ({ pageUrl: p.pageUrl, sectionCount: p.sectionCount })),
    };
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(
    JSON.stringify(await captureBaseline(fileURLToPath(new URL('../', import.meta.url))), null, 2),
  );
