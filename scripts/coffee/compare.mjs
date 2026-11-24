// [Larry] SCRUM-215: real, sequential browser audits on one host. No PSI.
import lighthouse from 'lighthouse';
import desktop from 'lighthouse/core/config/desktop-config.js';
import puppeteer from 'puppeteer-core';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import {
  COFFEE_CATEGORIES,
  COFFEE_SELF_URL,
  normalizeSiteUrl,
  matchingCoffeeTests,
} from '../../src/app/features/coffee/coffee-contract.ts';
const collector = (url) =>
  /https:\/\/[^/]*(?:google-analytics\.com|analytics\.google\.com)\/(?:g\/)?collect\b/.test(url) ||
  /\/cdn-cgi\/rum(?:\?|$)/.test(url);
const privateAddress = (ip) =>
  isIP(ip) === 4
    ? /^(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7]))\./.test(
        ip,
      )
    : /^(::|fc|fd|fe[89ab])/i.test(ip);
export async function compare(job, { executablePath, signal, onRun = () => {} } = {}) {
  if (job.tests.length !== 1 || !['desktop', 'mobile'].includes(job.tests[0]))
    throw Error('Invalid test selection');
  const strategy = job.tests[0];
  const config = {
    extends: 'lighthouse:default',
    settings: {
      ...(strategy === 'desktop' ? desktop.settings : {}),
      onlyCategories: COFFEE_CATEGORIES.map((c) => c.psi),
      locale: 'en-US',
      throttlingMethod: 'simulate',
      disableStorageReset: false,
      output: 'json',
      maxWaitForLoad: 45000,
      maxWaitForFcp: 30000,
    },
  };
  const response = {
    mode: job.url ? 'challenge' : 'solo',
    tests: job.tests,
    visitor: null,
    james: null,
  };
  for (const role of job.url ? ['visitor', 'james'] : ['james']) {
    signal?.throwIfAborted();
    const url = role === 'visitor' ? job.url : COFFEE_SELF_URL;
    const normalized = normalizeSiteUrl(url);
    if (!normalized.ok) throw Error('Invalid public target');
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-extensions', '--disable-background-networking', '--no-first-run'],
    });
    const stop = () => {
      void browser.close();
    };
    signal?.addEventListener('abort', stop, { once: true });
    try {
      signal?.throwIfAborted();
      const page = await browser.newPage();
      if (job.internal)
        await page.evaluateOnNewDocument(() => {
          try {
            localStorage.setItem('portfolio.analytics.internal', '1');
          } catch {}
        });
      const addresses = new Map();
      const publicHost = async (hostname) => {
        if (!addresses.has(hostname))
          addresses.set(
            hostname,
            lookup(hostname, { all: true })
              .then((all) => all.length > 0 && all.every((x) => !privateAddress(x.address)))
              .catch(() => false),
          );
        return addresses.get(hostname);
      };
      await page.setRequestInterception(true);
      page.on('request', async (request) => {
        try {
          const u = new URL(request.url());
          if (
            collector(u.href) ||
            (['http:', 'https:'].includes(u.protocol) && !(await publicHost(u.hostname)))
          )
            return void request.abort('blockedbyclient');
          if (!['http:', 'https:', 'data:', 'blob:', 'about:'].includes(u.protocol))
            return void request.abort('blockedbyclient');
          await request.continue();
        } catch {
          if (!request.isInterceptResolutionHandled()) void request.abort('blockedbyclient');
        }
      });
      const session = await page.createCDPSession();
      const version = await session.send('Browser.getVersion');
      await session.detach();
      onRun({ role, state: 'running' });
      const result = await lighthouse(url, { logLevel: 'silent' }, structuredClone(config), page);
      const lhr = result?.lhr;
      if (!lhr || lhr.runtimeError?.code) throw Error(lhr?.runtimeError?.code ?? 'no_result');
      const scores = {};
      for (const c of COFFEE_CATEGORIES) {
        const score = lhr.categories[c.psi]?.score;
        if (typeof score !== 'number') throw Error('missing_score');
        scores[c.id] = Math.round(score * 100);
      }
      const settingsKey = JSON.stringify(lhr.configSettings);
      response[role] = {
        url,
        host: normalized.host,
        mobile: null,
        desktop: null,
        [strategy]: {
          scores,
          fetchedAt: lhr.fetchTime,
          lighthouseVersion: lhr.lighthouseVersion,
          chromeVersion: version.product,
          settingsKey,
          formFactor: lhr.configSettings.formFactor,
          locale: lhr.configSettings.locale,
          reportUrl: '',
          metrics: Object.fromEntries(
            [
              'first-contentful-paint',
              'largest-contentful-paint',
              'total-blocking-time',
              'cumulative-layout-shift',
              'speed-index',
            ].map((id) => [id, lhr.audits[id]?.numericValue ?? null]),
          ),
        },
      };
      onRun({ role, state: 'complete' });
    } catch (error) {
      signal?.throwIfAborted();
      response.error = 'runner_unavailable';
      onRun({ role, state: 'failed', code: String(error?.message ?? 'no_result').slice(0, 80) });
    } finally {
      signal?.removeEventListener('abort', stop);
      await browser.close();
    }
  }
  response.comparable =
    (response.mode === 'solo' && !!response.james) ||
    !!(
      response.visitor &&
      response.james &&
      matchingCoffeeTests(response.visitor, response.james, job.tests)
    );
  if (response.mode === 'challenge' && !response.comparable)
    response.error = response.error ?? 'test_mismatch';
  return response;
}
