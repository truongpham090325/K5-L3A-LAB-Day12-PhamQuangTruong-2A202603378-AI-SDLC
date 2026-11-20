# Giả định & quyết định — Phase 2–3

## (Phase 3 — Ticket-03, Test Contract v1.2) — ghi tiếp nối từ Phase 2

- **Nhiên liệu:** lưu nội bộ **1/60 đơn vị** (tối đa 6000), luôn chính xác 1/60 giây; làm tròn 1 chữ số thập phân khi xuất (fuel/60).
- **Hết dầu:** đèn tắt, `ever_lit` giữ, `fuel: 0` trong snapshot.
- **Bóng Mực hút dầu:** chỉ ở `drain` chọn đèn "yếu" — mất vùng an toàn nghĩa là fuel < 30. Chuỗi: drain → chase (Mây trong 6m) / stunned (trúng Tỏa Sáng) / wander (đèn tắt, châm dầu ≥ 30, cách > 2m).
- **Châm dầu:** `used = min(carried, ceil((100 - fuel_actual)/10))` (per ticket), `fuel_per_mote = 10`, cộng `cap = min(20, 10 + 2·successful_lights)`.
- **Điểm:** per_mote=5 (nạp), +100 (thắp lần đầu), +40 (thắp lại), +5/+15 (Bóng Mực trúng pulse, drain +15); Bình minh (thắng): +50/đèn sáng + 50/Ngọn Lửa; bỏ `per_second_left`.
- **Lớp nhưng phải hiển thị:** đèn tắt (nhấp + đụn 20% + giấy rách ở mù màu), đèn sắp hết dầu (nhấp 1Hz).

## (Phase 2 — Ticket-02, Test Contract v1.1) — giữ các dòng cũ dưới đây

Ticket-02 chuẩn hóa gần hết số liệu (bắt buộc). Dưới đây là những chỗ **vẫn còn mơ hồ** tôi đã tự quyết, và những lưu ý triển khai quan trọng. Các số chuẩn (tốc độ, chi phí, bán kính, thời gian…) nằm trong `src/core/constants.js` và `game.contract.json`, khớp đúng ticket.

## 1. Tọa độ & góc

- Góc đo từ trục **+X**, **ngược chiều kim đồng hồ** khi nhìn từ trên xuống: `pos(θ) = (r·cosθ, 0, r·sinθ)`; θ=0 → +X, θ=90° → +Z. (Xác nhận bằng vị trí L1 (0,0,25) = +Z.)
- Gió `dir_deg` là **hướng gió thổi tới** (cùng quy ước góc trên).

## 2. Chiều cao thực thể (chọn hợp lý, ghi rõ)

- **Bóng Mực:** tâm = `mặt đất + 1.0m` (lơ lửng). Chạm: XZ ≤ 1.0m **và** |tâm bóng − chân Mây| ≤ 1.5m.
- **Gió Lạc:** bay ở `mặt đất + 1.0m`. Chạm: chỉ XZ ≤ 1.2m (không xét độ cao, theo ticket).
- **Đom đóm:** `pos.y` = mặt đất nơi đặt (điểm đặt), nhặt khi XZ ≤ 1.0m **và** |mặt đất đom đóm − chân Mây| ≤ 1.5m.
- Tâm Tỏa Sáng = chân Mây + 0.8m; khoảng cách tới Bóng Mực/Gió Lạc tính **3D**.

## 3. Bóng Mực — trạng thái

- Đúng tên: `spawning` (60 tick = 1s, hóa thân), `wander` (đứng yên chờ phát hiện), `chase`, `recoil` (60 tick, lùi 2m), `stunned` (120 tick, 15 tick đầu bị đẩy lùi 4m).
- Phát hiện/ bỏ đuổi: vào `chase` khi ≤ 12m, về `wander` khi > 18m.
- Sinh: 2 con lúc tick 300, sau đó 1 con mỗi chu kỳ (Đêm 1: 8s, Đêm 2: 7s, Đêm 3: 6s), tối đa 6/8/10. Điểm sinh cách người chơi ≥ 15m (áp dụng mọi Đêm, chọn ngẫu nhiên có seed).
- `wander` được chọn là **đứng yên** (đơn giản, tất định); việc này không ảnh hưởng test (test đặt `state` rõ ràng).

## 4. Gió Lạc (drifters)

- Sinh tại tick 1200, 2400 (mỗi 1200 tick), tối đa 2, id D1, D2. Vị trí sinh: ngẫu nhiên (có seed) trong bán kính 10–20m quanh tâm đảo.
- `idle` lượn 2 m/s theo hướng ngẫu nhiên (seed), quay đầu khi chạm rìa đảo.
- `chase` khi Mây mang ≥ 5 **và** cách ≤ 15m; mất điều kiện → về `idle`.
- Cướp `min(3, đang mang)`; sau khi cướp → `flee` 240 tick rồi biến mất cùng số đã cướp. Mỗi con chỉ cướp 1 lần (state machine tự đảm bảo).
- Tỏa Sáng trúng `chase` → `flee` (không cướp); trúng `flee` có đồ → thả toàn bộ (đom đóm rơi) và biến mất sau 120 tick.
- **Không có sự kiện `drifter_spawned`** (ticket chỉ thêm 7 sự kiện mới; Gió Lạc xuất hiện thể hiện qua mảng `drifters` trong snapshot).

## 5. Bùa Gió (charm) & Gió (Đêm 3)

- Bùa: hiệu lực 600 tick (10s), tái xuất sau 2700 tick (45s). Nhặt lại làm mới về 600. Vị trí: Đêm 2 (35,0,0); Đêm 3 (30,0,25) và (−30,0,25). Id C1, C2 theo thứ tự.
- Gió: cơn gió hoạt động khi `simTick ≥ 1800` và `simTick % 1800 < 300` (tức [30s, 35s), [60s, 65s), …). Hướng mỗi cơn ngẫu nhiên (seed). Đẩy 2 m/s cộng vào vận tốc ngang mục tiêu.

## 6. Rơi khỏi đảo & hồi sinh

- Rơi khi `Y < −10`. Xảy ra đúng 1 lần: −1 Ngọn Lửa, mất **toàn bộ** đom đóm (sự kiện `player_hit` có thêm `lost`, `dropped = 0`).
- Chờ 60 tick (không di chuyển/nhặt/bị đánh), rồi hồi sinh ở (0,0,0), vận tốc 0, bất tử 90 tick. Hết Ngọn Lửa → thua ngay, không hồi sinh.

## 7. Điểm & thứ tự thắng/thua

- +10 mỗi đom đóm **nạp** (không phải nhặt), +100 mỗi đèn, +5 mỗi Bóng Mực trúng Tỏa Sáng (mỗi con mỗi lần, kể cả đang choáng), thắng +2/giây +50/Ngọn Lửa.
- Thứ tự xét sau mỗi tick: `no_flames` → `all_lit` → `dawn` (đổi so với Phase 1: hết Ngọn Lửa luôn thua trước).

## 8. Địa hình

- Đêm 2: cầu tre x∈[26,44], z∈[−2,2]. Bục nhảy phóng về tâm đảo kia.
- Đêm 3: tầng 0 (r≤45, Y=0), tầng 1 (vành 12–24, z>0, Y=3), tầng 2 (r≤8, Y=6). Dốc ở 30°/150° nối Y 0→3 (độ dốc (30−r)/2). Vách đứng chặn bước lên > 0.5m. Tháp chuông (r≤2) chặn di chuyển ngang khi Y < 14.

## 9. Nạp đèn

- Trong bán kính 2.0m, nạp `min(đang mang, còn thiếu)` vào đèn **chưa sáng** gần nhất; bằng khoảng cách thì chọn id nhỏ hơn.

## 10. Hiệu năng & tất định

- Toàn bộ ngẫu nhiên dùng RNG có seed (mulberry32), không dùng `Math.random()`/`Date.now()` trong `src/core/*`. Đêm đầy đủ 21600 tick chạy < 0.2s (đạt yêu cầu ≤ 30s).
