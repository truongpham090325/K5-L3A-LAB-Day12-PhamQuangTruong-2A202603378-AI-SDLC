// Bộ test cho Phase 1 — kiểm chứng logic theo Test Contract v1.0.
// Chạy bằng: node tests/run_tests.mjs  (hoặc npm test)
// Gồm: test đơn vị (logic) + test tích hợp (chạy CLI headless thật).

import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { Game } from '../src/core/sim.js';
import { TUNING, ISLAND_RADIUS } from '../src/core/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEADLESS = join(__dirname, '..', 'src', 'headless.js');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  \u2713 ' + name);
  } catch (e) {
    failed++;
    failures.push({ name, e });
    console.log('  \u2717 ' + name);
    console.log('      ' + (e && e.message ? e.message : e));
  }
}

function simulate(scenario, ticks, framesArr = []) {
  const game = new Game({ seed: 12345 });
  game.buildScenario(scenario);
  const frames = new Map(framesArr.map((f) => [f.tick, f]));
  const events = [];
  for (let k = 0; k < ticks; k++) {
    const evs = game.step(frames.get(k) || null);
    events.push(...evs);
    if (game.state !== 'playing') break;
  }
  return { game, events };
}

const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;

// ---------------------------------------------------------------------------

console.log('\n== Test đơn vị (logic) ==');

test('contract.json khớp constants.js (tuning không bị lệch)', () => {
  const contract = JSON.parse(readFileSync(join(__dirname, '..', 'game.contract.json'), 'utf8'));
  assert.strictEqual(contract.contract_version, '1.0');
  assert.strictEqual(contract.tuning.lantern_count_night1, 5);
  assert.deepStrictEqual(contract.tuning, TUNING);
});

test('di chuyển: move [0,1] + yaw 0 -> đi +Z đúng player_speed', () => {
  const { game } = simulate(
    { random_motes: false, random_shades: false, motes: [], shades: [] },
    60,
    [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }]
  );
  assert.ok(near(game.player.pos[0], 0), 'x phải bằng 0');
  assert.ok(near(game.player.pos[2], 5.0), 'z phải bằng 5.0 sau 1s');
});

test('di chuyển: hướng theo cam_yaw_deg (yaw 90 quay move [1,0] thành -Z)', () => {
  const { game } = simulate(
    { random_motes: false, random_shades: false, motes: [], shades: [] },
    60,
    [{ tick: 0, move: [1, 0], cam_yaw_deg: 90 }]
  );
  assert.ok(near(game.player.pos[2], -5.0), 'z phải bằng -5.0');
  assert.ok(near(game.player.pos[0], 0), 'x phải bằng 0');
});

test('di chuyển: vector dài hơn 1 được chuẩn hóa (move [1,1] đi đúng tốc độ)', () => {
  const { game } = simulate(
    { random_motes: false, random_shades: false, motes: [], shades: [] },
    60,
    [{ tick: 0, move: [1, 1], cam_yaw_deg: 0 }]
  );
  // |(1,1)| = sqrt2 -> chuẩn hóa còn (0.707,0.707); sau 1s đi được 5m
  const d = Math.hypot(game.player.pos[0], game.player.pos[2]);
  assert.ok(near(d, 5.0), 'độ dài đường đi phải bằng 5.0');
});

test('nhặt đom đóm: trong pickup_radius -> mote_picked + score', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0] }, random_motes: false, random_shades: false, motes: [[0, 0, 1]], shades: [] },
    3
  );
  assert.ok(events.some((e) => e.name === 'mote_picked' && e.data.carried === 1), 'phải có mote_picked');
  assert.strictEqual(game.player.carried, 1);
  assert.strictEqual(game.motes.length, 0);
  assert.strictEqual(game.score, TUNING.score.per_mote);
});

test('không vượt quá carry_capacity', () => {
  const { game } = simulate(
    { player: { pos: [0, 0, 0], carried: TUNING.carry_capacity }, random_motes: false, random_shades: false, motes: [[0, 0, 1]], shades: [] },
    3
  );
  assert.strictEqual(game.player.carried, TUNING.carry_capacity);
  assert.strictEqual(game.motes.length, 1); // vẫn còn, chưa nhặt thêm
});

test('nạp đom đóm + thắp đèn: deposit & lantern_lit', () => {
  const { game, events } = simulate(
    { player: { pos: [20, 0, 0], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [] },
    4,
    [
      { tick: 0, interact: true },
      { tick: 1, interact: false },
    ]
  );
  const l1 = game.lanterns.find((l) => l.id === 'L1');
  assert.ok(l1.lit, 'L1 phải được thắp');
  assert.strictEqual(l1.deposited, 5);
  assert.strictEqual(game.player.carried, 0);
  assert.ok(events.some((e) => e.name === 'deposit' && e.data.lantern_id === 'L1'));
  assert.ok(events.some((e) => e.name === 'lantern_lit' && e.data.lantern_id === 'L1'));
});

test('tỏa sáng: pulse làm choáng Bóng Mực trong pulse_radius', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], flames: 3 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 3] }] },
    3,
    [
      { tick: 0, pulse: true },
      { tick: 1, pulse: false },
    ]
  );
  assert.ok(events.some((e) => e.name === 'pulse' && e.data.stunned_ids.includes('S1')));
  assert.strictEqual(game.shades[0].state, 'stunned');
  assert.strictEqual(game.player.flames, 3 - TUNING.pulse_cost);
});

test('bị Bóng Mực chạm: player_hit (by=shade) + rơi đom đóm', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], flames: 3, carried: 4 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5] }] },
    3
  );
  const hit = events.find((e) => e.name === 'player_hit');
  assert.ok(hit, 'phải có player_hit');
  assert.strictEqual(hit.data.by, 'shade');
  assert.strictEqual(hit.data.flames, 2);
  assert.strictEqual(hit.data.dropped, 2); // floor(4 * 0.5)
  assert.strictEqual(game.player.carried, 2);
});

test('thắng: thắp đủ 5 đèn -> game_over won/all_lit', () => {
  const { game, events } = simulate(
    {
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
    4,
    [
      { tick: 0, interact: true },
      { tick: 1, interact: false },
    ]
  );
  assert.strictEqual(game.state, 'won');
  const over = events.find((e) => e.name === 'game_over');
  assert.ok(over, 'phải có game_over');
  assert.deepStrictEqual(over.data, { result: 'won', reason: 'all_lit' });
  assert.ok(game.score > 0);
});

test('thua: hết flames -> game_over lost/no_flames', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], flames: 1 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5] }] },
    3
  );
  assert.strictEqual(game.state, 'lost');
  const over = events.find((e) => e.name === 'game_over');
  assert.deepStrictEqual(over.data, { result: 'lost', reason: 'no_flames' });
});

test('thua: hết giờ đêm -> game_over lost/dawn', () => {
  const { game, events } = simulate(
    { time_left_s: 1, random_motes: false, random_shades: false, motes: [], shades: [] },
    61
  );
  assert.strictEqual(game.state, 'lost');
  const over = events.find((e) => e.name === 'game_over');
  assert.deepStrictEqual(over.data, { result: 'lost', reason: 'dawn' });
});

test('rơi khỏi đảo: fall_enabled -> player_hit (by=fall) + hồi sinh giữa đảo', () => {
  // người chơi xuất phát sát rìa, đi ra ngoài rồi dừng lại
  const { game, events } = simulate(
    { player: { pos: [ISLAND_RADIUS - 0.1, 0, 0], flames: 3, carried: 3 }, random_motes: false, random_shades: false, motes: [], shades: [] },
    4,
    [
      { tick: 0, move: [1, 0], cam_yaw_deg: 0 },
      { tick: 2, move: [0, 0], cam_yaw_deg: 0 },
    ]
  );
  const fall = events.find((e) => e.name === 'player_hit' && e.data.by === 'fall');
  assert.ok(fall, 'phải có player_hit by=fall');
  assert.strictEqual(fall.data.by, 'fall');
  assert.strictEqual(fall.data.dropped, 3);
  assert.strictEqual(game.player.flames, 2);
  assert.ok(near(game.player.pos[0], 0) && near(game.player.pos[2], 0), 'phải hồi sinh ở giữa đảo');
});

test('snapshot: trường bắt buộc có đủ và tick tăng đúng', () => {
  const game = new Game({ seed: 7 });
  game.buildScenario(null);
  const s = game.snapshot();
  assert.strictEqual(s.type, 'snapshot');
  assert.strictEqual(s.tick, 0);
  assert.strictEqual(s.state, 'playing');
  assert.strictEqual(s.lanterns.length, 5);
  assert.ok(Array.isArray(s.motes) && s.motes.length === 30);
  assert.strictEqual(s.motes_active, 30);
});

// ---------------------------------------------------------------------------

console.log('\n== Test tích hợp (CLI headless thật) ==');

function runHeadless(args) {
  try {
    const stdout = execFileSync('node', [HEADLESS, ...args], { encoding: 'utf8' });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status, stdout: e.stdout ? String(e.stdout) : '', stderr: e.stderr ? String(e.stderr) : '' };
  }
}

test('CLI: chạy thành công với mã thoát 0 và có dòng end', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
  const out = join(dir, 'out.jsonl');
  const r = runHeadless(['--seed', '5', '--night', '1', '--ticks', '30', '--out', out]);
  assert.strictEqual(r.code, 0, 'stderr: ' + r.stderr);
  const lines = readFileSync(out, 'utf8').trim().split('\n');
  assert.strictEqual(lines[0].includes('"type":"snapshot"'), true);
  assert.strictEqual(lines[lines.length - 1].includes('"type":"end"'), true);
  rmSync(dir, { recursive: true, force: true });
});

test('CLI: scenario/inputs sai định dạng -> mã thoát 2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
  const badScenario = join(dir, 'bad.json');
  writeFileSync(badScenario, '{ this is not json', 'utf8');
  const out = join(dir, 'out.jsonl');
  const r = runHeadless(['--seed', '5', '--night', '1', '--scenario', badScenario, '--ticks', '10', '--out', out]);
  assert.strictEqual(r.code, 2, 'stderr: ' + r.stderr);

  // inputs có tick không tăng
  const badInputs = join(dir, 'bad-inputs.json');
  writeFileSync(badInputs, JSON.stringify({ frames: [{ tick: 5 }, { tick: 3 }] }), 'utf8');
  const r2 = runHeadless(['--seed', '5', '--night', '1', '--inputs', badInputs, '--ticks', '10', '--out', out]);
  assert.strictEqual(r2.code, 2, 'stderr: ' + r2.stderr);
  rmSync(dir, { recursive: true, force: true });
});

test('CLI: tính tất định — 2 lần chạy giống hệt nhau', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
  const scenario = join(dir, 'scenario.json');
  const inputs = join(dir, 'inputs.json');
  writeFileSync(
    scenario,
    JSON.stringify({
      player: { pos: [0, 0, 0] },
      random_motes: true,
      random_shades: true,
      time_left_s: 60,
    }),
    'utf8'
  );
  writeFileSync(
    inputs,
    JSON.stringify({
      frames: [
        { tick: 0, move: [0, 1] },
        { tick: 30, pulse: true },
        { tick: 31, pulse: false },
      ],
    }),
    'utf8'
  );
  const out1 = join(dir, 'out1.jsonl');
  const out2 = join(dir, 'out2.jsonl');
  const a1 = ['--seed', '99', '--night', '1', '--scenario', scenario, '--inputs', inputs, '--ticks', '200', '--out', out1];
  const a2 = ['--seed', '99', '--night', '1', '--scenario', scenario, '--inputs', inputs, '--ticks', '200', '--out', out2];
  const r1 = runHeadless(a1);
  const r2 = runHeadless(a2);
  assert.strictEqual(r1.code, 0);
  assert.strictEqual(r2.code, 0);
  assert.strictEqual(readFileSync(out1, 'utf8'), readFileSync(out2, 'utf8'));
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

console.log('\nKết quả: ' + passed + ' đạt, ' + failed + ' trượt');
if (failed > 0) {
  console.log('Các test trượt:');
  for (const f of failures) console.log('  - ' + f.name);
  process.exit(1);
}
