// Bộ test Phase 2 (Ticket-02) — Test Contract v1.1.
// Chạy: node tests/run_tests.mjs  (hoặc npm test)

import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Game } from '../src/core/sim.js';
import { TUNING, P, NIGHTS } from '../src/core/constants.js';

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

console.log('\n== Test đơn vị (logic v1.1) ==');

test('contract.json khớp constants.js (v1.1)', () => {
  const contract = JSON.parse(readFileSync(join(__dirname, '..', 'game.contract.json'), 'utf8'));
  assert.strictEqual(contract.contract_version, '1.1');
  assert.deepStrictEqual(contract.tuning, TUNING);
  assert.strictEqual(contract.tuning.lantern_cost, 10);
  assert.strictEqual(contract.tuning.pulse_cost, 3);
});

test('di chuyển: chạy 6 m/s (đạt tốc độ trong <=0.1s)', () => {
  const { game } = simulate(empty, 120, [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }]);
  // 1s ramp (5.75m) + 1s ở 6 m/s = 11.75m
  assert.ok(near(game.player.pos[2], 11.75, 0.1), 'z = ' + game.player.pos[2]);
  assert.ok(near(game.player.vel[2], 6.0, 0.01), 'vel = ' + game.player.vel[2]);
});

test('nhảy: lên rồi rơi xuống (v=7, g=-20)', () => {
  const { game } = simulate(empty, 50, [
    { tick: 0, jump: true },
    { tick: 1, jump: false },
  ]);
  // sau 50 tick (0.83s) người chơi đã đáp đất trở lại (0.7s bay)
  assert.strictEqual(game.player.grounded, true, 'phải chạm đất lại');
  assert.ok(game.player.pos[1] === 0 || near(game.player.pos[1], 0), 'y trở về 0');
});

test('lướt (dash): 14 m/s trong 12 tick + hồi chiêu', () => {
  const { game, events } = simulate(empty, 60, [
    { tick: 0, dash: true },
    { tick: 1, dash: false },
  ]);
  assert.ok(events.some((e) => e.name === 'dash'), 'phải có event dash');
  assert.ok(game.player.dashCdTicks > 0, 'phải có hồi chiêu sau lướt');
});

test('nhặt đom đóm: KHÔNG cộng điểm khi nhặt', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0] }, random_motes: false, random_shades: false, motes: [[0, 0, 1]], shades: [] },
    3
  );
  assert.ok(events.some((e) => e.name === 'mote_picked'));
  assert.strictEqual(game.player.carried, 1);
  assert.strictEqual(game.score, 0, 'nhặt không cộng điểm');
});

test('nạp đom đóm: +10 mỗi đom đóm + thắp đèn +100', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 25], carried: 10 }, random_motes: false, random_shades: false, motes: [], shades: [] },
    4,
    [
      { tick: 0, interact: true },
      { tick: 1, interact: false },
    ]
  );
  const l1 = game.lanterns.find((l) => l.id === 'L1');
  assert.ok(l1.lit, 'L1 phải được thắp');
  assert.strictEqual(l1.deposited, 10);
  assert.strictEqual(game.score, 200, 'score = 10*10 + 100');
});

test('tỏa sáng: tốn 3 đom đóm (không tốn flames) + choáng', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], flames: 3, carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 3], state: 'chase' }] },
    3,
    [
      { tick: 0, pulse: true },
      { tick: 1, pulse: false },
    ]
  );
  assert.strictEqual(game.player.carried, 2, 'tốn 3 đom đóm');
  assert.strictEqual(game.player.flames, 3, 'không tốn flames');
  assert.strictEqual(game.shades[0].state, 'stunned');
  assert.ok(events.some((e) => e.name === 'pulse' && e.data.stunned_ids.includes('S1')));
  assert.strictEqual(game.score, TUNING.score.per_stun);
});

test('Bóng Mực đuổi và chạm: player_hit + rơi floor(carried/2) + recoil', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], flames: 3, carried: 4 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5], state: 'chase' }] },
    3
  );
  const hit = events.find((e) => e.name === 'player_hit');
  assert.ok(hit, 'phải có player_hit');
  assert.strictEqual(hit.data.by, 'shade');
  assert.strictEqual(hit.data.flames, 2);
  assert.strictEqual(hit.data.dropped, 2);
  assert.strictEqual(game.shades[0].state, 'recoil', 'Bóng Mực phải giật lùi');
});

test('Bóng Mực sinh theo lịch: 2 con tại tick 300 (Đêm 1)', () => {
  const { game, events } = simulate({ random_motes: false, motes: [] }, 310, [], 1);
  const spawns = events.filter((e) => e.name === 'shade_spawned');
  assert.strictEqual(spawns.length, 2, '2 con lúc tick 300');
  assert.deepStrictEqual(spawns.map((s) => s.data.id), ['S1', 'S2']);
  assert.strictEqual(game.shades.length, 2);
});

test('thắng: đủ đèn -> won/all_lit (ưu tiên sau no_flames)', () => {
  const { game, events } = simulate(
    {
      player: { pos: [-23.8, 0, 7.7], carried: 10 },
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
  assert.deepStrictEqual(over.data, { result: 'won', reason: 'all_lit' });
});

test('thua: hết flames -> lost/no_flames', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], flames: 1 }, random_motes: false, random_shades: false, motes: [], shades: [{ pos: [0, 0, 0.5], state: 'chase' }] },
    3
  );
  assert.strictEqual(game.state, 'lost');
  assert.deepStrictEqual(events.find((e) => e.name === 'game_over').data, { result: 'lost', reason: 'no_flames' });
});

test('thua: hết giờ -> lost/dawn', () => {
  const { game } = simulate({ time_left_s: 1, random_motes: false, random_shades: false, motes: [], shades: [] }, 61);
  assert.strictEqual(game.state, 'lost');
});

test('rơi khỏi đảo: player_hit (by=fall, lost) + hồi sinh', () => {
  const { game, events } = simulate(
    { player: { pos: [41, 0, 0], flames: 3, carried: 5 }, random_motes: false, random_shades: false, motes: [], shades: [] },
    70
  );
  const fall = events.find((e) => e.name === 'player_hit' && e.data.by === 'fall');
  assert.ok(fall, 'phải có player_hit by=fall');
  assert.strictEqual(fall.data.lost, 5);
  assert.strictEqual(fall.data.flames, 2);
  assert.strictEqual(game.player.carried, 0);
});

test('địa hình Đêm 3: các tầng', () => {
  const g = new Game({ seed: 1, night: 3 });
  assert.strictEqual(g.groundY(0, 0), 6); // tầng 2
  assert.strictEqual(g.groundY(5, 0), 6); // r<=8
  assert.strictEqual(g.groundY(0, 18), 3); // tầng 1 (z>0, r=18)
  assert.strictEqual(g.groundY(0, -18), 0); // z<0 -> tầng 0
  assert.strictEqual(g.groundY(40, 40), null); // ngoài đảo
});

test('bục nhảy Đêm 2: bắn lên', () => {
  const { game } = simulate(
    { player: { pos: [20, 0, 18] }, random_motes: false, random_shades: false, motes: [], shades: [] },
    2,
    [],
    2
  );
  assert.ok(game.player.pos[1] > 0.2, 'phải bay lên, y=' + game.player.pos[1]);
});

test('Gió Lạc cướp đom đóm (Đêm 2)', () => {
  const { game, events } = simulate(
    { player: { pos: [0, 0, 0], carried: 10 }, random_motes: false, random_shades: false, random_drifters: false, motes: [], shades: [], drifters: [{ id: 'D1', pos: [1, 0, 0], state: 'chase' }] },
    3,
    [],
    2
  );
  const steal = events.find((e) => e.name === 'drifter_steal');
  assert.ok(steal, 'phải có drifter_steal');
  assert.strictEqual(steal.data.amount, 3);
  assert.strictEqual(game.player.carried, 7);
  assert.strictEqual(game.drifters[0].state, 'flee');
});

test('Bùa Gió: nhặt -> charm_picked + tốc độ 7.2', () => {
  const { game, events } = simulate(
    { player: { pos: [34, 0, 0] }, random_motes: false, random_shades: false, random_drifters: false, motes: [], shades: [], drifters: [] },
    1,
    [],
    2
  );
  const ev = events.find((e) => e.name === 'charm_picked');
  assert.ok(ev, 'phải có charm_picked');
  assert.strictEqual(ev.data.charm_id, 'C1');
  assert.strictEqual(ev.data.charm_ticks, P.charm_effect_ticks);
  assert.strictEqual(game.player.charmTicks, P.charm_effect_ticks);
});

test('gió Đêm 3: kích hoạt sau 30s', () => {
  const { game } = simulate(empty, 1810, [], 3);
  assert.strictEqual(game.wind.active, true);
  assert.ok(game.wind.dir_deg >= 0 && game.wind.dir_deg <= 360);
});

test('pause: sim_tick đứng yên', () => {
  const { game, events } = simulate(
    empty,
    30,
    [
      { tick: 10, pause: true },
      { tick: 11, pause: false },
      { tick: 20, pause: true },
      { tick: 21, pause: false },
    ]
  );
  assert.strictEqual(game.simTick, 20, 'sim_tick = 20 (10 trước + 10 sau pause)');
  assert.ok(events.some((e) => e.name === 'paused'));
  assert.ok(events.some((e) => e.name === 'resumed'));
});

test('snapshot v1.1: đủ trường mới', () => {
  const g = new Game({ seed: 7, night: 2 });
  g.buildScenario(null);
  const s = g.snapshot();
  assert.strictEqual(s.night, 2);
  assert.strictEqual(s.lanterns.length, 6);
  assert.ok('vel' in s.player && 'grounded' in s.player && 'invuln' in s.player);
  assert.ok('dash_cd_s' in s.player && 'pulse_cd_s' in s.player && 'charm_s' in s.player);
  assert.ok(Array.isArray(s.motes) && s.motes.length === 20);
  assert.strictEqual(s.motes[0].kind, 'random');
  assert.ok(Array.isArray(s.drifters));
  assert.strictEqual(s.charms.length, 1);
  assert.ok('wind' in s);
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
    assert.strictEqual(r.code, 0, 'night ' + night + ' stderr: ' + r.stderr);
    const lines = readFileSync(out, 'utf8').trim().split('\n');
    assert.ok(lines[0].includes('"name":"night_start"'), 'dòng đầu là night_start');
    assert.ok(lines[lines.length - 1].includes('"type":"end"'), 'dòng cuối là end');
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: scenario/inputs sai định dạng -> mã thoát 2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
  const bad = join(dir, 'bad.json');
  writeFileSync(bad, '{ nope', 'utf8');
  const out = join(dir, 'out.jsonl');
  assert.strictEqual(runHeadless(['--seed', '5', '--night', '1', '--scenario', bad, '--ticks', '10', '--out', out]).code, 2);
  const badInputs = join(dir, 'bad-in.json');
  writeFileSync(badInputs, JSON.stringify({ frames: [{ tick: 5 }, { tick: 3 }] }), 'utf8');
  assert.strictEqual(runHeadless(['--seed', '5', '--night', '1', '--inputs', badInputs, '--ticks', '10', '--out', out]).code, 2);
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

test('CLI: hiệu năng — Đêm đầy đủ 21600 tick xong nhanh', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
  const out = join(dir, 'out.jsonl');
  const t0 = Date.now();
  const r = runHeadless(['--seed', '1', '--night', '3', '--ticks', '21600', '--snapshot-every', '600', '--out', out]);
  const dt = Date.now() - t0;
  assert.strictEqual(r.code, 0, 'stderr: ' + r.stderr);
  assert.ok(dt < 5000, 'chạy mất ' + dt + 'ms (phải << 30s)');
  console.log('      (21600 tick mất ' + dt + 'ms)');
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

console.log('\nKết quả: ' + passed + ' đạt, ' + failed + ' trượt');
if (failed > 0) {
  console.log('Các test trượt:');
  for (const f of failures) console.log('  - ' + f.name);
  process.exit(1);
}
