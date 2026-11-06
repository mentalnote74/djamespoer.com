import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { applyProject } from '../../server/buildometer/project.ts';
const root = resolve('dist/djamespoer/browser');
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
};
http
  .createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://127.0.0.1:4371');
      if (u.pathname === '/api/buildometer') {
        const data = JSON.parse(await readFile('public/data/buildometer-jira.json', 'utf8'));
        const projection = JSON.parse(
          await readFile('public/data/buildometer-project.json', 'utf8'),
        );
        applyProject(data, projection);
        data.generatedAt = new Date().toISOString();
        data.sources.jira.message =
          'Local review: retained public Jira metrics; no live operator/provider call.';
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(data));
        return;
      }
      if (u.pathname.startsWith('/api/')) {
        res.writeHead(503);
        res.end('Local review: provider unavailable');
        return;
      }
      let file = resolve(root, '.' + decodeURIComponent(u.pathname));
      if (!file.startsWith(root + sep) && file !== root) throw Error('Invalid path');
      if (!extname(file)) file = resolve(file, 'index.html');
      let body;
      try {
        body = await readFile(file);
      } catch {
        file = resolve(root, 'index.csr.html');
        body = await readFile(file);
      }
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end('Local review asset unavailable');
    }
  })
  .listen(4371, '127.0.0.1', () =>
    console.log(
      'BOM review: http://127.0.0.1:4371/buildometer (retained public sources, actual ledger projection; no provider writes)',
    ),
  );
