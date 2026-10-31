import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('apps/mobile/dist');
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try { if (!(await stat(file)).isFile()) file = resolve(root,'index.html'); } catch { if (extname(pathname)) { res.writeHead(404).end(); return; } file = resolve(root,'index.html'); }
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream'}); res.end(await readFile(file));
  } catch { res.writeHead(400).end(); }
}).listen(4173,'127.0.0.1',() => console.log('Preview: http://127.0.0.1:4173'));
