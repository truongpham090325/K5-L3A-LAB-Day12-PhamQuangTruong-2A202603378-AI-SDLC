// Sinh bằng chứng kiểm chứng Phase 1: chạy CLI headless thật với các kịch bản
// đại diện, lưu output JSONL vào docs/proof/phase-1/ kèm bảng truy vết yêu cầu.
// Chạy: node tests/make_proof.mjs

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEADLESS = join(__dirname, '..', 'src', 'headless.js');
const OUT_DIR = join(__dirname, '..', 'docs', 'proof', 'phase-1');
mkdirSync(OUT_DIR, { recursive: true });

function runCase(name, { scenario, inputs, ticks, snapshotEvery = 10, seed = 7 }) {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  const out = join(dir, 'out.jsonl');
  const args = ['--seed', String(seed), '--night', '1', '--ticks', String(ticks)];
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

  let r;
  try {
    execFileSync('node', [HEADLESS, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    r = { code: 0 };
  } catch (e) {
    r = { code: e.status, stderr: String(e.stderr || '') };
  }

  const text = readFileSync(out, 'utf8');
  writeFileSync(join(OUT_DIR, name + '.jsonl'), text, 'utf8');
  rmSync(dir, { recursive: true, force: true });
  return { code: r.code, lines: text.trim().split('\n').length };
}

const empty = { random_motes: false, random_shades: false, motes: [], shades: [] };
const results = [];

results.push([
  'movement',
  'Di chuyển theo move + cam_yaw (REQ: nhân vật đi lại)',
  runCase('movement', {
    scenario: empty,
    inputs: [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }],
    ticks: 60,
    snapshotEvery: 30,
  }),
]);

results.push([
  'pickup',
  'Nhặt đom đóm trong pickup_radius (REQ: nhặt đom đóm)',
  runCase('pickup', {
    scenario: { player: { pos: [0, 0, 0] }, random_motes: false, random_shades: false, motes: [[0, 0, 1]], shades: [] },
    inputs: null,
    ticks: 2,
    snapshotEvery: 1,
  }),
]);

results.push([
  'deposit_light',
  'Nạp đom đóm + thắp đèn (REQ: nạp ánh sáng để thắp đèn)',
  runCase('deposit_light', {
    scenario: { player: { pos: [20, 0, 0], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [] },
    inputs: [
      { tick: 0, interact: true },
      { tick: 1, interact: false },
    ],
    ticks: 3,
    snapshotEvery: 1,
  }),
]);

results.push([
  'pulse_stun',
  'Tỏa sáng xua Bóng Mực (REQ: tỏa sáng để xua Bóng Mực)',
  runCase('pulse_stun', {
    scenario: { player: { pos: [0, 0, 0], flames: 3 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 3] }] },
    inputs: [
      { tick: 0, pulse: true },
      { tick: 1, pulse: false },
    ],
    ticks: 3,
    snapshotEvery: 1,
  }),
]);

results.push([
  'hit',
  'Bóng Mực đuổi và gây sát thương, rơi đom đóm (REQ: Bóng Mực đuổi, chạm mất máu)',
  runCase('hit', {
    scenario: { player: { pos: [0, 0, 0], flames: 3, carried: 4 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5] }] },
    inputs: null,
    ticks: 3,
    snapshotEvery: 1,
  }),
]);

results.push([
  'win',
  'Thắng khi thắp đủ 5 đèn (REQ: thắp hết đèn thì thắng)',
  runCase('win', {
    scenario: {
      player: { pos: [6.18, 0, -19.021], carried: 5 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: [
        { id: 'L1', lit: true },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
      ],
    },
    inputs: [
      { tick: 0, interact: true },
      { tick: 1, interact: false },
    ],
    ticks: 3,
    snapshotEvery: 1,
  }),
]);

results.push([
  'lose_no_flames',
  'Thua khi hết flames (REQ: mất hết máu thì thua)',
  runCase('lose_no_flames', {
    scenario: { player: { pos: [0, 0, 0], flames: 1 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5] }] },
    inputs: null,
    ticks: 3,
    snapshotEvery: 1,
  }),
]);

results.push([
  'lose_dawn',
  'Thua khi hết giờ đêm (REQ: giới hạn thời gian Đêm 1)',
  runCase('lose_dawn', {
    scenario: { time_left_s: 1, random_motes: false, random_shades: false, motes: [], shades: [] },
    inputs: null,
    ticks: 61,
    snapshotEvery: 30,
  }),
]);

// ---- tính tất định: chạy 2 lần, so sánh byte ----
{
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  const scenario = {
    player: { pos: [0, 0, 0] },
    random_motes: true,
    random_shades: true,
    time_left_s: 60,
  };
  const sp = join(dir, 's.json');
  const ip = join(dir, 'i.json');
  writeFileSync(sp, JSON.stringify(scenario), 'utf8');
  writeFileSync(ip, JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }, { tick: 30, pulse: true }, { tick: 31, pulse: false }] }), 'utf8');
  const base = ['--seed', '99', '--night', '1', '--scenario', sp, '--inputs', ip, '--ticks', '200'];
  const o1 = join(dir, 'o1.jsonl');
  const o2 = join(dir, 'o2.jsonl');
  execFileSync('node', [HEADLESS, ...base, '--out', o1], { stdio: ['ignore', 'pipe', 'pipe'] });
  execFileSync('node', [HEADLESS, ...base, '--out', o2], { stdio: ['ignore', 'pipe', 'pipe'] });
  const t1 = readFileSync(o1, 'utf8');
  const t2 = readFileSync(o2, 'utf8');
  const identical = t1 === t2;
  writeFileSync(join(OUT_DIR, 'determinism.jsonl'), t1, 'utf8');
  results.push([
    'determinism',
    'Tính tất định: cùng seed/scenario/inputs -> output giống hệt (REQ: tính tất định)',
    { code: 0, lines: t1.trim().split('\n').length, identical },
  ]);
  rmSync(dir, { recursive: true, force: true });
}

// ---- viết bảng tóm tắt ----
let md = '# Bằng chứng kiểm chứng Phase 1 (Đảo Đèn Lồng)\n\n';
md += 'Mỗi file `.jsonl` bên dưới là output **thật** của `node src/headless.js` (Test Contract v1.0), chạy lại được bằng chính các scenario ghi trong file.\n\n';
md += '| File | Yêu cầu được chứng minh | Kết quả |\n|---|---|---|\n';
for (const [name, req, r] of results) {
  const extra = r.identical != null ? (r.identical ? ' (2 lần chạy giống hệt ✓)' : ' (KHÁC NHAU ✗)') : '';
  md += `| [${name}.jsonl](${name}.jsonl) | ${req} | mã thoát ${r.code}, ${r.lines} dòng${extra} |\n`;
}
md += '\n## Cách chạy lại\n\n```bash\n# ví dụ chạy lại một kịch bản (xem scenario trong file JSONL)\nnode src/headless.js --seed 7 --night 1 --ticks 60 --out out.jsonl\n```\n';
writeFileSync(join(OUT_DIR, 'README.md'), md, 'utf8');

console.log('Đã sinh ' + results.length + ' bằng chứng vào ' + OUT_DIR);
for (const [name, , r] of results) console.log('  - ' + name + '.jsonl (' + r.lines + ' dòng, mã thoát ' + r.code + ')');
