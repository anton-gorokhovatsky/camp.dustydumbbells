import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const { base } = JSON.parse(await readFile(path.join(root, 'release.json'), 'utf8'));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/' && base !== '/') {
      res.writeHead(302, { Location: base }); res.end(); return;
    }
    if (!url.pathname.startsWith(base)) throw new Error('Not found');
    const relative = decodeURIComponent(url.pathname.slice(base.length));
    let target = path.resolve(root, relative || 'index.html');
    if (target !== root && !target.startsWith(root + path.sep)) throw new Error('Not found');
    if ((await stat(target)).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { Location: url.pathname + '/' + url.search }); res.end(); return;
      }
      target = path.join(target, 'index.html');
    }
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}${base}`));
