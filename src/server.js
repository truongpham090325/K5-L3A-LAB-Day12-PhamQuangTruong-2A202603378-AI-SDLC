// Máy chủ tĩnh tối giản (không phụ thuộc thư viện ngoài) để chạy game trên trình duyệt.
// Chạy bằng: node src/server.js  (hoặc npm start)

import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
let benchResult = null;
let leaderboardPath = resolve(ROOT, 'leaderboard.json');
async function readLeaderboard() {
  try {
    const data = JSON.parse(await readFile(leaderboardPath, 'utf8'));
    return data;
  } catch {
    return { entries: [] };
  }
}
async function saveLeaderboard(lb) {
  await writeFile(leaderboardPath, JSON.stringify(lb, null, 2), 'utf8');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath === '/') urlPath = '/index.html';

    // POST /api/bench — nhận metrics bench từ trình duyệt, ghi bench.json
    if (req.method === 'POST' && urlPath === '/api/bench') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          benchResult = JSON.parse(body);
          await writeFile(resolve(ROOT, 'bench.json'), JSON.stringify(benchResult, null, 2), 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('bad bench payload');
        }
      });
      return;
    }
    // GET /api/bench-status
    if (req.method === 'GET' && urlPath === '/api/bench-status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(benchResult));
      return;
    }

    // GET /api/leaderboard
    if (req.method === 'GET' && urlPath === '/api/leaderboard') {
      const lb = await readLeaderboard();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(lb));
      return;
    }
    // POST /api/leaderboard — cập nhật bảng xếp hạn (lưu leaderboard.json)
    if (req.method === 'POST' && urlPath === '/api/leaderboard') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          await saveLeaderboard(JSON.parse(body));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        } catch {
          res.writeHead(400);
          res.end('bad');
        }
      });
      return;
    }

    const filePath = resolve(ROOT, '.' + urlPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found: ' + req.url);
  }
});

// Chế độ xuất bảng xếp hạn: npm start -- --export-leaderboard out.json
if (process.argv[2] === '--export-leaderboard') {
  (async () => {
    const out = process.argv[3] || 'leaderboard.json';
    const lb = await readLeaderboard();
    const entries = (lb.entries || []).slice().sort((a, b) => (b.score - a.score) || new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime());
    await writeFile(out, JSON.stringify({ entries }, null, 2), 'utf8');
    console.log('Xuất bảng xếp hạn -> ' + out + ' (' + entries.length + ' mục)');
    process.exit(0);
  })();
}

server.listen(PORT, () => {
  const url = 'http://localhost:' + PORT;
  console.log('Đảo Đèn Lồng đang chạy tại: ' + url);
  console.log('Nhấn Ctrl+C để dừng.');
  openBrowser(url);
});

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (e) {
    // bỏ qua nếu không mở được trình duyệt tự động
  }
}
