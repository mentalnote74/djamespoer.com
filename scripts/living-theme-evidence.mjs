// Browser-only clock seam. No test flags, storage, or clock hooks enter the app.
import { mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import axe from 'axe-core';
import { startFlow, desktopConfig } from 'lighthouse';
import { palettes } from './theme-analysis.mjs';

const span = 48 * 60 * 1000;
export const livingCases = [
  { name: 'start', time: 0, from: 'tequila-sunset' },
  { name: 'sunset-wipe', time: 1, from: 'rum-runner', wipe: 'sunset', outgoing: 'tequila-sunset' },
  { name: 'sunset-after', time: 400, from: 'rum-runner', to: 'bloody-mary', progress: 0 },
  {
    name: 'early',
    time: 400 + 30000,
    from: 'rum-runner',
    to: 'bloody-mary',
    progress: 30000 / span,
  },
  { name: 'later', time: 400 + span / 2, from: 'rum-runner', to: 'bloody-mary', progress: 0.5 },
  {
    name: 'sunrise-before',
    time: span + 400 - 1000,
    from: 'rum-runner',
    to: 'bloody-mary',
    progress: 1 - 1000 / span,
  },
  {
    name: 'sunrise-wipe',
    time: span + 400,
    from: 'tequila-sunrise',
    wipe: 'sunrise',
    outgoing: 'bloody-mary',
  },
  { name: 'sunrise-after', time: span + 800, from: 'tequila-sunrise', to: 'mojito', progress: 0 },
  {
    name: 'cycle-before',
    time: 5 * span + 800 - 1000,
    from: 'mai-tai',
    to: 'tequila-sunset',
    progress: 1 - 1000 / span,
  },
  {
    name: 'cycle-wrap',
    time: 5 * span + 800,
    from: 'rum-runner',
    wipe: 'sunset',
    outgoing: 'tequila-sunset',
  },
];

function rgb(value) {
  const v = value.trim().toLowerCase();
  if (/^#[\da-f]{3}$/.test(v)) return [...v.slice(1)].map((c) => parseInt(c + c, 16));
  if (/^#[\da-f]{6}$/.test(v))
    return v
      .slice(1)
      .match(/../g)
      .map((c) => parseInt(c, 16));
  return /^rgb\(/.test(v)
    ? v
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
    : null;
}
export function expectedLivingTokens(point) {
  return Object.fromEntries(
    Object.entries(palettes[point.from]).map(([role, value]) => {
      const a = rgb(value),
        b = point.to ? rgb(palettes[point.to][role]) : null;
      return [role, a && b ? a.map((v, i) => v + (b[i] - v) * point.progress) : (a ?? value)];
    }),
  );
}
export function verifyLivingIdentity(state, point, route) {
  if (
    state.root !== point.from ||
    state.route !== route ||
    state.main !== 1 ||
    state.pressed.join() !== 'Dusk-to-Dusk' ||
    state.wipe !== (point.wipe ?? null) ||
    state.clock !== point.time ||
    state.now !== point.time ||
    state.navigation ||
    !state.guard ||
    state.guard.changes.some((c) => c.oldValue !== point.from || c.observed !== point.from)
  )
    throw new Error('Living identity/clock/navigation mismatch: ' + point.name);
  const expected = expectedLivingTokens(point);
  for (const [role, value] of Object.entries(expected)) {
    const actual = state.tokens[role];
    if (Array.isArray(value)) {
      const observed = rgb(actual ?? '');
      if (!observed || value.some((v, i) => Math.abs(v - observed[i]) > 0.01))
        throw new Error('Living semantic token mismatch: ' + role);
    } else if (String(actual).trim() !== String(value).trim())
      throw new Error('Living non-color token mismatch: ' + role);
  }
  for (const [actual, role] of [
    [state.background, 'page-background'],
    [state.foreground, 'page-foreground'],
  ]) {
    const observed = rgb(actual);
    if (!observed || expected[role].some((v, i) => Math.abs(v - observed[i]) > 1))
      throw new Error('Living rendered color mismatch: ' + role);
  }
  if (
    point.wipe &&
    (state.snapshot?.outgoing !== point.outgoing ||
      state.snapshot?.incoming !== point.from ||
      state.snapshot?.direction !== point.wipe ||
      state.duration !== 400 ||
      state.opacity !== '1' ||
      state.clip !== (point.wipe === 'sunset' ? 'inset(0px 50% 0px 0px)' : 'inset(50% 0px 0px)') ||
      state.inlineBackground !== '')
  )
    throw new Error('Complete-state wipe identity mismatch');
  return state;
}
export function verifyAdvancement(early, later) {
  if (
    later.clock <= early.clock ||
    early.root !== later.root ||
    early.background === later.background ||
    early.tokens['page-background'] === later.tokens['page-background']
  )
    throw new Error('Living Mode did not measurably advance');
  return {
    fromMs: early.clock,
    toMs: later.clock,
    from: early.background,
    to: later.background,
    verified: true,
  };
}
export async function installLivingClock(page) {
  await page.evaluateOnNewDocument(() => {
    window.__livingEvidence = { clock: 0, ready: false, snapshot: null };
    performance.now = () => window.__livingEvidence.clock;
    if (document.startViewTransition) {
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        const outgoing = document.documentElement.dataset.theme;
        const transition = start(update);
        transition.ready
          .then(() => {
            window.__livingEvidence.snapshot = {
              outgoing,
              incoming: document.documentElement.dataset.theme,
              direction: document.documentElement.dataset.themeWipe,
            };
            for (const animation of document.getAnimations())
              if (animation.effect?.pseudoElement === '::view-transition-new(root)') {
                animation.pause();
                animation.currentTime = 200;
              }
            window.__livingEvidence.ready = true;
          })
          .catch(() => {});
        return transition;
      };
    }
  });
}
export async function runLivingEvidence(options, { auditOutcome, selectTheme, viewports }) {
  const directory = path.resolve(
    'tmp/living-theme-evidence',
    new Date().toISOString().replace(/[:.]/g, '-'),
  );
  await mkdir(directory, { recursive: true });
  const profileRoot = path.resolve(tmpdir());
  const profile = await mkdtemp(path.join(profileRoot, 'djamespoer-living-evidence-'));
  const report = {
    status: 'RUNNING',
    target: options.url,
    expectedSha: options.expectedSha,
    verifiedDeployedSha: null,
    deploymentVerification: 'Expected SHA supplied by operator; not independently attested',
    capturedAt: new Date().toISOString(),
    timezone: 'America/New_York',
    mode: 'Controlled browser clock; Lighthouse snapshot Accessibility only. No navigation Performance/loading evidence.',
    motion: 'no-preference',
    axeVersion: axe.version,
    sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceChanges: execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean),
    environment: ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(options.url).hostname)
      ? 'local rendered target'
      : 'remote rendered target',
    runnerSha256: createHash('sha256')
      .update(await readFile(fileURLToPath(import.meta.url)))
      .digest('hex'),
    entries: [],
    advancement: [],
  };
  let browser;
  const save = async (name, value) => {
    const bytes = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    await writeFile(path.join(directory, name), bytes);
    return { file: name, sha256: createHash('sha256').update(bytes).digest('hex') };
  };
  try {
    browser = await puppeteer.launch({
      executablePath: options.chrome,
      userDataDir: profile,
      headless: true,
    });
    report.chrome = await browser.version();
    for (const route of options.routes)
      for (const viewport of options.sizes) {
        const page = await browser.newPage();
        await page.setViewport(viewports[viewport]);
        await page.emulateMediaFeatures([
          { name: 'prefers-reduced-motion', value: 'no-preference' },
        ]);
        await installLivingClock(page);
        await selectTheme(page, 'tequila-sunset', 'Dusk-to-Dusk', new URL(route, options.url).href);
        await page.waitForNetworkIdle({ idleTime: 100 });
        let navigation = false;
        page.on('framenavigated', (frame) => {
          if (frame === page.mainFrame()) navigation = true;
        });
        const states = {};
        for (const point of livingCases) {
          const entry = {
            name: point.name,
            route,
            viewport,
            timeMs: point.time,
            status: 'RUNNING',
            checks: [],
            artifacts: [],
          };
          report.entries.push(entry);
          await page.evaluate((time) => {
            window.__livingEvidence.clock = time;
            window.__livingEvidence.ready = false;
          }, point.time);
          if (point.wipe)
            await page.waitForFunction(() => window.__livingEvidence.ready, { timeout: 5000 });
          else {
            await page.waitForFunction(
              (anchor) => document.documentElement.dataset.theme === anchor,
              {},
              point.from,
            );
            await new Promise((resolve) => setTimeout(resolve, 1200));
          }
          await page.evaluate(() => {
            window.__themeEvidenceGuard.changes = [];
          });
          const check = async (stage) => {
            const state = await page.evaluate((roles) => {
              const root = document.documentElement,
                style = getComputedStyle(root),
                body = getComputedStyle(document.body);
              const pseudo = getComputedStyle(root, '::view-transition-new(root)');
              const animation = document
                .getAnimations()
                .find((a) => a.effect?.pseudoElement === '::view-transition-new(root)');
              return {
                root: root.dataset.theme,
                route: location.pathname,
                main: document.querySelectorAll('main').length,
                pressed: [
                  ...document.querySelectorAll('#theme-navigation button[aria-pressed=true]'),
                ].map((e) => e.textContent.trim()),
                tokens: Object.fromEntries(
                  roles.map((r) => [r, style.getPropertyValue('--' + r).trim()]),
                ),
                background: body.backgroundColor,
                foreground: body.color,
                wipe: root.dataset.themeWipe ?? null,
                clock: window.__livingEvidence.clock,
                now: performance.now(),
                snapshot: window.__livingEvidence.snapshot,
                guard: window.__themeEvidenceGuard,
                inlineBackground: root.style.getPropertyValue('--page-background'),
                clip: pseudo.clipPath,
                opacity: pseudo.opacity,
                duration: animation?.effect.getTiming().duration,
              };
            }, Object.keys(palettes[point.from]));
            state.navigation = navigation;
            verifyLivingIdentity(state, point, route);
            entry.checks.push({ stage, state });
            return state;
          };
          states[point.name] = await check('before-axe');
          await page.evaluate(axe.source);
          const result = await page.evaluate(() =>
            window.axe.run(document, {
              runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
              },
            }),
          );
          await check('after-axe');
          entry.axeViolations = result.violations.length;
          entry.axeIncomplete = result.incomplete.length;
          const prefix = `${route.replaceAll('/', '_')}-${viewport}-${point.name}`;
          entry.artifacts.push(await save(prefix + '-axe.json', result));
          if (result.violations.length)
            throw new Error('Rendered axe violation; stop without altering palettes');
          await check('before-lighthouse');
          const flow = await startFlow(page, {
            config: desktopConfig,
            flags: { onlyCategories: ['accessibility'], screenEmulation: { disabled: true } },
          });
          try {
            await flow.snapshot({ name: prefix });
            await check('after-lighthouse');
            const captured = await flow.createFlowResult(),
              lhr = captured.steps[0].lhr;
            entry.lighthouseVersion = lhr.lighthouseVersion;
            entry.lighthouseAccessibility = lhr.categories.accessibility.score * 100;
            entry.status = auditOutcome(result, lhr);
            entry.artifacts.push(await save(prefix + '-lighthouse.json', captured));
            entry.artifacts.push(
              await save(prefix + '-lighthouse.html', await flow.generateReport()),
            );
          } finally {
            await flow.dispose();
          }
          await check('after-report');
          entry.identityVerified = true;
          const screenshot = await page.screenshot({ path: path.join(directory, prefix + '.png') });
          entry.artifacts.push({
            file: prefix + '.png',
            sha256: createHash('sha256').update(screenshot).digest('hex'),
          });
          if (point.wipe) {
            await page.evaluate(() =>
              document
                .getAnimations()
                .filter((a) => a.effect?.pseudoElement === '::view-transition-new(root)')
                .forEach((a) => a.play()),
            );
            await page.waitForFunction(() => !document.documentElement.dataset.themeWipe);
          }
          if (entry.status === 'FAIL') throw new Error('Lighthouse snapshot Accessibility failure');
          console.log(
            `${route} ${viewport} ${point.name}: ${entry.status}; axe ${entry.axeViolations}; Lighthouse ${entry.lighthouseAccessibility}`,
          );
        }
        report.advancement.push({
          route,
          viewport,
          ...verifyAdvancement(states.early, states.later),
        });
        await page.close();
      }
    report.status = report.entries.some((e) => e.status === 'REVIEW_REQUIRED')
      ? 'REVIEW_REQUIRED'
      : 'PASS';
  } catch (error) {
    report.status = 'FAIL';
    report.error = error.message;
    const current = report.entries.at(-1);
    if (current?.status === 'RUNNING') {
      current.status = 'FAIL';
      current.error = error.message;
    }
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (
      path.dirname(profile) !== profileRoot ||
      !path.basename(profile).startsWith('djamespoer-living-evidence-')
    )
      throw new Error('Unsafe profile cleanup');
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    await save('summary.json', report);
    await save(
      'summary.md',
      `# Living theme evidence\n\nTarget: ${report.target}\nExpected SHA: ${report.expectedSha}\n${report.deploymentVerification}\n${report.mode}\nStatus: ${report.status}\n\n` +
        report.entries
          .map(
            (e) =>
              `- ${e.route} / ${e.viewport} / ${e.name} at ${e.timeMs}ms: ${e.status}; identity ${e.identityVerified ?? false}; axe ${e.axeViolations ?? 'Not captured'}; Lighthouse ${e.lighthouseAccessibility ?? 'Not captured'}`,
          )
          .join('\n') +
        (report.error ? '\n\nFailure: ' + report.error : ''),
    );
  }
  console.log('Evidence: ' + directory);
  if (report.status !== 'PASS') process.exitCode = 1;
}
