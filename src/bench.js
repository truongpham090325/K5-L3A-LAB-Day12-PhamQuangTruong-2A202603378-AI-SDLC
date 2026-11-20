// Bench: chạy game ở cảnh benchmark (200 Bóng Mực, 100 đom đóm, 3 đèn sáng, camera vòng tròn)
// và xuất bench.json. Lệnh: node src/bench.js --seed 42 --duration 30 --out bench.json

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const val = argv[i + 1];
    if (val == null || val.startsWith('--')) a[key] = true;
    else { a[key] = val; i++; }
  }
  return a;
}

async function pollBench(port, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://localhost:${port}/bench.json`);
      if (r.ok) {
        const data = await r.json();
        if (data && data.avg_fps != null) return data;
      }
    } catch (e) {
      // chờ
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const seed = Number(args.seed || 42);
  const duration = Number(args.duration || 30);
  const out = args.out || 'bench.json';
  const port = 8080;

  const server = spawn('node', ['src/server.js'], { stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => process.stdout.write('[server] ' + d));
  server.stderr.on('data', (d) => process.stderr.write('[server] ' + d));
  await new Promise((r) => setTimeout(r, 1200));

  const url = `http://localhost:${port}/index.html?bench=1&duration=${duration}&seed=${seed}`;
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (e) {
    // tự động mở trình duyệt thất bại — người dùng tự mở url
    process.stdout.write('Mở trình duyệt thủ công: ' + url + '\n');
  }

  const result = await pollBench(port, 90000);
  server.kill('SIGTERM');
  if (result) {
    await writeFile(out, JSON.stringify(result, null, 2), 'utf8');
    console.log('Bench xong: avg_fps=' + result.avg_fps + ' p1_low_fps=' + result.p1_low_fps + ' frames=' + result.frames + ' load_ms=' + result.load_ms + ' peak_mem_mb=' + result.peak_mem_mb + ' -> ' + out);
    process.exit(0);
  }
  console.error('Bench timeout (không có kết quả trong 90s). Đảm bảo mở trình duyệt và cửa sổ phải hiển thị.');
  process.exit(1);
}

main();
