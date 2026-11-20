// Đảo Đèn Lồng — engine mô phỏng (Test Contract v1.1).
// Logic thuần, tách khỏi hiển thị, dùng chung cho headless (Node) và game 3D (browser).

import { TUNING, P, NIGHTS, TICKS_PER_SECOND } from './constants.js';
import { createRng } from './rng.js';

const round3 = (x) => Math.round(x * 1000) / 1000;
const round3Vec = (v) => [round3(v[0]), round3(v[1]), round3(v[2])];
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const distXZ = (a, b) => {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
};
const dist3D = (a, b) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
function approach(cur, tgt, delta) {
  if (cur < tgt) return Math.min(tgt, cur + delta);
  if (cur > tgt) return Math.max(tgt, cur - delta);
  return tgt;
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}
function idNum(id) {
  const m = /(\d+)$/.exec(id);
  return m ? parseInt(m[1], 10) : 0;
}

export class Game {
  constructor({ seed = 0, night = 1, tuning = TUNING } = {}) {
    this.tuning = tuning;
    this.seed = seed;
    this.rng = createRng(seed);
    this.nightNum = night;
    this.night = NIGHTS[night] || NIGHTS[1];

    this.tick = 0; // tổng số bước (tăng cả khi pause)
    this.simTick = 0; // bước gameplay (đứng yên khi pause)
    this.state = 'playing';
    this.paused = false;
    this.score = 0;
    this.durationS = this.night.duration_s;

    this.player = {
      pos: [0, 0, 0],
      vel: [0, 0, 0],
      flames: tuning.flames,
      carried: 0,
      grounded: true,
      invulnTicks: 0,
      dashCdTicks: 0,
      dashTicks: 0,
      dashDir: [0, 0],
      pulseCdTicks: 0,
      charmTicks: 0,
      launch: null,
      recoverTicks: 0,
    };

    this.lanterns = [];
    this.motes = [];
    this.shades = [];
    this.drifters = [];
    this.charms = [];

    this.moteCounter = 0;
    this.shadeCounter = 0;
    this.drifterCounter = 0;

    this.input = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
    this.prev = { jump: false, interact: false, pulse: false, dash: false, pause: false };
    this.pendingEvents = [];

    this.wind = { active: false, dir_deg: 0 };
    this.windEnabled = !!this.night.wind;

    this.moteSpawnOrder = [];
    this.moteSpawnCursor = 0;

    this.night.lanterns.forEach((pos, i) => {
      this.lanterns.push({ id: 'L' + (i + 1), pos: [...pos], lit: false, deposited: 0 });
    });
  }

  // ---------------- địa hình ----------------

  groundY(x, z) {
    switch (this.nightNum) {
      case 2: return this._groundN2(x, z);
      case 3: return this._groundN3(x, z);
      default: return x * x + z * z <= 40 * 40 ? 0 : null;
    }
  }

  _groundN2(x, z) {
    if (x * x + z * z <= 28 * 28) return 0;
    const dx = x - 70;
    if (dx * dx + z * z <= 28 * 28) return 0;
    if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0;
    return null;
  }

  _groundN3(x, z) {
    const r = Math.hypot(x, z);
    if (r > 45) return null;
    if (r <= 8) return 6; // tầng 2 (tháp chuông r<=2 được chặn riêng)
    const ang = Math.atan2(z, x);
    if (z > 0 && r >= 12 && r <= 24) return 3; // tầng 1 (nửa z>0)
    for (const rampDeg of [30, 150]) {
      const ra = (rampDeg * Math.PI) / 180;
      let da = Math.abs(ang - ra);
      if (da > Math.PI) da = 2 * Math.PI - da;
      if (da <= 1.5 / r && r >= 24 && r <= 30) return (30 - r) / 2;
    }
    return 0; // tầng 0
  }

  // tháp chuông (Đêm 3): chặn ngang khi ở dưới đỉnh tháp
  isTowerBlocked(x, z, y) {
    if (this.nightNum !== 3) return false;
    if (x * x + z * z > 2 * 2) return false;
    return y < 14;
  }

  // ---------------- tiện ích ----------------

  emit(tick, name, data) {
    this.pendingEvents.push({ type: 'event', tick, name, data });
  }

  addMote(pos, kind) {
    const id = 'M' + ++this.moteCounter;
    this.motes.push({ id, pos: [...pos], kind, ttlTicks: kind === 'dropped' ? P.dropped_mote_ttl_ticks : null });
    return id;
  }

  addShade(pos, explicitId, state = 'spawning', stateTicks = P.shade_spawn_state_ticks) {
    let id;
    if (explicitId) {
      id = explicitId;
      const m = /^S(\d+)$/.exec(explicitId);
      if (m) this.shadeCounter = Math.max(this.shadeCounter, parseInt(m[1], 10));
    } else {
      id = 'S' + ++this.shadeCounter;
    }
    this.shades.push({
      id,
      pos: [pos[0], this.groundY(pos[0], pos[2]) != null ? this.groundY(pos[0], pos[2]) + P.shade_center_height : pos[1], pos[2]],
      state,
      stateTicks,
      stunUntil: 0,
      pushTicks: 0,
      pushDir: [1, 0],
      recoilDir: [1, 0],
      safePushTicks: 0,
      safePushFrom: [0, 0],
    });
    return id;
  }

  addDrifter(pos, explicitId, state = 'idle', stolen = 0) {
    const id = explicitId || 'D' + ++this.drifterCounter;
    this.drifters.push({
      id,
      pos: [...pos],
      state,
      stolen,
      stateTicks: 0,
      heading: this.rng() * 2 * Math.PI,
    });
    return id;
  }

  randomDrifterPos() {
    const a = this.rng() * 2 * Math.PI;
    const r = 10 + this.rng() * 10;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const gy = this.groundY(x, z);
    return [x, gy != null ? gy + P.drifter_height : P.drifter_height, z];
  }

  scatterDroppedMotes(count) {
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count + 0.3;
      const r = 2.0;
      const x = this.player.pos[0] + Math.cos(angle) * r;
      const z = this.player.pos[2] + Math.sin(angle) * r;
      const gy = this.groundY(x, z);
      this.addMote([x, gy != null ? gy : this.player.pos[1], z], 'dropped');
    }
  }

  dropMotesAt(count, pos) {
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count + 0.3;
      const r = 2.0;
      const x = pos[0] + Math.cos(angle) * r;
      const z = pos[2] + Math.sin(angle) * r;
      const gy = this.groundY(x, z);
      this.addMote([x, gy != null ? gy : pos[1], z], 'dropped');
    }
  }

  // ---------------- dựng scenario ----------------

  buildScenario(scenario) {
    const s = scenario || {};
    const p = this.player;
    if (s.player) {
      if (s.player.pos) p.pos = [...s.player.pos];
      if (s.player.carried != null) p.carried = s.player.carried;
      if (s.player.flames != null) p.flames = s.player.flames;
      if (s.player.invuln_ticks != null) p.invulnTicks = s.player.invuln_ticks;
      if (s.player.dash_cd_ticks != null) p.dashCdTicks = s.player.dash_cd_ticks;
      if (s.player.pulse_cd_ticks != null) p.pulseCdTicks = s.player.pulse_cd_ticks;
      if (s.player.charm_ticks != null) p.charmTicks = s.player.charm_ticks;
    }
    if (s.time_left_s != null) this.durationS = s.time_left_s;

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
      this.moteSpawnOrder = shuffle(this.night.motePoints, this.rng);
      const n = Math.min(P.mote_initial_count, this.moteSpawnOrder.length);
      for (let i = 0; i < n; i++) this.addMote(this.moteSpawnOrder[i], 'random');
      this.moteSpawnCursor = n;
    } else {
      this.motes = [];
      for (const m of s.motes || []) this.addMote([m[0], m[1], m[2]], 'random');
    }

    const randomShades = s.random_shades == null ? true : !!s.random_shades;
    if (randomShades) {
      this.shades = [];
    } else {
      this.shades = [];
      for (const sh of s.shades || []) {
        this.addShade(sh.pos, sh.id, sh.state || 'chase', sh.state_ticks_left != null ? sh.state_ticks_left : 0);
      }
    }

    const randomDrifters = s.random_drifters == null ? !!this.night.drifters : !!s.random_drifters;
    if (randomDrifters) {
      this.drifters = [];
    } else {
      this.drifters = [];
      for (const d of s.drifters || []) this.addDrifter(d.pos, d.id, d.state || 'idle', d.stolen || 0);
    }

    if (s.charms) {
      this.charms = [];
      for (const c of s.charms) {
        this.charms.push({
          id: c.id,
          pos: [...c.pos],
          available: c.available != null ? !!c.available : true,
          respawnTicks: 0,
        });
      }
    } else {
      this.charms = this.night.charms.map((pos, i) => ({
        id: 'C' + (i + 1),
        pos: [...pos],
        available: true,
        respawnTicks: 0,
      }));
    }

    if (s.wind_enabled != null) this.windEnabled = !!s.wind_enabled;
  }

  // ---------------- input ----------------

  applyFrame(frame) {
    if (frame.move) {
      this.input.move = [clamp(frame.move[0], -1, 1), clamp(frame.move[1], -1, 1)];
    }
    if (frame.cam_yaw_deg != null) this.input.cam_yaw_deg = frame.cam_yaw_deg;
    if (frame.jump != null) this.input.jump = !!frame.jump;
    if (frame.interact != null) this.input.interact = !!frame.interact;
    if (frame.pulse != null) this.input.pulse = !!frame.pulse;
    if (frame.dash != null) this.input.dash = !!frame.dash;
    if (frame.pause != null) this.input.pause = !!frame.pause;
  }

  // ---------------- bước mô phỏng ----------------

  step(frame) {
    const eventTick = this.tick + 1;
    this.pendingEvents = [];
    const prev = this.prev;

    if (frame) this.applyFrame(frame);

    const jumpEdge = this.input.jump && !prev.jump;
    const interactEdge = this.input.interact && !prev.interact;
    const pulseEdge = this.input.pulse && !prev.pulse;
    const dashEdge = this.input.dash && !prev.dash;
    const pauseEdge = this.input.pause && !prev.pause;

    // 1. xử lý pause trước
    if (this.paused) {
      if (pauseEdge) {
        this.paused = false;
        this.emit(eventTick, 'resumed', {});
      } else {
        this.tick = eventTick;
        this.prev = this._prevCopy();
        return this.pendingEvents;
      }
    } else if (pauseEdge) {
      this.paused = true;
      this.emit(eventTick, 'paused', {});
      this.tick = eventTick;
      this.prev = this._prevCopy();
      return this.pendingEvents;
    }

    this.simTick++;

    // 2. giảm bộ đếm
    this.decrementCounters();

    // 3. di chuyển + rơi
    this.movePlayer(eventTick, jumpEdge, dashEdge);
    this.checkFall(eventTick);

    // 4. nhặt đom đóm + bùa
    this.pickup(eventTick);

    // 5. tương tác đèn
    if (interactEdge) this.tryDeposit(eventTick);

    // 6. (vùng an toàn được cập nhật ngay khi đèn thắp + trong moveShades)

    // 7. tỏa sáng
    if (pulseEdge) this.tryPulse(eventTick);

    // 8. di chuyển Bóng Mực + Gió Lạc
    this.moveShades(eventTick);
    this.moveDrifters(eventTick);

    // 9. chạm: Gió Lạc cướp trước, rồi Bóng Mực
    this.drifterTouch(eventTick);
    this.shadeTouch(eventTick);

    // 10. sinh theo lịch
    this.spawnSchedules(eventTick);

    // 11. thắng/thua
    this.checkEndConditions(eventTick);

    this.tick = eventTick;
    this.prev = this._prevCopy();
    return this.pendingEvents;
  }

  _prevCopy() {
    return {
      jump: this.input.jump,
      interact: this.input.interact,
      pulse: this.input.pulse,
      dash: this.input.dash,
      pause: this.input.pause,
    };
  }

  decrementCounters() {
    const p = this.player;
    if (p.dashCdTicks > 0) p.dashCdTicks--;
    if (p.pulseCdTicks > 0) p.pulseCdTicks--;
    if (p.invulnTicks > 0) p.invulnTicks--;
    if (p.charmTicks > 0) p.charmTicks--;
    if (p.dashTicks > 0) p.dashTicks--;

    if (p.recoverTicks > 0) {
      p.recoverTicks--;
      if (p.recoverTicks === 0 && p.flames > 0) {
        p.pos = [0, 0, 0];
        p.vel = [0, 0, 0];
        p.grounded = true;
        p.launch = null;
        p.invulnTicks = P.respawn_invuln_ticks;
      }
    }

    // TTL đom đóm rơi
    for (const m of this.motes) {
      if (m.kind === 'dropped' && m.ttlTicks > 0) m.ttlTicks--;
    }
    this.motes = this.motes.filter((m) => m.kind !== 'dropped' || m.ttlTicks > 0);

    // bùa hồi
    for (const c of this.charms) {
      if (!c.available && c.respawnTicks > 0) c.respawnTicks--;
      if (!c.available && c.respawnTicks <= 0) c.available = true;
    }

    this.updateWind();
  }

  updateWind() {
    if (!this.windEnabled) {
      this.wind.active = false;
      return;
    }
    const s = this.simTick;
    const active = s >= P.wind_interval_ticks && s % P.wind_interval_ticks < P.wind_duration_ticks;
    if (active && !this.wind.active) {
      this.wind.dir_deg = Math.round(this.rng() * 360);
    }
    this.wind.active = active;
  }

  // ---------------- di chuyển ----------------

  movePlayer(eventTick, jumpEdge, dashEdge) {
    const p = this.player;
    if (p.recoverTicks > 0) return;

    const dt = 1 / TICKS_PER_SECOND;
    const rad = (this.input.cam_yaw_deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    let mx = clamp(this.input.move[0], -1, 1);
    let mz = clamp(this.input.move[1], -1, 1);
    let mdx = mx * cos + mz * sin;
    let mdz = -mx * sin + mz * cos;
    const mlen = Math.hypot(mdx, mdz);
    const moving = mlen > 1e-6;
    if (moving) {
      mdx /= mlen;
      mdz /= mlen;
    }
    const facingX = sin;
    const facingZ = cos;

    // lướt
    if (dashEdge && p.dashTicks <= 0) {
      p.dashTicks = Math.round(this.tuning.dash_duration_s * TICKS_PER_SECOND);
      p.dashDir = moving ? [mdx, mdz] : [facingX, facingZ];
      if (p.charmTicks <= 0) p.dashCdTicks = Math.round(this.tuning.dash_cooldown_s * TICKS_PER_SECOND);
      this.emit(eventTick, 'dash', {});
    }

    // nhảy
    if (jumpEdge && p.grounded) {
      p.vel[1] = P.jump_velocity;
      p.grounded = false;
    }

    // vận tốc ngang mục tiêu
    const runSpeed = p.charmTicks > 0 ? P.charm_run_speed : this.tuning.player_speed;
    let tgtX;
    let tgtZ;
    if (p.dashTicks > 0) {
      tgtX = p.dashDir[0] * this.tuning.dash_speed;
      tgtZ = p.dashDir[1] * this.tuning.dash_speed;
    } else if (p.launch) {
      tgtX = p.launch.vx;
      tgtZ = p.launch.vz;
    } else {
      tgtX = mdx * runSpeed;
      tgtZ = mdz * runSpeed;
      if (this.wind.active) {
        const wr = (this.wind.dir_deg * Math.PI) / 180;
        tgtX += Math.cos(wr) * P.wind_push_speed;
        tgtZ += Math.sin(wr) * P.wind_push_speed;
      }
    }

    const accel = P.run_accel * dt;
    p.vel[0] = approach(p.vel[0], tgtX, accel);
    p.vel[2] = approach(p.vel[2], tgtZ, accel);

    if (p.dashTicks > 0) {
      p.vel[1] = 0; // giữ nguyên độ cao khi lướt
    } else {
      p.vel[1] -= P.gravity * dt;
    }

    // bục nhảy
    this.checkBouncePad();

    // tích phân vị trí (có chặn vách)
    let nx = p.pos[0] + p.vel[0] * dt;
    let nz = p.pos[2] + p.vel[2] * dt;
    let ny = p.pos[1] + p.vel[1] * dt;

    if (p.grounded) {
      const gyN = this.groundY(nx, nz);
      if (gyN != null && gyN - p.pos[1] > P.step_height) {
        nx = p.pos[0];
        nz = p.pos[2];
        ny = p.pos[1];
      }
    }
    if (this.isTowerBlocked(nx, nz, ny)) {
      nx = p.pos[0];
      nz = p.pos[2];
      ny = p.pos[1];
    }

    p.pos[0] = nx;
    p.pos[1] = ny;
    p.pos[2] = nz;

    const gy = this.groundY(nx, nz);
    if (gy == null) {
      p.grounded = false;
    } else if (ny <= gy) {
      p.pos[1] = gy;
      if (p.vel[1] < 0) p.vel[1] = 0;
      p.grounded = true;
      p.launch = null;
    } else {
      p.grounded = false;
    }
  }

  checkBouncePad() {
    const p = this.player;
    if (!p.grounded) return;
    for (const pad of this.night.bouncePads) {
      const d = Math.hypot(p.pos[0] - pad.pos[0], p.pos[2] - pad.pos[2]);
      if (d <= P.bounce_pad_radius && Math.abs(p.pos[1] - pad.pos[1]) <= 0.5) {
        const dx = pad.toward[0] - pad.pos[0];
        const dz = pad.toward[2] - pad.pos[2];
        const dl = Math.hypot(dx, dz) || 1;
        p.vel[1] = pad.vy;
        p.launch = { vx: (dx / dl) * pad.vh, vz: (dz / dl) * pad.vh };
        p.grounded = false;
        return;
      }
    }
  }

  checkFall(eventTick) {
    const p = this.player;
    if (p.recoverTicks > 0) return;
    if (p.pos[1] < P.fall_threshold_y) {
      const lost = p.carried;
      p.carried = 0;
      p.flames -= 1;
      p.recoverTicks = P.fall_recover_ticks;
      p.launch = null;
      p.dashTicks = 0;
      this.emit(eventTick, 'player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    }
  }

  // ---------------- nhặt ----------------

  pickup(eventTick) {
    const p = this.player;
    if (p.recoverTicks > 0) return;

    const remaining = [];
    for (const m of this.motes) {
      if (
        p.carried < this.tuning.carry_capacity &&
        distXZ(p.pos, m.pos) <= this.tuning.pickup_radius &&
        Math.abs(m.pos[1] - p.pos[1]) <= P.mote_pickup_height
      ) {
        p.carried += 1;
        this.emit(eventTick, 'mote_picked', { carried: p.carried });
      } else {
        remaining.push(m);
      }
    }
    this.motes = remaining;

    for (const c of this.charms) {
      if (!c.available) continue;
      if (distXZ(p.pos, c.pos) <= this.tuning.pickup_radius && Math.abs(c.pos[1] - p.pos[1]) <= P.mote_pickup_height) {
        c.available = false;
        c.respawnTicks = P.charm_respawn_ticks;
        p.charmTicks = P.charm_effect_ticks;
        this.emit(eventTick, 'charm_picked', { charm_id: c.id, charm_ticks: p.charmTicks });
      }
    }
  }

  // ---------------- tương tác đèn ----------------

  tryDeposit(eventTick) {
    const p = this.player;
    if (p.carried <= 0) return;
    let best = null;
    let bestDist = Infinity;
    for (const l of this.lanterns) {
      if (l.lit) continue;
      const d = distXZ(p.pos, l.pos);
      if (d <= this.tuning.interact_radius && d < bestDist) {
        best = l;
        bestDist = d;
      }
    }
    if (!best) return;
    const need = this.tuning.lantern_cost - best.deposited;
    const amount = Math.min(p.carried, need);
    if (amount <= 0) return;
    best.deposited += amount;
    p.carried -= amount;
    this.score += this.tuning.score.per_mote * amount;
    this.emit(eventTick, 'deposit', { lantern_id: best.id, amount, deposited: best.deposited });
    if (best.deposited >= this.tuning.lantern_cost) {
      best.lit = true;
      this.score += this.tuning.score.per_lantern;
      this.emit(eventTick, 'lantern_lit', { lantern_id: best.id });
      this.pushShadesOutOfSafeZone(best);
    }
  }

  // ---------------- tỏa sáng ----------------

  tryPulse(eventTick) {
    const p = this.player;
    if (p.pulseCdTicks > 0) return;
    if (p.carried < this.tuning.pulse_cost) return;
    p.carried -= this.tuning.pulse_cost;
    p.pulseCdTicks = Math.round(this.tuning.pulse_cooldown_s * TICKS_PER_SECOND);

    const cx = p.pos[0];
    const cy = p.pos[1] + P.pulse_center_height;
    const cz = p.pos[2];

    const stunned = [];
    for (const sh of this.shades) {
      if (dist3D([cx, cy, cz], sh.pos) <= this.tuning.pulse_radius) {
        sh.state = 'stunned';
        sh.stateTicks = P.shade_stun_ticks;
        sh.pushTicks = P.shade_push_ticks;
        const d = distXZ(p.pos, sh.pos);
        if (d > 1e-6) sh.pushDir = [(sh.pos[0] - p.pos[0]) / d, (sh.pos[2] - p.pos[2]) / d];
        else sh.pushDir = [1, 0];
        stunned.push(sh.id);
        this.score += this.tuning.score.per_stun;
      }
    }
    this.emit(eventTick, 'pulse', { stunned_ids: stunned });

    for (const d of this.drifters) {
      if (dist3D([cx, cy, cz], d.pos) > this.tuning.pulse_radius) continue;
      if (d.state === 'chase') {
        d.state = 'flee';
        d.stateTicks = P.drifter_flee_ticks;
      } else if (d.state === 'flee' && d.stolen > 0) {
        const amount = d.stolen;
        d.stolen = 0;
        this.dropMotesAt(amount, d.pos);
        d.stateTicks = P.drifter_drop_fade_ticks;
        this.emit(eventTick, 'drifter_drop', { drifter_id: d.id, amount });
      }
    }
  }

  // ---------------- Bóng Mực ----------------

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
        sh.safePushTicks = 30;
        sh.safePushFrom = [lantern.pos[0], lantern.pos[2]];
      }
    }
  }

  shadeNextState(sh) {
    const d = distXZ(this.player.pos, sh.pos);
    return d <= P.shade_detect_range ? 'chase' : 'wander';
  }

  _syncShadeY(sh) {
    const gy = this.groundY(sh.pos[0], sh.pos[2]);
    if (gy != null) sh.pos[1] = gy + P.shade_center_height;
  }

  moveShades(eventTick) {
    const p = this.player;
    for (const sh of this.shades) {
      // đẩy khỏi vùng an toàn
      if (sh.safePushTicks > 0) {
        sh.safePushTicks--;
        const d = distXZ(sh.pos, sh.safePushFrom);
        if (d < this.tuning.safe_radius) {
          let ux;
          let uz;
          if (d > 1e-6) {
            ux = (sh.pos[0] - sh.safePushFrom[0]) / d;
            uz = (sh.pos[2] - sh.safePushFrom[1]) / d;
          } else {
            ux = 1;
            uz = 0;
          }
          sh.pos[0] += ux * 0.2;
          sh.pos[2] += uz * 0.2;
        }
        this._syncShadeY(sh);
        continue;
      }

      if (sh.state === 'spawning') {
        sh.stateTicks--;
        if (sh.stateTicks <= 0) sh.state = 'wander';
        continue;
      }
      if (sh.state === 'stunned') {
        sh.stateTicks--;
        if (sh.pushTicks > 0) {
          sh.pushTicks--;
          const step = this.tuning.pulse_push_m / P.shade_push_ticks;
          sh.pos[0] += sh.pushDir[0] * step;
          sh.pos[2] += sh.pushDir[1] * step;
          const gy = this.groundY(sh.pos[0], sh.pos[2]);
          if (gy == null) {
            sh.pos[0] -= sh.pushDir[0] * step;
            sh.pos[2] -= sh.pushDir[1] * step;
          }
        }
        if (sh.stateTicks <= 0) sh.state = this.shadeNextState(sh);
        this._syncShadeY(sh);
        continue;
      }
      if (sh.state === 'recoil') {
        sh.stateTicks--;
        const step = P.shade_recoil_m / P.shade_recoil_ticks;
        sh.pos[0] += sh.recoilDir[0] * step;
        sh.pos[2] += sh.recoilDir[1] * step;
        if (sh.stateTicks <= 0) sh.state = this.shadeNextState(sh);
        this._syncShadeY(sh);
        continue;
      }

      // chase / wander
      const d = distXZ(p.pos, sh.pos);
      if (sh.state === 'chase' && d > P.shade_lose_range) sh.state = 'wander';
      else if (sh.state === 'wander' && d <= P.shade_detect_range) sh.state = 'chase';

      if (sh.state === 'chase' && d > 1e-6) {
        const ux = (p.pos[0] - sh.pos[0]) / d;
        const uz = (p.pos[2] - sh.pos[2]) / d;
        const stepM = this.night.shadeSpeed / TICKS_PER_SECOND;
        const nx = sh.pos[0] + ux * stepM;
        const nz = sh.pos[2] + uz * stepM;
        if (!this.inSafeZone(nx, nz) && this.groundY(nx, nz) != null) {
          sh.pos[0] = nx;
          sh.pos[2] = nz;
        }
      }
      this._syncShadeY(sh);
    }
  }

  // ---------------- Gió Lạc ----------------

  moveDrifters(eventTick) {
    const p = this.player;
    for (const d of this.drifters) {
      if (d.state === 'idle') {
        if (p.carried >= P.drifter_steal_threshold && distXZ(p.pos, d.pos) <= P.drifter_detect_range) {
          d.state = 'chase';
        } else {
          // lượn chậm
          d.pos[0] += Math.cos(d.heading) * (P.drifter_idle_speed / TICKS_PER_SECOND);
          d.pos[2] += Math.sin(d.heading) * (P.drifter_idle_speed / TICKS_PER_SECOND);
          if (this.groundY(d.pos[0], d.pos[2]) == null) {
            d.pos[0] -= Math.cos(d.heading) * (P.drifter_idle_speed / TICKS_PER_SECOND);
            d.pos[2] -= Math.sin(d.heading) * (P.drifter_idle_speed / TICKS_PER_SECOND);
            d.heading += Math.PI;
          }
        }
      } else if (d.state === 'chase') {
        if (p.carried < P.drifter_steal_threshold || distXZ(p.pos, d.pos) > P.drifter_detect_range) {
          d.state = 'idle';
        } else {
          const dd = distXZ(p.pos, d.pos);
          if (dd > 1e-6) {
            d.pos[0] += ((p.pos[0] - d.pos[0]) / dd) * (P.drifter_chase_speed / TICKS_PER_SECOND);
            d.pos[2] += ((p.pos[2] - d.pos[2]) / dd) * (P.drifter_chase_speed / TICKS_PER_SECOND);
          }
        }
      } else if (d.state === 'flee') {
        d.stateTicks--;
        if (d.stateTicks <= 0) {
          d.state = 'removed';
        } else {
          const dd = distXZ(p.pos, d.pos);
          let ux = 1;
          let uz = 0;
          if (dd > 1e-6) {
            ux = (d.pos[0] - p.pos[0]) / dd;
            uz = (d.pos[2] - p.pos[2]) / dd;
          }
          d.pos[0] += ux * (P.drifter_flee_speed / TICKS_PER_SECOND);
          d.pos[2] += uz * (P.drifter_flee_speed / TICKS_PER_SECOND);
        }
      }
      const gy = this.groundY(d.pos[0], d.pos[2]);
      if (gy != null) d.pos[1] = gy + P.drifter_height;
    }
    this.drifters = this.drifters.filter((d) => d.state !== 'removed');
  }

  // ---------------- chạm ----------------

  drifterTouch(eventTick) {
    const p = this.player;
    if (p.recoverTicks > 0) return;
    const sorted = this.drifters.slice().sort((a, b) => idNum(a.id) - idNum(b.id));
    for (const d of sorted) {
      if (d.state !== 'chase') continue;
      if (distXZ(p.pos, d.pos) > P.drifter_touch_radius) continue;
      const amount = Math.min(P.drifter_steal_amount, p.carried);
      p.carried -= amount;
      d.stolen = amount;
      d.state = 'flee';
      d.stateTicks = P.drifter_flee_ticks;
      this.emit(eventTick, 'drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
    }
  }

  shadeTouch(eventTick) {
    const p = this.player;
    if (p.recoverTicks > 0) return;
    const sorted = this.shades.slice().sort((a, b) => idNum(a.id) - idNum(b.id));
    for (const sh of sorted) {
      if (sh.state !== 'chase') continue;
      if (sh.safePushTicks > 0) continue;
      if (p.invulnTicks > 0) continue;
      if (distXZ(p.pos, sh.pos) > this.tuning.shade_hit_radius) continue;
      if (Math.abs(sh.pos[1] - p.pos[1]) > P.mote_pickup_height) continue;
      p.flames -= 1;
      const dropped = Math.floor(p.carried / 2);
      p.carried -= dropped;
      if (dropped > 0) this.scatterDroppedMotes(dropped);
      p.invulnTicks = P.hit_invuln_ticks;
      sh.state = 'recoil';
      sh.stateTicks = P.shade_recoil_ticks;
      const d = distXZ(p.pos, sh.pos);
      if (d > 1e-6) sh.recoilDir = [(sh.pos[0] - p.pos[0]) / d, (sh.pos[2] - p.pos[2]) / d];
      else sh.recoilDir = [1, 0];
      this.emit(eventTick, 'player_hit', { by: 'shade', flames: p.flames, dropped });
      break;
    }
  }

  // ---------------- sinh theo lịch ----------------

  spawnSchedules(eventTick) {
    this.maybeSpawnMotes(eventTick);
    this.maybeSpawnShades(eventTick);
    this.maybeSpawnDrifters(eventTick);
  }

  maybeSpawnMotes(eventTick) {
    if (this.moteSpawnOrder.length === 0) return;
    if (this.motes.length >= P.mote_cap) return;
    const s = this.simTick;
    if (s > 0 && s % P.mote_respawn_every_ticks === 0) {
      for (let i = 0; i < this.moteSpawnOrder.length; i++) {
        const pt = this.moteSpawnOrder[this.moteSpawnCursor % this.moteSpawnOrder.length];
        this.moteSpawnCursor++;
        const occupied = this.motes.some((m) => Math.hypot(m.pos[0] - pt[0], m.pos[2] - pt[2]) < 0.5);
        if (!occupied) {
          this.addMote(pt, 'random');
          return;
        }
      }
    }
  }

  maybeSpawnShades(eventTick) {
    const s = this.simTick;
    const night = this.night;
    if (this.shades.length >= night.shadeMax) return;
    let count = 0;
    if (s === P.shade_first_spawn_tick) count = P.shade_first_count;
    else if (s > P.shade_first_spawn_tick && (s - P.shade_first_spawn_tick) % night.shadeSpawnInterval === 0) count = 1;
    for (let i = 0; i < count; i++) {
      if (this.shades.length >= night.shadeMax) break;
      const pt = this.pickShadeSpawnPoint();
      if (!pt) break;
      const id = this.addShade(pt, null, 'spawning', P.shade_spawn_state_ticks);
      this.emit(eventTick, 'shade_spawned', { id });
    }
  }

  pickShadeSpawnPoint() {
    const p = this.player;
    const valid = this.night.shadePoints.filter(
      (pt) => Math.hypot(pt[0] - p.pos[0], pt[2] - p.pos[2]) >= P.shade_min_player_dist
    );
    if (valid.length === 0) return null;
    const idx = Math.floor(this.rng() * valid.length);
    return valid[idx];
  }

  maybeSpawnDrifters(eventTick) {
    if (!this.night.drifters) return;
    if (this.drifters.length >= P.drifter_max) return;
    const s = this.simTick;
    if (s > 0 && s % P.drifter_spawn_every_ticks === 0) {
      this.addDrifter(this.randomDrifterPos(), null);
    }
  }

  // ---------------- thắng / thua ----------------

  checkEndConditions(eventTick) {
    if (this.state !== 'playing') return;
    const p = this.player;
    if (p.flames <= 0) {
      this.finish(eventTick, 'lost', 'no_flames');
      return;
    }
    if (this.lanterns.every((l) => l.lit)) {
      this.finish(eventTick, 'won', 'all_lit');
      return;
    }
    if (this.durationS - this.simTick / TICKS_PER_SECOND <= 0) {
      this.finish(eventTick, 'lost', 'dawn');
    }
  }

  finish(eventTick, result, reason) {
    this.state = result;
    if (result === 'won') {
      const timeLeft = this.durationS - this.simTick / TICKS_PER_SECOND;
      this.score += this.tuning.score.per_second_left * Math.floor(timeLeft);
      this.score += this.tuning.score.per_flame_left * this.player.flames;
    }
    this.emit(eventTick, 'game_over', { result, reason });
  }

  // ---------------- đầu ra ----------------

  snapshot() {
    const p = this.player;
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.simTick,
      state: this.paused ? 'paused' : this.state,
      night: this.nightNum,
      time_left_s: round3(this.durationS - this.simTick / TICKS_PER_SECOND),
      score: this.score,
      wind: { active: this.wind.active, dir_deg: this.wind.dir_deg },
      player: {
        pos: round3Vec(p.pos),
        vel: round3Vec(p.vel),
        flames: p.flames,
        carried: p.carried,
        grounded: p.grounded,
        invuln: p.invulnTicks > 0,
        dash_cd_s: round3(p.dashCdTicks / TICKS_PER_SECOND),
        pulse_cd_s: round3(p.pulseCdTicks / TICKS_PER_SECOND),
        charm_s: round3(p.charmTicks / TICKS_PER_SECOND),
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
      motes: this.motes.map((m) => ({
        id: m.id,
        pos: round3Vec(m.pos),
        kind: m.kind,
        ttl_s: m.kind === 'dropped' ? round3(m.ttlTicks / TICKS_PER_SECOND) : null,
      })),
      drifters: this.drifters.map((d) => ({
        id: d.id,
        pos: round3Vec(d.pos),
        state: d.state,
        stolen: d.stolen,
      })),
      charms: this.charms.map((c) => ({
        id: c.id,
        available: c.available,
        respawn_s: round3(c.respawnTicks / TICKS_PER_SECOND),
      })),
    };
  }

  endLine() {
    return { type: 'end', ticks: this.tick, state: this.state, score: this.score };
  }
}
