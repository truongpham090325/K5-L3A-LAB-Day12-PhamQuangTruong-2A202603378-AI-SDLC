// Đảo Đèn Lồng — số liệu chuẩn (Phase 3 / Ticket-03, Test Contract v1.2).
// Mọi giá trị bắt buộc theo ticket. `TUNING` khớp `game.contract.json`.

export const TICKS_PER_SECOND = 60;

export const TUNING = {
  player_speed: 6.0,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1.0,
  interact_radius: 2.0,
  pulse_cost: 3,
  pulse_radius: 5.0,
  night1_duration_s: 240,
  night2_duration_s: 270,
  night3_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2.0,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 3.0,
  safe_radius: 6.0,
  shade_speed: 4.0,
  shade_hit_radius: 1.0,
  fall_enabled: true,
  dash_speed: 14.0,
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  // v1.2 — nhiên liệu đèn & luật thắng
  fuel_max: 100,
  fuel_decay_per_s: 1.0,
  fuel_per_mote: 10,
  relight_cost: 5,
  win_ratio: 0.6,
  drain_per_s: 5,
  low_fuel_threshold: 30,
  capacity_max: 20,
  score: {
    per_mote: 5, // mỗi đom đóm nạp (thắp/châm dầu)
    per_lantern: 100, // thắp lần đầu
    per_relight: 40, // thắp lại
    per_stun: 5, // mỗi Bóng Mực trúng Tỏa Sáng
    per_drain_stun: 15, // Bóng Mực đang drain trúng Tỏa Sáng
    per_lantern_dawn: 50, // mỗi đèn đang sáng lúc bình minh (thắng)
    per_flame_left: 50, // mỗi Ngọn Lửa còn lại lúc thắng
  },
};

// Hằng số nội bộ (không nằm trong tuning JSON).
export const P = {
  gravity: 20.0,
  jump_velocity: 7.0,
  run_accel: 60.0,
  step_height: 0.5,
  fall_threshold_y: -10,

  shade_detect_range: 12.0,
  shade_lose_range: 18.0,
  shade_spawn_state_ticks: 60,
  shade_recoil_ticks: 60,
  shade_recoil_m: 2.0,
  shade_stun_ticks: 120,
  shade_push_ticks: 15,
  shade_center_height: 1.0,
  shade_drain_chase_range: 6.0, // drain -> chase khi Mây trong 6m
  shade_drain_touch: 2.0, // drain khi cách đèn <= 2m

  pulse_center_height: 0.8,

  dropped_mote_ttl_ticks: 480,
  dropped_ring_min: 1.5,
  dropped_ring_max: 2.5,
  mote_pickup_height: 1.5,
  mote_initial_count: 20,
  mote_cap: 30,
  mote_respawn_every_ticks: 240,

  shade_first_spawn_tick: 300,
  shade_first_count: 2,
  shade_min_player_dist: 15,

  hit_invuln_ticks: 90,
  fall_recover_ticks: 60,
  respawn_invuln_ticks: 90,

  drifter_max: 2,
  drifter_spawn_every_ticks: 1200,
  drifter_idle_speed: 2.0,
  drifter_chase_speed: 7.0,
  drifter_flee_speed: 7.0,
  drifter_touch_radius: 1.2,
  drifter_detect_range: 15.0,
  drifter_steal_threshold: 5,
  drifter_steal_amount: 3,
  drifter_flee_ticks: 240,
  drifter_drop_fade_ticks: 120,
  drifter_height: 1.0,

  charm_effect_ticks: 600,
  charm_respawn_ticks: 2700,
  charm_run_speed: 7.2,

  wind_interval_ticks: 1800,
  wind_duration_ticks: 300,
  wind_push_speed: 2.0,

  bounce_pad_radius: 1.0,
};

const DEG = Math.PI / 180;

function ring(cx, cz, radius, startDeg, stepDeg, count, y = 0) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (startDeg + stepDeg * i) * DEG;
    pts.push([cx + radius * Math.cos(a), y, cz + radius * Math.sin(a)]);
  }
  return pts;
}

export const NIGHTS = {
  1: {
    name: 'Đảo Bến',
    duration_s: TUNING.night1_duration_s,
    lanterns: [
      [0, 0, 25],
      [23.8, 0, 7.7],
      [14.7, 0, -20.2],
      [-14.7, 0, -20.2],
      [-23.8, 0, 7.7],
    ],
    motePoints: [...ring(0, 0, 12, 0, 45, 8, 0), ...ring(0, 0, 33, 0, 22.5, 16, 0)],
    shadePoints: ring(0, 0, 37, 15, 30, 12, 0),
    shadeSpawnInterval: 480,
    shadeMax: 6,
    shadeSpeed: 4.0,
    drifters: false,
    charms: [],
    wind: false,
    bouncePads: [],
  },
  2: {
    name: 'Đảo Cau',
    duration_s: TUNING.night2_duration_s,
    lanterns: [
      [0, 0, 20],
      [17, 0, -10],
      [-17, 0, -10],
      [70, 0, 20],
      [87, 0, -10],
      [53, 0, -10],
    ],
    motePoints: [
      ...ring(0, 0, 10, 0, 90, 4, 0),
      ...ring(0, 0, 22, 0, 45, 8, 0),
      ...ring(70, 0, 10, 0, 90, 4, 0),
      ...ring(70, 0, 22, 0, 45, 8, 0),
    ],
    shadePoints: [...ring(0, 0, 26, 22.5, 45, 8, 0), ...ring(70, 0, 26, 22.5, 45, 8, 0)],
    shadeSpawnInterval: 420,
    shadeMax: 8,
    shadeSpeed: 4.0,
    drifters: true,
    charms: [[35, 0, 0]],
    wind: false,
    bouncePads: [
      { pos: [20, 0, 18], toward: [70, 0, 0], vy: 14.0, vh: 24.0 },
      { pos: [50, 0, -18], toward: [0, 0, 0], vy: 14.0, vh: 24.0 },
    ],
  },
  3: {
    name: 'Đảo Chuông',
    duration_s: TUNING.night3_duration_s,
    lanterns: [
      [0, 6, 6],
      [18, 3, 10],
      [-18, 3, 10],
      [35, 0, -10],
      [-35, 0, -10],
      [20, 0, -35],
      [-20, 0, -35],
    ],
    motePoints: [
      ...ring(0, 0, 34, 0, 20, 18, 0),
      ...ring(0, 0, 18, 20, 20, 8, 3),
      ...ring(0, 0, 5, 45, 90, 4, 6),
    ],
    shadePoints: ring(0, 0, 43, 0, 22.5, 16, 0),
    shadeSpawnInterval: 360,
    shadeMax: 10,
    shadeSpeed: 4.5,
    drifters: true,
    charms: [
      [30, 0, 25],
      [-30, 0, 25],
    ],
    wind: true,
    bouncePads: [{ pos: [0, 3, 13], toward: [0, 0, 0], vy: 12.0, vh: 8.0 }],
  },
};
