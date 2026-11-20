// Đảo Đèn Lồng — engine mô phỏng (logic thuần, không phụ thuộc DOM/GPU).
// Dùng chung cho cả chế độ headless (Node) lẫn chế độ chơi 3D (browser).

import {
  TUNING,
  ISLAND_RADIUS,
  TICKS_PER_SECOND,
  DEFAULT_MOTE_COUNT,
  DEFAULT_SHADE_SPAWN_TICKS,
  LANTERN_POSITIONS,
} from './constants.js';
import { createRng } from './rng.js';

const round3 = (x) => Math.round(x * 1000) / 1000;
const round3Vec = (v) => [round3(v[0]), round3(v[1]), round3(v[2])];
const distXZ = (a, b) => {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
};
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export class Game {
  constructor({ seed = 0, tuning = TUNING } = {}) {
    this.tuning = tuning;
    this.seed = seed;
    this.rng = createRng(seed);

    this.tick = 0; // sim_tick (bằng tick ở Phase 1)
    this.state = 'playing'; // playing | won | lost
    this.score = 0;
    this.nightDurationS = tuning.night1_duration_s;

    this.player = { pos: [0, 0, 0], flames: tuning.flames, carried: 0, invulnUntil: 0 };
    this.lanterns = [];
    this.motes = [];
    this.shades = [];

    this.moteCounter = 0;
    this.shadeCounter = 0;
    this.pulseCooldownUntil = 0;

    this.input = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
    this.prev = { jump: false, interact: false, pulse: false };
    this.pendingEvents = [];
    this.shadeSpawnSchedule = new Set();

    for (const [id, pos] of Object.entries(LANTERN_POSITIONS)) {
      this.lanterns.push({ id, pos: [...pos], lit: false, deposited: 0 });
    }
  }

  // ---------- tiện ích ----------

  emit(tick, name, data) {
    this.pendingEvents.push({ type: 'event', tick, name, data });
  }

  addMote(pos) {
    const id = 'M' + ++this.moteCounter;
    this.motes.push({ id, pos: [...pos] });
    return id;
  }

  addShade(pos, explicitId) {
    let id;
    if (explicitId) {
      id = explicitId;
      const m = /^S(\d+)$/.exec(explicitId);
      if (m) this.shadeCounter = Math.max(this.shadeCounter, parseInt(m[1], 10));
    } else {
      id = 'S' + ++this.shadeCounter;
    }
    this.shades.push({ id, pos: [...pos], state: 'chase', stunUntil: 0 });
    return id;
  }

  randomPositionOnIsland() {
    const angle = this.rng() * 2 * Math.PI;
    const r = 5 + this.rng() * (ISLAND_RADIUS - 10);
    return [round3(Math.cos(angle) * r), 0, round3(Math.sin(angle) * r)];
  }

  spawnRandomMotes(count) {
    for (let i = 0; i < count; i++) this.addMote(this.randomPositionOnIsland());
  }

  // Đom đóm bị đánh rơi tái xuất hiện quanh người chơi (bán kính 2m), theo vị trí tất định.
  scatterDroppedMotes(count) {
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count + 0.5;
      const r = 2.0;
      const x = this.player.pos[0] + Math.cos(angle) * r;
      const z = this.player.pos[2] + Math.sin(angle) * r;
      this.addMote([round3(x), 0, round3(z)]);
    }
  }

  // ---------- dựng scenario ----------

  buildScenario(scenario) {
    const s = scenario || {};
    if (s.player) {
      if (s.player.pos) this.player.pos = [...s.player.pos];
      if (s.player.carried != null) this.player.carried = s.player.carried;
      if (s.player.flames != null) this.player.flames = s.player.flames;
    }
    if (s.time_left_s != null) this.nightDurationS = s.time_left_s;

    if (s.lanterns) {
      for (const l of s.lanterns) {
        const lantern = this.lanterns.find((x) => x.id === l.id);
        if (!lantern) continue;
        if (l.pos) lantern.pos = [...l.pos];
        if (l.lit != null) lantern.lit = !!l.lit;
        if (l.deposited != null) lantern.deposited = l.deposited;
      }
    }

    const randomMotes = s.random_motes == null ? true : !!s.random_motes;
    if (randomMotes) {
      this.spawnRandomMotes(DEFAULT_MOTE_COUNT);
    } else {
      this.motes = [];
      for (const m of s.motes || []) this.addMote([m[0], m[1], m[2]]);
    }

    const randomShades = s.random_shades == null ? true : !!s.random_shades;
    if (randomShades) {
      this.addShade(this.randomPositionOnIsland()); // S1
      this.addShade(this.randomPositionOnIsland()); // S2
      for (const t of DEFAULT_SHADE_SPAWN_TICKS) this.shadeSpawnSchedule.add(t);
    } else {
      this.shades = [];
      for (const sh of s.shades || []) this.addShade(sh.pos, sh.id);
    }
  }

  // ---------- input & di chuyển ----------

  applyFrame(frame) {
    if (frame.move) {
      this.input.move = [clamp(frame.move[0], -1, 1), clamp(frame.move[1], -1, 1)];
    }
    if (frame.cam_yaw_deg != null) this.input.cam_yaw_deg = frame.cam_yaw_deg;
    if (frame.jump != null) this.input.jump = !!frame.jump;
    if (frame.interact != null) this.input.interact = !!frame.interact;
    if (frame.pulse != null) this.input.pulse = !!frame.pulse;
  }

  movePlayer() {
    const [mx, mz] = this.input.move;
    if (mx === 0 && mz === 0) return;
    const rad = (this.input.cam_yaw_deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let dx = mx * cos + mz * sin;
    let dz = -mx * sin + mz * cos;
    const len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }
    const stepM = this.tuning.player_speed / TICKS_PER_SECOND;
    this.player.pos[0] += dx * stepM;
    this.player.pos[2] += dz * stepM;
  }

  checkFall(eventTick) {
    const d = Math.hypot(this.player.pos[0], this.player.pos[2]);
    if (d <= ISLAND_RADIUS) return;
    if (this.tuning.fall_enabled) {
      this.playerHit(eventTick, 'fall');
    } else {
      const scale = ISLAND_RADIUS / d;
      this.player.pos[0] *= scale;
      this.player.pos[2] *= scale;
    }
  }

  // ---------- hành động ----------

  tryDeposit(eventTick) {
    if (this.player.carried <= 0) return;
    let best = null;
    let bestDist = Infinity;
    for (const l of this.lanterns) {
      if (l.lit) continue;
      const d = distXZ(this.player.pos, l.pos);
      if (d <= this.tuning.interact_radius && d < bestDist) {
        best = l;
        bestDist = d;
      }
    }
    if (!best) return;

    const need = this.tuning.lantern_cost - best.deposited;
    const amount = Math.min(this.player.carried, need);
    if (amount <= 0) return;

    best.deposited += amount;
    this.player.carried -= amount;
    this.emit(eventTick, 'deposit', { lantern_id: best.id, amount, deposited: best.deposited });

    if (best.deposited >= this.tuning.lantern_cost) {
      best.lit = true;
      this.score += this.tuning.score.per_lantern;
      this.emit(eventTick, 'lantern_lit', { lantern_id: best.id });
      this.pushShadesOutOfSafeZone(best);
    }
  }

  tryPulse(eventTick) {
    if (eventTick < this.pulseCooldownUntil) return;
    if (this.player.flames < this.tuning.pulse_cost) return;

    this.player.flames -= this.tuning.pulse_cost;
    this.pulseCooldownUntil = eventTick + Math.round(this.tuning.pulse_cooldown_s * TICKS_PER_SECOND);

    const stunned = [];
    for (const sh of this.shades) {
      if (sh.state !== 'chase') continue;
      if (distXZ(this.player.pos, sh.pos) <= this.tuning.pulse_radius) {
        sh.state = 'stunned';
        sh.stunUntil = eventTick + Math.round(this.tuning.pulse_stun_s * TICKS_PER_SECOND);
        stunned.push(sh.id);

        const d = distXZ(this.player.pos, sh.pos);
        let ux = 1;
        let uz = 0;
        if (d > 1e-9) {
          ux = (sh.pos[0] - this.player.pos[0]) / d;
          uz = (sh.pos[2] - this.player.pos[2]) / d;
        }
        sh.pos[0] = round3(sh.pos[0] + ux * this.tuning.pulse_push_m);
        sh.pos[2] = round3(sh.pos[2] + uz * this.tuning.pulse_push_m);
      }
    }

    if (stunned.length > 0) this.score += this.tuning.score.per_stun * stunned.length;
    this.emit(eventTick, 'pulse', { stunned_ids: stunned });
  }

  // ---------- Bóng Mực ----------

  inSafeZone(x, z) {
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      if (Math.hypot(x - l.pos[0], z - l.pos[2]) <= this.tuning.safe_radius) return true;
    }
    return false;
  }

  pushShadesOutOfSafeZone(lantern) {
    for (const sh of this.shades) {
      const d = distXZ(sh.pos, lantern.pos);
      if (d < this.tuning.safe_radius) {
        let ux = 1;
        let uz = 0;
        if (d > 1e-9) {
          ux = (sh.pos[0] - lantern.pos[0]) / d;
          uz = (sh.pos[2] - lantern.pos[2]) / d;
        }
        sh.pos[0] = round3(lantern.pos[0] + ux * this.tuning.safe_radius);
        sh.pos[2] = round3(lantern.pos[2] + uz * this.tuning.safe_radius);
      }
    }
  }

  updateShades(eventTick) {
    for (const sh of this.shades) {
      if (sh.state === 'stunned') {
        if (eventTick >= sh.stunUntil) sh.state = 'chase';
        continue;
      }
      const d = distXZ(this.player.pos, sh.pos);
      if (d > 1e-9) {
        const ux = (this.player.pos[0] - sh.pos[0]) / d;
        const uz = (this.player.pos[2] - sh.pos[2]) / d;
        const stepM = this.tuning.shade_speed / TICKS_PER_SECOND;
        const nx = sh.pos[0] + ux * stepM;
        const nz = sh.pos[2] + uz * stepM;
        if (!this.inSafeZone(nx, nz)) {
          sh.pos[0] = nx;
          sh.pos[2] = nz;
        }
      }
    }

    for (const sh of this.shades) {
      if (sh.state !== 'chase') continue;
      if (this.player.invulnUntil > eventTick) continue;
      if (distXZ(this.player.pos, sh.pos) <= this.tuning.shade_hit_radius) {
        this.playerHit(eventTick, 'shade');
        break; // tối đa 1 lần trúng mỗi tick
      }
    }
  }

  playerHit(eventTick, by) {
    let dropped;
    if (by === 'fall') dropped = this.player.carried;
    else dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);

    this.player.carried -= dropped;
    this.player.flames -= 1;
    if (by === 'fall') this.player.pos = [0, 0, 0];
    if (dropped > 0) this.scatterDroppedMotes(dropped);
    this.player.invulnUntil = eventTick + Math.round(this.tuning.invuln_s * TICKS_PER_SECOND);
    this.emit(eventTick, 'player_hit', { by, flames: this.player.flames, dropped });
  }

  // ---------- đom đóm ----------

  pickupMotes(eventTick) {
    if (this.state !== 'playing') return;
    const remaining = [];
    for (const m of this.motes) {
      if (
        this.player.carried < this.tuning.carry_capacity &&
        distXZ(this.player.pos, m.pos) <= this.tuning.pickup_radius
      ) {
        this.player.carried += 1;
        this.score += this.tuning.score.per_mote;
        this.emit(eventTick, 'mote_picked', { carried: this.player.carried });
      } else {
        remaining.push(m);
      }
    }
    this.motes = remaining;
  }

  maybeSpawnShade(eventTick) {
    if (this.shadeSpawnSchedule.has(eventTick)) {
      const id = this.addShade(this.randomPositionOnIsland());
      this.emit(eventTick, 'shade_spawned', { id });
    }
  }

  // ---------- điều kiện kết thúc ----------

  checkEndConditions(eventTick) {
    if (this.state !== 'playing') return;
    if (this.lanterns.every((l) => l.lit)) {
      this.finish(eventTick, 'won', 'all_lit');
      return;
    }
    if (this.player.flames <= 0) {
      this.finish(eventTick, 'lost', 'no_flames');
      return;
    }
    if (this.nightDurationS - eventTick / TICKS_PER_SECOND <= 0) {
      this.finish(eventTick, 'lost', 'dawn');
    }
  }

  finish(eventTick, result, reason) {
    this.state = result;
    if (result === 'won') {
      const timeLeft = this.nightDurationS - eventTick / TICKS_PER_SECOND;
      this.score += this.tuning.score.per_second_left * Math.floor(timeLeft);
      this.score += this.tuning.score.per_flame_left * this.player.flames;
    }
    this.emit(eventTick, 'game_over', { result, reason });
  }

  // ---------- bước mô phỏng ----------

  step(frame) {
    const eventTick = this.tick + 1;
    this.pendingEvents = [];
    const prev = this.prev;

    if (frame) this.applyFrame(frame);

    this.movePlayer();
    this.checkFall(eventTick);
    // jump: ở headless không có hiệu ứng quan sát được (chỉ hiển thị ở chế độ 3D).
    if (this.input.interact && !prev.interact) this.tryDeposit(eventTick);
    if (this.input.pulse && !prev.pulse) this.tryPulse(eventTick);
    this.updateShades(eventTick);
    this.pickupMotes(eventTick);
    this.maybeSpawnShade(eventTick);
    this.checkEndConditions(eventTick);

    this.tick = eventTick;
    this.prev = { jump: this.input.jump, interact: this.input.interact, pulse: this.input.pulse };
    return this.pendingEvents;
  }

  // ---------- đầu ra ----------

  snapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.tick,
      state: this.state,
      time_left_s: round3(this.nightDurationS - this.tick / TICKS_PER_SECOND),
      score: this.score,
      player: {
        pos: round3Vec(this.player.pos),
        flames: this.player.flames,
        carried: this.player.carried,
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: round3Vec(l.pos),
        lit: l.lit,
        deposited: l.deposited,
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: round3Vec(s.pos),
        state: s.state,
      })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: round3Vec(m.pos) })),
    };
  }

  endLine() {
    return { type: 'end', ticks: this.tick, state: this.state, score: this.score };
  }
}
