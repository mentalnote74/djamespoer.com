// Local production-build preview only. Not bundled or deployed; never proxies APIs.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
export async function startPreview({ root = 'dist/djamespoer/browser', port = 0 } = {}) {
  root = path.resolve(root);
  const server = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') {
        res.writeHead(405);
        return res.end();
      }
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/test/')) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end('{"unavailable":true}');
      }
      let file = path.resolve(root, '.' + url.pathname);
      if (!file.startsWith(root + path.sep) && file !== root) throw Error('outside root');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      let body = await readFile(file);
      const ext = path.extname(file),
        gzip = /\.(html|js|css|json|svg)$/.test(file);
      if (ext === '.html' && url.searchParams.get('preview') === 'big-dumb-bass') {
        // Exercise existing controls after hydration, rather than add a production route.
        body = Buffer.from(
          body.toString().replace(
            '</body>',
            `<script>
        (async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));await sleep(2500);
          for(let n=0;n<40;n++){const shown=document.querySelector('.carousel__slide:not([hidden])');
            if(shown?.dataset.slideId==='big-dumb-bass'){document.querySelector('dialog[open] .cookie-close')?.click();return;}
            document.querySelector('[aria-label="Next slide"]')?.click();await sleep(250);
          }
        })();</script></body>`,
          ),
        );
      }
      res.writeHead(200, {
        'Content-Type': types[ext] || 'application/octet-stream',
        ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public,max-age=86400',
      });
      res.end(gzip ? gzipSync(body) : body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return {
    server,
    base: 'http://127.0.0.1:' + server.address().port,
    close: () =>
      new Promise((r) => {
        server.close(r);
        server.closeAllConnections();
      }),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { base } = await startPreview({ port: Number(process.env.PORT || 8835) });
  console.log(base + '/?preview=big-dumb-bass');
}
