// Đảo Đèn Lồng — số liệu chuẩn (Phase 2 / Ticket-02, Test Contract v1.1).
// Mọi giá trị dưới đây là BẮT BUỘC theo ticket; không được tự ý đổi.
// `TUNING` phải khớp CHÍNH XÁC `game.contract.json`.

export const TICKS_PER_SECOND = 60;

// Các khóa tuning xuất hiện trong game.contract.json (v1.1).
export const TUNING = {
  player_speed: 6.0,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1.0,
  interact_radius: 2.0,
  pulse_cost: 3, // đom đóm (không phải ngọn lửa)
  pulse_radius: 5.0,
  night1_duration_s: 300,
  night2_duration_s: 330,
  night3_duration_s: 360,
  flames: 3,
  invuln_s: 1.5, // 90 tick
  hit_drop_ratio: 0.5, // floor(carried / 2)
  pulse_stun_s: 2.0, // 120 tick
  pulse_push_m: 4.0,
  pulse_cooldown_s: 3.0,
  safe_radius: 6.0,
  shade_speed: 4.0,
  shade_hit_radius: 1.0,
  fall_enabled: true,
  dash_speed: 14.0,
  dash_duration_s: 0.2, // 12 tick
  dash_cooldown_s: 1.5, // 90 tick
  score: {
    per_mote: 10, // mỗi đom đóm NẠP
    per_lantern: 100,
    per_stun: 5,
    per_second_left: 2,
    per_flame_left: 50,
  },
};

// Các hằng số nội bộ (không nằm trong tuning JSON nhưng bắt buộc đúng theo ticket).
export const P = {
  gravity: 20.0, // m/s² (áp dụng −20)
  jump_velocity: 7.0, // m/s
  run_accel: 60.0, // m/s² -> đạt tốc độ tối đa trong 0.1s
  step_height: 0.5, // m — bước lên tối đa (chặn leo vách đứng)
  fall_threshold_y: -10, // rơi khi Y < -10

  // Bóng Mực
  shade_detect_range: 12.0, // m
  shade_lose_range: 18.0, // m
  shade_spawn_state_ticks: 60, // trạng thái "spawning"
  shade_recoil_ticks: 60,
  shade_recoil_m: 2.0,
  shade_stun_ticks: 120,
  shade_push_ticks: 15, // đẩy lùi 4m trong 15 tick đầu
  shade_center_height: 1.0, // tâm Bóng Mực = mặt đất + 1.0

  // Tỏa sáng
  pulse_center_height: 0.8, // tâm pulse = chân Mây + 0.8

  // Đom đóm rơi
  dropped_mote_ttl_ticks: 480,
  dropped_ring_min: 1.5,
  dropped_ring_max: 2.5,
  mote_pickup_height: 1.5, // chênh cao tối đa để nhặt
  mote_initial_count: 20,
  mote_cap: 30,
  mote_respawn_every_ticks: 240,

  // Bóng Mực sinh
  shade_first_spawn_tick: 300,
  shade_first_count: 2,
  shade_min_player_dist: 15,

  // Chạm / bị đánh
  hit_invuln_ticks: 90,

  // Rơi khỏi đảo
  fall_recover_ticks: 60,
  respawn_invuln_ticks: 90,

  // Gió Lạc
  drifter_max: 2,
  drifter_spawn_every_ticks: 1200, // 1200, 2400, ...
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

  // Bùa Gió
  charm_effect_ticks: 600,
  charm_respawn_ticks: 2700,
  charm_run_speed: 7.2,

  // Gió (Đêm 3)
  wind_interval_ticks: 1800, // 30s
  wind_duration_ticks: 300, // 5s
  wind_push_speed: 2.0,

  // Bục nhảy
  bounce_pad_radius: 1.0,
};

const DEG = Math.PI / 180;

// Sinh các điểm trên đường tròn (x, y, z), góc tính từ +X ngược chiều kim đồng hồ.
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
    motePoints: [
      ...ring(0, 0, 12, 0, 45, 8, 0),
      ...ring(0, 0, 33, 0, 22.5, 16, 0),
    ],
    shadePoints: ring(0, 0, 37, 15, 30, 12, 0),
    shadeSpawnInterval: 480, // 8s
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
    shadePoints: [
      ...ring(0, 0, 26, 22.5, 45, 8, 0),
      ...ring(70, 0, 26, 22.5, 45, 8, 0),
    ],
    shadeSpawnInterval: 420, // 7s
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
      ...ring(0, 0, 34, 0, 20, 18, 0), // tầng 0
      ...ring(0, 0, 18, 20, 20, 8, 3), // tầng 1 (z>0)
      ...ring(0, 0, 5, 45, 90, 4, 6), // tầng 2
    ],
    shadePoints: ring(0, 0, 43, 0, 22.5, 16, 0),
    shadeSpawnInterval: 360, // 6s
    shadeMax: 10,
    shadeSpeed: 4.5,
    drifters: true,
    charms: [
      [30, 0, 25],
      [-30, 0, 25],
    ],
    wind: true,
    bouncePads: [{ pos: [0, 3, 13], toward: [0, 0, 4], vy: 12.0, vh: 8.0 }],
  },
};
