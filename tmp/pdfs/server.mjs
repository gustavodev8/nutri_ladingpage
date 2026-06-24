import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = 'C:/Users/Lenovo/Documents/GitHub/nutri_ladingpage/tmp/pdfs';
const port = 4178;

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const safePath = normalize(join(root, pathname));
  if (!safePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  let filePath = safePath;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = extname(filePath).toLowerCase();
  const type = ext === '.pdf' ? 'application/pdf' : ext === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(filePath).pipe(res);
});
server.listen(port, '127.0.0.1', () => console.log(`serving on ${port}`));
