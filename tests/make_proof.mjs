// Sinh bằng chứng kiểm chứng Phase 2: chạy CLI headless thật với các kịch bản
// đại diện cho từng yêu cầu của Ticket-02, lưu output JSONL vào docs/proof/phase-2/.
// Chạy: node tests/make_proof.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEADLESS = join(__dirname, '..', 'src', 'headless.js');
const OUT_DIR = join(__dirname, '..', 'docs', 'proof', 'phase-2');
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

function add(name, req, r) {
  results.push([name, req, r]);
}

add('movement', 'Chạy 6 m/s, tăng tốc <=0.1s', runCase('movement', {
  night: 1,
  scenario: empty,
  inputs: [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }],
  ticks: 120,
  snapshotEvery: 60,
}));

add('jump', 'Nhảy (v=7, g=-20)', runCase('jump', {
  night: 1,
  scenario: empty,
  inputs: [{ tick: 0, jump: true }, { tick: 1, jump: false }],
  ticks: 50,
  snapshotEvery: 10,
}));

add('dash', 'Lướt 14 m/s trong 0.2s', runCase('dash', {
  night: 1,
  scenario: empty,
  inputs: [{ tick: 0, dash: true }, { tick: 1, dash: false }],
  ticks: 30,
  snapshotEvery: 6,
}));

add('pickup', 'Nhặt đom đóm (không cộng điểm)', runCase('pickup', {
  night: 1,
  scenario: { player: { pos: [0, 0, 0] }, random_motes: false, random_shades: false, motes: [[0, 0, 1]], shades: [] },
  inputs: null,
  ticks: 2,
  snapshotEvery: 1,
}));

add('deposit_light', 'Nạp 10 đom đóm + thắp đèn', runCase('deposit_light', {
  night: 1,
  scenario: { player: { pos: [0, 0, 25], carried: 10 }, random_motes: false, random_shades: false, motes: [], shades: [] },
  inputs: [{ tick: 0, interact: true }, { tick: 1, interact: false }],
  ticks: 3,
  snapshotEvery: 1,
}));

add('pulse', 'Tỏa sáng tốn 3 đom đóm + choáng Bóng Mực', runCase('pulse', {
  night: 1,
  scenario: { player: { pos: [0, 0, 0], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 3], state: 'chase' }] },
  inputs: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }],
  ticks: 3,
  snapshotEvery: 1,
}));

add('shade_hit', 'Bóng Mực chạm: mất flames + rơi đom đóm + recoil', runCase('shade_hit', {
  night: 1,
  scenario: { player: { pos: [0, 0, 0], flames: 3, carried: 4 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5], state: 'chase' }] },
  inputs: null,
  ticks: 3,
  snapshotEvery: 1,
}));

add('shade_spawn', 'Bóng Mực sinh 2 con tại tick 300', runCase('shade_spawn', {
  night: 1,
  scenario: { random_motes: false, motes: [] },
  inputs: null,
  ticks: 310,
  snapshotEvery: 300,
}));

add('win', 'Thắng khi thắp đủ đèn', runCase('win', {
  night: 1,
  scenario: {
    player: { pos: [-23.8, 0, 7.7], carried: 10 },
    random_motes: false,
    random_shades: false,
    motes: [],
    shades: [],
    lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }],
  },
  inputs: [{ tick: 0, interact: true }, { tick: 1, interact: false }],
  ticks: 3,
  snapshotEvery: 1,
}));

add('lose_no_flames', 'Thua khi hết Ngọn Lửa', runCase('lose_no_flames', {
  night: 1,
  scenario: { player: { pos: [0, 0, 0], flames: 1 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5], state: 'chase' }] },
  inputs: null,
  ticks: 3,
  snapshotEvery: 1,
}));

add('lose_dawn', 'Thua khi hết giờ', runCase('lose_dawn', {
  night: 1,
  scenario: { time_left_s: 1, random_motes: false, random_shades: false, motes: [], shades: [] },
  inputs: null,
  ticks: 61,
  snapshotEvery: 30,
}));

add('fall', 'Rơi khỏi đảo (Y<-10) + hồi sinh', runCase('fall', {
  night: 1,
  scenario: { player: { pos: [41, 0, 0], flames: 3, carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [] },
  inputs: null,
  ticks: 130,
  snapshotEvery: 60,
}));

add('drifter', 'Gió Lạc cướp đom đóm (Đêm 2)', runCase('drifter', {
  night: 2,
  scenario: { player: { pos: [0, 0, 0], carried: 10 }, random_motes: false, random_shades: false, random_drifters: false, motes: [], shades: [], drifters: [{ id: 'D1', pos: [1, 0, 0], state: 'chase' }] },
  inputs: null,
  ticks: 3,
  snapshotEvery: 1,
}));

add('charm', 'Bùa Gió: nhặt + tăng tốc (Đêm 2)', runCase('charm', {
  night: 2,
  scenario: { player: { pos: [34, 0, 0] }, random_motes: false, random_shades: false, random_drifters: false, motes: [], shades: [], drifters: [] },
  inputs: null,
  ticks: 2,
  snapshotEvery: 1,
}));

add('bounce_pad', 'Bục nhảy Đêm 2', runCase('bounce_pad', {
  night: 2,
  scenario: { player: { pos: [20, 0, 18] }, random_motes: false, random_shades: false, motes: [], shades: [] },
  inputs: null,
  ticks: 30,
  snapshotEvery: 5,
}));

add('wind', 'Gió mạnh Đêm 3 (kích hoạt sau 30s)', runCase('wind', {
  night: 3,
  scenario: empty,
  inputs: null,
  ticks: 1810,
  snapshotEvery: 1800,
}));

// tính tất định
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
  const t2 = readFileSync(o2, 'utf8');
  writeFileSync(join(OUT_DIR, 'determinism.jsonl'), t1, 'utf8');
  add('determinism', 'Tính tất định (2 lần chạy giống hệt)', { code: 0, lines: t1.trim().split('\n').length, identical: t1 === t2 });
  rmSync(dir, { recursive: true, force: true });
}

let md = '# Bằng chứng kiểm chứng Phase 2 (Ticket-02)\n\n';
md += 'Mỗi file `.jsonl` là output **thật** của `node src/headless.js` (Test Contract v1.1).\n\n';
md += '| File | Yêu cầu được chứng minh | Kết quả |\n|---|---|---|\n';
for (const [name, req, r] of results) {
  const extra = r.identical != null ? (r.identical ? ' (2 lần chạy giống hệt ✓)' : ' (KHÁC ✗)') : '';
  md += `| [${name}.jsonl](${name}.jsonl) | ${req} | mã thoát ${r.code}, ${r.lines} dòng${extra} |\n`;
}
md += '\n## Cách chạy lại\n\n```bash\nnode src/headless.js --seed 7 --night 1 --ticks 120 --out out.jsonl\n```\n';
writeFileSync(join(OUT_DIR, 'README.md'), md, 'utf8');

console.log('Đã sinh ' + results.length + ' bằng chứng vào ' + OUT_DIR);
