// Zero-dependency static server for previewing the prototype.
//   node serve.js  ->  http://localhost:4321
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

http
  .createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);

    // The React build is compiled with a GitHub Pages base of
    // /exhale-landing-rebuild/, so its asset URLs are absolute and 404 when the
    // same files are served from the repo root. Strip the prefix here rather
    // than rewriting the build output — the absolute base is correct in
    // production, and editing it would break the deploy to fix the preview.
    if (rel.startsWith('/exhale-landing-rebuild/')) {
      rel = rel.slice('/exhale-landing-rebuild'.length);
    }

    if (rel.endsWith('/')) rel += 'index.html';

    let file = path.join(ROOT, rel);
    // Keep requests inside the prototype directory.
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    // cleanUrls parity with vercel.json: /faqs -> faqs.html
    if (!path.extname(file) && fs.existsSync(file + '.html')) file += '.html';

    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found: ' + rel);
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log('Prototype running at http://localhost:' + PORT));
