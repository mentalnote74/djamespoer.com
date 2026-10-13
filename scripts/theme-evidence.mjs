import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer-core';
import axe from 'axe-core';
import { startFlow, desktopConfig } from 'lighthouse';
import { palettes } from './theme-analysis.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const viewports = {
  desktop: { width: 1440, height: 900 },
  narrow: { width: 400, height: 900 },
};
export function parseOptions(args) {
  const options = {};
  const allowed = ['url', 'themes', 'routes', 'viewports', 'expected-sha', 'chrome'];
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    if (
      !args[i]?.startsWith('--') ||
      !allowed.includes(key) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--') ||
      key in options
    )
      throw new Error('Invalid or duplicate CLI option: ' + args[i]);
    options[key] = args[i + 1];
  }
  const url = new URL(options.url);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('URL must be an HTTP(S) origin without credentials, query or path');
  if (!/^[a-f0-9]{40}$/.test(options['expected-sha'] ?? ''))
    throw new Error('A full verified expected SHA is required');
  const themes =
    (options.themes ?? 'all') === 'all' ? Object.keys(palettes) : options.themes.split(',');
  const routes = (options.routes ?? '/,/about,/work/exl,/engineering').split(',');
  const sizes = (options.viewports ?? 'desktop,narrow').split(',');
  for (const [values, valid, kind] of [
    [themes, (v) => Object.hasOwn(palettes, v), 'theme'],
    [sizes, (v) => Object.hasOwn(viewports, v), 'viewport'],
    [routes, (v) => /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(v), 'route'],
  ])
    if (new Set(values).size !== values.length || values.some((v) => !valid(v)))
      throw new Error('Invalid/duplicate ' + kind);
  return {
    url: url.origin,
    themes,
    routes,
    sizes,
    expectedSha: options['expected-sha'],
    chrome: options.chrome ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  };
}
function normalize(value) {
  const v = value.trim().toLowerCase();
  if (/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(v)) return String(Number(v));
  if (/^#[a-f0-9]{3}$/.test(v)) return '#' + [...v.slice(1)].map((c) => c + c).join('');
  if (/^rgb\(/.test(v))
    return (
      '#' +
      v
        .match(/\d+/g)
        .slice(0, 3)
        .map((n) => Number(n).toString(16).padStart(2, '0'))
        .join('')
    );
  return v;
}
export function verifyIdentity(observed, theme, label, route) {
  if (
    !observed ||
    observed.theme !== theme ||
    observed.pathname !== route ||
    observed.mainCount !== 1 ||
    observed.pressed.length !== 1 ||
    observed.pressed[0] !== label ||
    !observed.guard ||
    observed.guard.navigation ||
    observed.guard.changes.some((c) => c.oldValue !== theme || c.observed !== theme)
  )
    throw new Error('Theme identity/state instability: ' + theme + ' on ' + route);
  for (const [role, value] of Object.entries(palettes[theme])) {
    if (normalize(observed.tokens[role] ?? '') !== normalize(value))
      throw new Error('Computed token mismatch: ' + role);
  }
  if (
    normalize(observed.background) !== normalize(palettes[theme]['page-background']) ||
    normalize(observed.foreground) !== normalize(palettes[theme]['page-foreground'])
  )
    throw new Error('Rendered body colors do not match requested theme');
  return observed;
}
export function auditOutcome(axeResult, lighthouseResult) {
  if (axeResult.violations.length) return 'FAIL';
  if (
    !lighthouseResult ||
    lighthouseResult.gatherMode !== 'snapshot' ||
    lighthouseResult.categories?.accessibility?.score !== 1
  )
    return 'FAIL';
  return axeResult.incomplete.length ? 'REVIEW_REQUIRED' : 'PASS';
}
async function identity(page, theme, label, route) {
  const observed = await page.evaluate((roles) => {
    const style = getComputedStyle(document.documentElement),
      body = getComputedStyle(document.body);
    return {
      theme: document.documentElement.dataset.theme,
      pathname: location.pathname,
      mainCount: document.querySelectorAll('main').length,
      pressed: [...document.querySelectorAll('#theme-navigation button[aria-pressed="true"]')].map(
        (b) => b.textContent.trim(),
      ),
      tokens: Object.fromEntries(roles.map((r) => [r, style.getPropertyValue('--' + r).trim()])),
      background: body.backgroundColor,
      foreground: body.color,
      guard: window.__themeEvidenceGuard ?? null,
    };
  }, Object.keys(palettes[theme]));
  return verifyIdentity(observed, theme, label, route);
}
async function selectTheme(page, theme, label, route) {
  await page.goto(route, { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('#theme-navigation button');
  if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== 'teetotaler')
    throw new Error('Normal bootstrap did not default to Teetotaler');
  if (await page.$eval('.site-header__menu', (b) => getComputedStyle(b).display !== 'none'))
    await page.click('.site-header__menu');
  await page.click('[aria-controls="theme-navigation"]');
  const buttons = await page.$$('#theme-navigation button');
  const labels = await Promise.all(buttons.map((b) => b.evaluate((e) => e.textContent.trim())));
  const index = labels.indexOf(label);
  if (index < 0 || labels.lastIndexOf(label) !== index)
    throw new Error('Expected theme control missing/ambiguous');
  await buttons[index].click();
  await page.waitForFunction((id) => document.documentElement.dataset.theme === id, {}, theme);
  await page.keyboard.press('Escape');
  if (
    await page.$eval('#primary-navigation', (n) => n.classList.contains('site-header__nav--open'))
  )
    await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.evaluate(() => {
    window.__themeEvidenceGuard = { navigation: false, changes: [] };
    new MutationObserver((records) =>
      window.__themeEvidenceGuard.changes.push(
        ...records.map((r) => ({
          oldValue: r.oldValue,
          observed: document.documentElement.dataset.theme,
        })),
      ),
    ).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
      attributeOldValue: true,
    });
  });
}
async function save(file, value) {
  const bytes = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  await writeFile(file, bytes);
  return { file: path.basename(file), sha256: createHash('sha256').update(bytes).digest('hex') };
}
async function run(options) {
  const source = await readFile(path.join(root, 'src/app/services/theme-state.ts'), 'utf8');
  const labels = Object.fromEntries(
    [...source.matchAll(/id: '([a-z-]+)', label: '([^']+)'/g)].map((m) => [m[1], m[2]]),
  );
  if (Object.keys(labels).join() !== Object.keys(palettes).join())
    throw new Error('Runtime/Sass theme manifest mismatch');
  const capturedAt = new Date().toISOString();
  const destination = path.join(root, 'tmp/theme-evidence', capturedAt.replace(/[:.]/g, '-'));
  await mkdir(destination, { recursive: true });
  const profileRoot = path.resolve(tmpdir());
  const profile = await mkdtemp(path.join(profileRoot, 'djamespoer-theme-evidence-'));
  const report = {
    status: 'RUNNING',
    capturedAt,
    timezone: 'America/New_York',
    target: options.url,
    environment: ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(options.url).hostname)
      ? 'local rendered target'
      : 'remote rendered target',
    expectedSha: options.expectedSha,
    runnerSha256: createHash('sha256')
      .update(await readFile(fileURLToPath(import.meta.url)))
      .digest('hex'),
    deploymentVerification:
      'Operator-supplied expectation; runner does not independently attest Cloudflare deployment SHA',
    sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    sourceChanges: execFileSync('git', ['diff', '--name-only', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean),
    mode: 'Lighthouse snapshot accessibility only; Performance/loading metrics Not captured',
    motion: 'prefers-reduced-motion: reduce',
    axeVersion: axe.version,
    entries: [],
  };
  let browser;
  const checkpoint = async () => {
    await save(path.join(destination, 'summary.json'), report);
    await save(
      path.join(destination, 'summary.md'),
      `# Theme evidence\n\nTarget: ${report.target}\nEnvironment: ${report.environment}\nExpected SHA: ${report.expectedSha}\n${report.deploymentVerification}\nSource checkpoint: ${report.sourceSha}\nRunner SHA-256: ${report.runnerSha256}\nCaptured: ${report.capturedAt} (UTC; local timezone ${report.timezone})\nChrome: ${report.browserVersion ?? 'Not captured'}\naxe-core: ${report.axeVersion}\nMode: ${report.mode}\nStatus: ${report.status}\n\n| Theme | Route | Viewport | Menu | Identity stable | Axe violations / incomplete | Lighthouse accessibility (0–100) | Result |\n|---|---|---|---|---|---|---|---|\n` +
        report.entries
          .map(
            (e) =>
              `| ${e.theme} | ${e.route} | ${e.viewport} | ${e.menuState} | ${e.identityVerified ? 'yes' : 'NO'} | ${e.axeViolations ?? 'Not captured'} / ${e.axeIncomplete ?? 'Not captured'} | ${typeof e.lighthouseScore === 'number' ? e.lighthouseScore * 100 : 'Not captured'} | ${e.status} |`,
          )
          .join('\n') +
        (report.error ? '\n\nFailure: ' + report.error : ''),
    );
  };
  try {
    browser = await puppeteer.launch({
      executablePath: options.chrome,
      userDataDir: profile,
      headless: true,
    });
    report.browserVersion = await browser.version();
    for (const theme of options.themes)
      for (const route of options.routes)
        for (const size of options.sizes)
          for (const menuState of route === '/' ? ['closed', 'theme-open'] : ['closed']) {
            const page = await browser.newPage();
            await page.setViewport(viewports[size]);
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            const entry = {
              theme,
              route,
              viewport: size,
              menuState,
              dimensions: viewports[size],
              identityVerified: false,
              status: 'RUNNING',
              checks: [],
              artifacts: [],
            };
            report.entries.push(entry);
            const prefix = `${theme}-${route.replaceAll('/', '_')}-${size}-${menuState}`;
            let navigated = false;
            try {
              await selectTheme(page, theme, labels[theme], new URL(route, options.url).href);
              if (menuState === 'theme-open') {
                if (
                  await page.$eval(
                    '.site-header__menu',
                    (b) => getComputedStyle(b).display !== 'none',
                  )
                )
                  await page.click('.site-header__menu');
                await page.click('[aria-controls="theme-navigation"]');
              }
              page.on('framenavigated', (frame) => {
                if (frame === page.mainFrame()) navigated = true;
              });
              const check = async (stage) => {
                if (navigated) throw new Error('Unexpected navigation during capture');
                entry.checks.push({
                  stage,
                  at: new Date().toISOString(),
                  state: await identity(page, theme, labels[theme], route),
                });
              };
              await check('before-axe');
              await page.evaluate(axe.source);
              const axeResult = await page.evaluate(async () =>
                window.axe.run(document, {
                  runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
                  },
                }),
              );
              await check('after-axe');
              entry.axeViolations = axeResult.violations.length;
              entry.axeIncomplete = axeResult.incomplete.length;
              entry.artifacts.push(
                await save(path.join(destination, prefix + '-axe.json'), axeResult),
              );
              if (entry.axeViolations) {
                entry.identityVerified = true;
                entry.status = 'FAIL';
                throw new Error('Rendered axe violations: ' + entry.axeViolations);
              }
              await check('before-lighthouse');
              const flow = await startFlow(page, {
                config: desktopConfig,
                flags: { onlyCategories: ['accessibility'], screenEmulation: { disabled: true } },
              });
              try {
                await flow.snapshot({ name: `${theme} ${route} ${size}` });
                await check('after-lighthouse');
                const result = await flow.createFlowResult();
                const lhr = result.steps[0].lhr;
                entry.lighthouseVersion = lhr.lighthouseVersion;
                entry.lighthouseScore = lhr.categories?.accessibility?.score;
                entry.artifacts.push(
                  await save(path.join(destination, prefix + '-lighthouse.json'), result),
                );
                entry.artifacts.push(
                  await save(
                    path.join(destination, prefix + '-lighthouse.html'),
                    await flow.generateReport(),
                  ),
                );
                entry.status = auditOutcome(axeResult, lhr);
              } finally {
                await flow.dispose();
              }
              await check('after-report');
              entry.identityVerified = true;
              if (entry.status === 'FAIL')
                throw new Error('Lighthouse snapshot accessibility did not pass');
              console.log(
                `${theme} ${route} ${size} ${menuState}: ${entry.status}; axe ${entry.axeViolations}, incomplete ${entry.axeIncomplete}, Lighthouse accessibility ${entry.lighthouseScore * 100}`,
              );
            } catch (error) {
              entry.status = 'FAIL';
              entry.error = error.message;
              const screenshot = path.join(destination, prefix + '-failure.png');
              try {
                const bytes = await page.screenshot({ path: screenshot, fullPage: true });
                entry.artifacts.push({
                  file: path.basename(screenshot),
                  sha256: createHash('sha256').update(bytes).digest('hex'),
                });
              } catch {
                /* report remains useful without screenshot */
              }
              throw error;
            } finally {
              await page.close();
              await checkpoint();
            }
          }
    report.status = report.entries.some((e) => e.status === 'REVIEW_REQUIRED')
      ? 'REVIEW_REQUIRED'
      : 'PASS';
  } catch (error) {
    report.status = 'FAIL';
    report.error = error.message;
  } finally {
    if (browser) await browser.close();
    if (
      path.dirname(path.resolve(profile)) !== profileRoot ||
      !path.basename(profile).startsWith('djamespoer-theme-evidence-')
    )
      throw new Error('Refusing unsafe profile cleanup');
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    await checkpoint();
  }
  console.log('Evidence: ' + destination);
  if (report.status !== 'PASS') process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await run(parseOptions(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
