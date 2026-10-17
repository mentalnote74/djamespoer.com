import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../dist/djamespoer/browser/', import.meta.url));
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

/** Loopback review of built public assets, with production-equivalent indexing on the case study. */
export function createPortfolioReviewServer() {
  return http.createServer((request, response) => {
    if (
      !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(request.headers.host ?? '') ||
      !['GET', 'HEAD'].includes(request.method)
    ) {
      response.writeHead(403);
      response.end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400);
      response.end();
      return;
    }
    let file = path.resolve(root, '.' + pathname);
    if (
      (file !== path.resolve(root) && !file.startsWith(path.resolve(root) + path.sep)) ||
      pathname.startsWith('/api/')
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (path.extname(pathname)) {
        response.writeHead(404);
        response.end();
        return;
      }
      file = path.join(root, 'index.html');
    }
    const publicCaseStudy = pathname === '/thingamajob' || pathname === '/thingamajob/';
    const contentType = types[path.extname(file)] ?? 'application/octet-stream';
    const accepts = request.headers['accept-encoding'] ?? '';
    const text = /^(text\/|application\/(json|xml)|image\/svg)/.test(contentType);
    const encoding =
      text && /\bbr\b/.test(accepts) ? 'br' : text && /\bgzip\b/.test(accepts) ? 'gzip' : null;
    const original = fs.readFileSync(file);
    const bytes =
      encoding === 'br'
        ? brotliCompressSync(original, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } })
        : encoding === 'gzip'
          ? gzipSync(original)
          : original;
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      Vary: 'Accept-Encoding',
      'Content-Length': bytes.length,
      ...(encoding ? { 'Content-Encoding': encoding } : {}),
      ...(publicCaseStudy ? {} : { 'X-Robots-Tag': 'noindex, nofollow' }),
    });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createPortfolioReviewServer().listen(4406, '127.0.0.1', () => {
    console.log('Public case-study review: http://127.0.0.1:4406/thingamajob');
  });
}
