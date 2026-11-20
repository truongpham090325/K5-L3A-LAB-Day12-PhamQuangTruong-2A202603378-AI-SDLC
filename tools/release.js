// Tạo GitHub Release v1.0.0 cho Đảo Đèn Lồng. Lệnh: node tools/release.js [token]
import { readFile, writeFile } from 'node:fs/promises';

const token = process.argv[2];
if (!token) { console.error('cần token'); process.exit(1); }
const repo = 'truongpham090325/K5-L3A-LAB-Day12-PhamQuangTruong-2A202603378-AI-SDLC';

const body = [
  "Game 3D 'Đảo Đèn Lồng' — phát hành được (4 phase: 3 Đêm, nhiên liệu đèn, Bóng Mực hút dầu, luật thắng bình minh, benchmark/soak/leaderboard/dễ tiếp cận).",
  '',
  '**Chạy:**',
  '```bash',
  'npm install && npm start   # mở game: http://localhost:8080',
  '```',
  '**Headless (Test Contract v1.3):**',
  '```bash',
  'node src/headless.js --seed 1 --night 1 --ticks 30 --out out.jsonl',
  '```',
  '**Bench / Soak:**',
  '```bash',
  'node src/bench.js --seed 42 --duration 30 --out bench.json',
  'node src/soak.js --seed 7 --nights 10 --out soak.json',
  '```',
  '**Xuất điểm xếp hạn:** `npm start -- --export-leaderboard out.json`',
  '**Bằng chứng:** `docs/proof/phase-1..4/`, test: `npm test`.',
].join('\n');

const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
  method: 'POST',
  headers: {
    'Accept': 'application/vnd.github+json',
    'Authorization': `token ${token}`,
    'User-Agent': 'ddl-release',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ tag_name: 'v1.0.0', name: 'Đảo Đèn Lồng — Phát hành v1.0.0', body, prerelease: false, draft: false }),
});
const data = await res.json().catch(() => null);
if (!res.ok) {
  console.error('Release:', res.status, JSON.stringify(data).slice(0, 500));
  process.exit(1);
}
console.log('Release created:', data.html_url, 'id:', data.id);

// Gửi zip game làm asset
const zipPath = 'Daol Den-Long-v1.0.0.zip';
const { spawn } = await import('node:child_process');
const upUrl = data.upload_url.replace('{?name,label}', '?name=game.zip');
const zipData = await readFile(zipPath);
const upRes = await fetch(upUrl, {
  method: 'POST',
  headers: {
    'Authorization': `token ${token}`,
    'Content-Type': 'application/octet-stream',
    'User-Agent': 'ddl-release',
    'Content-Length': zipData.length,
  },
  body: zipData,
});
const upData = await upRes.json().catch(() => null);
console.log('Upload:', upRes.status, upData && upData.browser_download_url ? 'ok' : JSON.stringify(upData).slice(0, 300));
