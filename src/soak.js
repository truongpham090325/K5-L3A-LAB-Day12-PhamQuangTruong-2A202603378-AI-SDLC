// Soak test: chạy headless N Đêm liên tiếp (mót vòng Đêm 1–3), input ngẫu nhiên theo seed.
// Lệnh: node src/soak.js --seed 7 --nights 10 --out soak.json

import { writeFileSync } from 'node:fs';
import { Game } from './core/sim.js';
import { NIGHTS } from './core/constants.js';

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

function rng(seed) {
  let x = (seed | 0) >>> 0;
  return () => {
    x |= 0;
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function measure() {
  const m = process.memoryUsage();
  return +(m.rss / 1024 / 1024).toFixed(1);
}

const DIR_INTERVAL = 30; // đổi hướng mỗi 30 tick (theo ticket)

function main() {
  const args = parseArgs(process.argv.slice(2));
  const seed = Number(args.seed || 7);
  const nights = Number(args.nights || 10);
  const out = args.out || 'soak.json';

  const results = [];
  let crashes = 0;
  const t0 = Date.now();
  let memStart = null;
  let memEnd = null;

  for (let i = 0; i < nights; i++) {
    const nightNum = (i % 3) + 1;
    const game = new Game({ seed: seed + i, night: nightNum });
    game.buildScenario(null);
    if (i === 0) memStart = measure();

    const r = rng(seed + i);
    let move = [0, 0];
    let nightCrashes = 0;
    const maxTicks = NIGHTS[nightNum].duration_s * 60 + 300;
    for (let k = 0; k < maxTicks; k++) {
      if (k % DIR_INTERVAL === 0) move = [r() * 2 - 1, r() * 2 - 1];
      const rr = r();
      try {
        game.step({
          move,
          cam_yaw_deg: 0,
          jump: rr < 0.05, // 5%
          dash: rr >= 0.05 && rr < 0.08, // 3%
          pulse: rr >= 0.08 && rr < 0.10, // 2%
          interact: rr >= 0.10 && rr < 0.20, // 10%
        });
      } catch (e) {
        nightCrashes++;
        break;
      }
      if (game.state !== 'playing') break;
    }
    results.push(nightCrashes ? 'crash' : game.state);
    crashes += nightCrashes;
    if (i === nights - 1) memEnd = measure();
  }

  const soak = { nights, crashes, results, mem_start_mb: memStart, mem_end_mb: memEnd, duration_s: +((Date.now() - t0) / 1000).toFixed(1) };
  writeFileSync(out, JSON.stringify(soak, null, 2), 'utf8');
  console.log('Soak: nights=' + soak.nights + ' crashes=' + soak.crashes + ' results=' + soak.results.join('/') + ' mem=' + soak.mem_start_mb + '->' + soak.mem_end_mb + 'MB duration=' + soak.duration_s + 's');
  process.exit(crashes > 0 ? 1 : 0);
}

main();
