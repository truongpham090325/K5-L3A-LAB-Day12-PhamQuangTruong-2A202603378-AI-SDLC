// Sinh bằng chứng kiểm chứng Phase 3 (Ticket-03, Test Contract v1.2) → docs/proof/phase-3/.
// Chạy: node tests/make_proof.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEADLESS = join(__dirname, '..', 'src', 'headless.js');
const OUT_DIR = join(__dirname, '..', 'docs', 'proof', 'phase-3');
mkdirSync(OUT_DIR, { recursive: true });

function runCase(name, { night, scenario, inputs, ticks, snapshotEvery = 10, seed = 7 }) {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  const out = join(dir, 'out.jsonl');
  const args = ['--seed', String(seed), '--night', String(night), '--ticks', String(ticks)];
  if (scenario != null) {
    const sp = join(dir, 'scenario.json');
    writeFileSync(sp, JSON.stringify(scenario, null, 2), 'utf8');
    args.push('--scenario', sp);
  }
  if (inputs != null) {
    const ip = join(dir, 'inputs.json');
    writeFileSync(ip, JSON.stringify({ frames: inputs }, null, 2), 'utf8');
    args.push('--inputs', ip);
  }
  if (snapshotEvery != null) args.push('--snapshot-every', String(snapshotEvery));
  args.push('--out', out);
  let code = 0;
  try {
    execFileSync('node', [HEADLESS, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    code = e.status;
  }
  const text = readFileSync(out, 'utf8');
  writeFileSync(join(OUT_DIR, name + '.jsonl'), text, 'utf8');
  rmSync(dir, { recursive: true, force: true });
  return { code, lines: text.trim().split('\n').length };
}

const empty = { random_motes: false, random_shades: false, motes: [], shades: [] };
const results = [];
const add = (name, req, r) => results.push([name, req, r]);

// --- Hồi quy Phase 2 (chỉ số chuẩn v1.2) ---
add('movement', 'Chạy 6 m/s', runCase('movement', { night: 1, scenario: empty, inputs: [{ tick: 0, move: [0, 1] }], ticks: 120, snapshotEvery: 60 }));
add('deposit_light', 'Thắp đèn lần đầu: +5/đom đóm +100', runCase('deposit_light', { night: 1, scenario: { player: { pos: [0, 0, 25], carried: 10 }, random_motes: false, random_shades: false, motes: [], shades: [] }, inputs: [{ tick: 0, interact: true }, { tick: 1, interact: false }], ticks: 3, snapshotEvery: 1 }));
add('pulse', 'Tỏa sáng: tốn 3 đom đóm + choáng Bóng Mực', runCase('pulse', { night: 1, scenario: { player: { pos: [0, 0, 0], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 3], state: 'chase' }] }, inputs: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }], ticks: 3, snapshotEvery: 1 }));
add('shade_hit', 'Bóng Mực đuổi chạm: mất flames + rơi đom đóm', runCase('shade_hit', { night: 1, scenario: { player: { pos: [0, 0, 0], flames: 3, carried: 4 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5], state: 'chase' }] }, inputs: null, ticks: 3, snapshotEvery: 1 }));

// --- Nhiên liệu & Bóng Mực hút dầu (mới v1.2) ---
add('fuel_decay', 'Hao dầu 1/giây khi sáng', runCase('fuel_decay', { night: 1, scenario: { random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true, fuel: 100 }] }, ticks: 60, snapshotEvery: 60 }));
add('refuel', 'Châm dầu: refuel + fuel tăng (E nạp đèn)', runCase('refuel', { night: 1, scenario: { player: { pos: [0, 0, 25], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true, fuel: 50 }] }, inputs: [{ tick: 0, interact: true }, { tick: 1, interact: false }], ticks: 2, snapshotEvery: 1 }));
add('lantern_out', 'Cạn dầu → lantern_out', runCase('lantern_out', { night: 1, scenario: { random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true, fuel: 0.5 }] }, ticks: 40, snapshotEvery: 40 }));
add('relight', 'Thắp lạp: 5 đom đóm + relight:true + relit_count', runCase('relight', { night: 1, scenario: { player: { pos: [0, 0, 25], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: false, ever_lit: true }] }, inputs: [{ tick: 0, interact: true }, { tick: 1, interact: false }], ticks: 3, snapshotEvery: 1 }));
add('drain', 'Bóng Mực wander → drain gần đèn yếu', runCase('drain', { night: 1, scenario: { random_motes: false, random_shades: false, motes: [], shades: [{ id: 'S1', pos: [0, 0, 24], state: 'wander' }], lanterns: [{ id: 'L1', lit: true, fuel: 20 }] }, ticks: 3, snapshotEvery: 3 }));
add('pulse_drain', 'Tỏa Sáng trúng Bóng Mực đang drain: +15', runCase('pulse_drain', { night: 1, scenario: { player: { pos: [0, 0, 22], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [{ id: 'S1', pos: [0, 0, 23], state: 'drain', target_lantern_id: 'L1' }], lanterns: [{ id: 'L1', lit: true, fuel: 20 }] }, inputs: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }], ticks: 2, snapshotEvery: 2 }));

// --- Luật thắng mới ---
add('win_dawn_survived', 'Thắng: giữ đảo sáng đến bình minh (dawn_survived)', runCase('win_dawn_survived', { night: 1, scenario: { time_left_s: 1, random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }] }, ticks: 61, snapshotEvery: 30 }));
add('lose_dawn', 'Thua: đèn sáng dưới ngưỡng → dawn', runCase('lose_dawn', { night: 1, scenario: { time_left_s: 1, random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true }] }, ticks: 61, snapshotEvery: 30 }));

// --- Sức chứa ---
add('capacity', 'Sức chứa tăng dần (carried/capacity)', runCase('capacity', { night: 1, scenario: { player: { pos: [0, 0, 0], successful_lights: 5 }, random_motes: false, random_shades: false, motes: [], shades: [] }, ticks: 2, snapshotEvery: 2 }));

// --- Tính tất định ---
{
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  const sp = join(dir, 's.json');
  const ip = join(dir, 'i.json');
  writeFileSync(sp, JSON.stringify({ random_motes: true, random_shades: true, time_left_s: 60 }), 'utf8');
  writeFileSync(ip, JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }, { tick: 30, pulse: true }, { tick: 31, pulse: false }] }), 'utf8');
  const base = ['--seed', '99', '--night', '3', '--scenario', sp, '--inputs', ip, '--ticks', '400'];
  const o1 = join(dir, 'o1.jsonl');
  const o2 = join(dir, 'o2.jsonl');
  execFileSync('node', [HEADLESS, ...base, '--out', o1], { stdio: ['ignore', 'pipe', 'pipe'] });
  execFileSync('node', [HEADLESS, ...base, '--out', o2], { stdio: ['ignore', 'pipe', 'pipe'] });
  const t1 = readFileSync(o1, 'utf8');
  writeFileSync(join(OUT_DIR, 'determinism.jsonl'), t1, 'utf8');
  add('determinism', 'Tính tất định (2 lần giống hệt)', { code: 0, lines: t1.trim().split('\n').length, identical: t1 === readFileSync(o2, 'utf8') });
  rmSync(dir, { recursive: true, force: true });
}

let md = '# Bằng chứng kiểm chứng Phase 3 (Ticket-03, Contract v1.2)\n\n';
md += 'Mỗi file `.jsonl` là output **thật** của `node src/headless.js`.\n\n';
md += '| File | Yêu cầu được chứng minh | Kết quả |\n|---|---|---|\n';
for (const [name, req, r] of results) {
  const extra = r.identical != null ? (r.identical ? ' (2 lần giống hệt ✓)' : ' (KHÁC ✗)') : '';
  md += `| [${name}.jsonl](${name}.jsonl) | ${req} | mã thoát ${r.code}, ${r.lines} dòng${extra} |\n`;
}
md += '\n## Cách chạy lại\n\n```bash\nnode src/headless.js --seed 7 --night 1 --ticks 60 --out out.jsonl\n```\n';
writeFileSync(join(OUT_DIR, 'README.md'), md, 'utf8');
console.log('Đã sinh ' + results.length + ' bằng chứng vào ' + OUT_DIR);
