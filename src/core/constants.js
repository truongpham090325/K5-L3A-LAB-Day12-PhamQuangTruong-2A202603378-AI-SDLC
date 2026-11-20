// Đảo Đèn Lồng — các hằng số của game (Phase 1 / Night 1).
// Giá trị `tuning` ở đây phải khớp CHÍNH XÁC với `game.contract.json` ở gốc repo.

export const TICKS_PER_SECOND = 60;

export const TUNING = {
  player_speed: 5.0, // m/s
  carry_capacity: 10, // số đom đóm mang tối đa
  lantern_cost: 5, // số đom đóm cần để thắp 1 đèn
  lantern_count_night1: 5,
  pickup_radius: 1.5, // m — bán kính nhặt đom đóm (tự động khi đi qua)
  interact_radius: 2.0, // m — bán kính nạp đom đóm vào đèn (bấm interact)
  pulse_cost: 1, // ngọn lửa tiêu tốn mỗi lần tỏa sáng
  pulse_radius: 6.0, // m — bán kính tỏa sáng làm choáng Bóng Mực
  night1_duration_s: 180, // giây — độ dài Đêm 1
  flames: 3, // ngọn lửa ban đầu (máu + ánh sáng)
  invuln_s: 1.0, // giây bất tử sau khi bị chạm
  hit_drop_ratio: 0.5, // tỉ lệ đom đóm đánh rơi khi bị Bóng Mực chạm
  pulse_stun_s: 3.0, // giây choáng sau khi tỏa sáng
  pulse_push_m: 4.0, // m — đẩy Bóng Mực ra xa khi tỏa sáng
  pulse_cooldown_s: 1.0, // giây hồi chiêu tỏa sáng
  safe_radius: 3.0, // m — bán kính quanh đèn đã thắp mà Bóng Mực không vào được
  shade_speed: 3.5, // m/s — tốc độ Bóng Mực
  shade_hit_radius: 1.0, // m — khoảng cách Bóng Mực chạm gây sát thương
  fall_enabled: true, // rơi khỏi đảo bị phạt
  score: {
    per_mote: 10,
    per_lantern: 100,
    per_stun: 5,
    per_second_left: 1,
    per_flame_left: 50,
  },
};

// Bán kính đảo (không nằm trong contract; là hằng số thiết kế riêng).
export const ISLAND_RADIUS = 30;

// Số đom đóm mặc định khi tự sinh (random_motes = true).
export const DEFAULT_MOTE_COUNT = 30;

// Các tick mà Bóng Mực bổ sung xuất hiện (khi random_shades = true).
// 2 con đầu tiên có mặt ngay từ tick 0; con thứ 3 xuất hiện ở tick 1200 (20 giây).
export const DEFAULT_SHADE_SPAWN_TICKS = [1200];

// Vị trí mặc định của 5 Đèn Lồng Lớn trên Đảo Bến (vòng tròn bán kính 20m).
export const LANTERN_POSITIONS = {
  L1: [20.0, 0, 0.0],
  L2: [6.18, 0, 19.021],
  L3: [-16.18, 0, 11.756],
  L4: [-16.18, 0, -11.756],
  L5: [6.18, 0, -19.021],
};
