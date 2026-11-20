// Bộ test Phase 3 (Ticket-03) — Test Contract v1.2.
// Chạy: node tests/run_tests.mjs  (hoặc npm test)

import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Game } from '../src/core/sim.js';
import { TUNING, P } from '../src/core/constants.js';

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

function simulate(scenario, ticks, framesArr = [], night = 1) {
  const game = new Game({ seed: 12345, night });
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
const empty = { random_motes: false, random_shades: false, motes: [], shades: [] };

// ---------------------------------------------------------------------------

console.log('\n== Test đơn vị (logic v1.2) ==');

test('contract.json khớp constants.js (v1.2)', () => {
  const contract = JSON.parse(readFileSync(join(__dirname, '..', 'game.contract.json'), 'utf8'));
  assert.strictEqual(contract.contract_version, '1.2');
  assert.deepStrictEqual(contract.tuning, TUNING);
  assert.strictEqual(contract.tuning.fuel_max, 100);
  assert.strictEqual(contract.tuning.relight_cost, 5);
  assert.strictEqual(contract.tuning.win_ratio, 0.6);
  assert.strictEqual(contract.tuning.score.per_mote, 5);
});

// --- hồi quy Phase 1–2 (số chuẩn không đổi) ---

test('di chuyển: chạy 6 m/s', () => {
  const { game } = simulate(empty, 120, [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }]);
  assert.ok(near(game.player.pos[2], 11.75, 0.1), 'z = ' + game.player.pos[2]);
});

test('nhảy: lên rồi rơi xuống', () => {
  const { game } = simulate(empty, 50, [{ tick: 0, jump: true }, { tick: 1, jump: false }]);
  assert.strictEqual(game.player.grounded, true);
});

test('nhặt đom đóm: không cộng điểm khi nhặt', () => {
  const { game } = simulate({ player: { pos: [0, 0, 0] }, random_motes: false, random_shades: false, motes: [[0, 0, 1]], shades: [] }, 3);
  assert.strictEqual(game.player.carried, 1);
  assert.strictEqual(game.score, 0);
});

test('tỏa sáng: tốn 3 đom đóm + choáng + +5', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], flames: 3, carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 3], state: 'chase' }] },
    3,
    [{ tick: 0, pulse: true }, { tick: 1, pulse: false }]
  );
  assert.strictEqual(game.player.carried, 2);
  assert.strictEqual(game.player.flames, 3);
  assert.strictEqual(game.shades[0].state, 'stunned');
  assert.strictEqual(game.score, TUNING.score.per_stun);
});

test('Bóng Mực chạm: mất flames + rơi đom đóm', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], flames: 3, carried: 4 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5], state: 'chase' }] },
    3
  );
  const hit = events.find((e) => e.name === 'player_hit');
  assert.strictEqual(hit.data.flames, 2);
  assert.strictEqual(hit.data.dropped, 2);
});

test('Gió Lạc cướp đom đóm (Đêm 2)', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], carried: 10 }, random_motes: false, random_shades: false, random_drifters: false, motes: [], shades: [], drifters: [{ id: 'D1', pos: [1, 0, 0], state: 'chase' }] },
    3, [], 2
  );
  assert.strictEqual(events.find((e) => e.name === 'drifter_steal').data.amount, 3);
  assert.strictEqual(game.player.carried, 7);
});

// --- luật mới Phase 3 ---

test('thắp đèn lần đầu: +5 mỗi đom đóm + +100', () => {
  const { game } = simulate(
    { player: { pos: [0, 0, 25], carried: 10 }, random_motes: false, random_shades: false, motes: [], shades: [] },
    4,
    [{ tick: 0, interact: true }, { tick: 1, interact: false }]
  );
  const l1 = game.lanterns.find((l) => l.id === 'L1');
  assert.ok(l1.lit);
  assert.ok(l1.fuel / 60 > 99, 'fuel gần đầy: ' + l1.fuel / 60);
  assert.strictEqual(game.score, 5 * 10 + 100, 'score = 50 + 100');
});

test('dầu hao hụt 1.0/giây khi sáng', () => {
  const { game } = simulate(
    { random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true, fuel: 100 }] },
    60
  );
  assert.strictEqual(game.lanterns[0].fuel / 60, 99);
});

test('châm dầu: refuel + fuel tăng', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 25], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true, fuel: 50 }] },
    2,
    [{ tick: 0, interact: true }, { tick: 1, interact: false }]
  );
  const ref = events.find((e) => e.name === 'refuel');
  assert.ok(ref, 'phải có refuel');
  assert.strictEqual(ref.data.amount, 5);
  assert.strictEqual(ref.data.fuel, 100);
  assert.strictEqual(game.score, 25, '5 * 5');
});

test('hết dầu: lantern_out', () => {
  const { game, events } = simulate(
    { random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true, fuel: 0.5 }] },
    40
  );
  assert.ok(events.some((e) => e.name === 'lantern_out' && e.data.lantern_id === 'L1'));
  assert.strictEqual(game.lanterns[0].lit, false);
  assert.strictEqual(game.lanterns[0].ever_lit, true);
});

test('thắp lại: cần 5 đom đóm + relight + relit_count', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 25], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: false, ever_lit: true }] },
    3,
    [{ tick: 0, interact: true }, { tick: 1, interact: false }]
  );
  const lit = events.find((e) => e.name === 'lantern_lit');
  assert.ok(lit, 'phải có lantern_lit');
  assert.strictEqual(lit.data.relight, true);
  assert.strictEqual(game.lanterns[0].relit_count, 1);
  assert.strictEqual(game.score, 5 * 5 + 40, 'score = 25 + 40');
});

test('Bóng Mực hút dầu: wander -> drain khi gần đèn yếu', () => {
  const { game } = simulate(
    { random_motes: false, random_shades: false, motes: [], shades: [{ id: 'S1', pos: [0, 0, 24], state: 'wander' }], lanterns: [{ id: 'L1', lit: true, fuel: 20 }] },
    3
  );
  assert.strictEqual(game.shades[0].state, 'drain');
});

test('hút dầu làm cạn nhanh hơn (drain 5/giây)', () => {
  const { game } = simulate(
    { random_motes: false, random_shades: false, motes: [], shades: [{ id: 'S1', pos: [0, 0, 24], state: 'wander' }], lanterns: [{ id: 'L1', lit: true, fuel: 20 }] },
    30
  );
  // có hút: ~17 (< 19); chỉ hao tự nhiên sẽ là 19.5
  assert.ok(game.lanterns[0].fuel / 60 < 19, 'fuel = ' + game.lanterns[0].fuel / 60);
});

test('Tỏa Sáng trúng Bóng Mực đang drain: +15', () => {
  const { game } = simulate(
    { player: { pos: [0, 0, 22], carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [{ id: 'S1', pos: [0, 0, 23], state: 'drain', target_lantern_id: 'L1' }], lanterns: [{ id: 'L1', lit: true, fuel: 20 }] },
    2,
    [{ tick: 0, pulse: true }, { tick: 1, pulse: false }]
  );
  assert.strictEqual(game.score, TUNING.score.per_drain_stun);
});

test('thắng mới: dawn_survived khi đủ đèn sáng lúc bình minh', () => {
  const { game, events } = simulate(
    { time_left_s: 1, random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }] },
    61
  );
  assert.strictEqual(game.state, 'won');
  assert.deepStrictEqual(events.find((e) => e.name === 'game_over').data, { result: 'won', reason: 'dawn_survived' });
});

test('thua mới: dawn khi thiếu đèn sáng lúc bình minh', () => {
  const { game, events } = simulate(
    { time_left_s: 1, random_motes: false, random_shades: false, motes: [], shades: [], lanterns: [{ id: 'L1', lit: true }] },
    61
  );
  assert.strictEqual(game.state, 'lost');
  assert.deepStrictEqual(events.find((e) => e.name === 'game_over').data, { result: 'lost', reason: 'dawn' });
});

test('thua: hết flames -> no_flames (vẫn giữ)', () => {
  const { game } = simulate(
    { player: { pos: [0, 0, 0], flames: 1 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5], state: 'chase' }] },
    3
  );
  assert.strictEqual(game.state, 'lost');
});

test('sức chứa tăng dần: capacity = 10 + 2 * successful_lights (max 20)', () => {
  const { game } = simulate(
    { player: { pos: [0, 0, 0], successful_lights: 5 }, random_motes: false, random_shades: false, motes: [], shades: [] },
    1
  );
  assert.strictEqual(game.capacity(), 20);
});

test('snapshot v1.2: đèn có fuel/ever_lit/relit_count, player có capacity', () => {
  const g = new Game({ seed: 7, night: 1 });
  g.buildScenario(null);
  const s = g.snapshot();
  assert.ok('fuel' in s.lanterns[0]);
  assert.ok('ever_lit' in s.lanterns[0]);
  assert.ok('relit_count' in s.lanterns[0]);
  assert.ok('capacity' in s.player);
  assert.strictEqual(s.player.capacity, 10);
});

// ---------------------------------------------------------------------------

console.log('\n== Test tích hợp (CLI headless thật) ==');

function runHeadless(args) {
  try {
    execFileSync('node', [HEADLESS, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0 };
  } catch (e) {
    return { code: e.status, stderr: String(e.stderr || '') };
  }
}

test('CLI: --night 1/2/3 chạy thành công, có night_start + end', () => {
  for (const night of [1, 2, 3]) {
    const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
    const out = join(dir, 'out.jsonl');
    const r = runHeadless(['--seed', '5', '--night', String(night), '--ticks', '30', '--out', out]);
    assert.strictEqual(r.code, 0, 'night ' + night + ': ' + r.stderr);
    const lines = readFileSync(out, 'utf8').trim().split('\n');
    assert.ok(lines[0].includes('"name":"night_start"'));
    assert.ok(lines[lines.length - 1].includes('"type":"end"'));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: scenario/inputs sai định dạng -> mã thoát 2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, '{ nope', 'utf8');
  const out = join(dir, 'out.jsonl');
  assert.strictEqual(runHeadless(['--seed', '5', '--night', '1', '--scenario', bad, '--ticks', '10', '--out', out]).code, 2);
  rmSync(dir, { recursive: true, force: true });
});

test('CLI: tính tất định', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
  const sp = join(dir, 's.json');
  const ip = join(dir, 'i.json');
  writeFileSync(sp, JSON.stringify({ random_motes: true, random_shades: true, time_left_s: 60 }), 'utf8');
  writeFileSync(ip, JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }, { tick: 30, pulse: true }, { tick: 31, pulse: false }] }), 'utf8');
  const base = ['--seed', '99', '--night', '2', '--scenario', sp, '--inputs', ip, '--ticks', '400'];
  const o1 = join(dir, 'o1.jsonl');
  const o2 = join(dir, 'o2.jsonl');
  assert.strictEqual(runHeadless([...base, '--out', o1]).code, 0);
  assert.strictEqual(runHeadless([...base, '--out', o2]).code, 0);
  assert.strictEqual(readFileSync(o1, 'utf8'), readFileSync(o2, 'utf8'));
  rmSync(dir, { recursive: true, force: true });
});

test('CLI: hiệu năng — Đêm đầy đủ (14400 tick) xong nhanh', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
  const out = join(dir, 'out.jsonl');
  const t0 = Date.now();
  const r = runHeadless(['--seed', '1', '--night', '3', '--ticks', '18000', '--snapshot-every', '600', '--out', out]);
  const dt = Date.now() - t0;
  assert.strictEqual(r.code, 0);
  assert.ok(dt < 5000, 'mất ' + dt + 'ms');
  console.log('      (18000 tick mất ' + dt + 'ms)');
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

console.log('\nKết quả: ' + passed + ' đạt, ' + failed + ' trượt');
if (failed > 0) {
  console.log('Các test trượt:');
  for (const f of failures) console.log('  - ' + f.name);
  process.exit(1);
}
