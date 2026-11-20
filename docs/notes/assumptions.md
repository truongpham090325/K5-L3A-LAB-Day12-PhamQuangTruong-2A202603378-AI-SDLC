# Giả định Phase 1 (Đảo Đèn Lồng — PRD-0 + Test Contract v1.0)

PRD-0 cố ý để nhiều chỗ mơ hồ. Dưới đây là các **giả định tôi tự chọn** và đã áp dụng. Mỗi giả định ghi rõ lý do. Khi phase sau làm rõ/chuyển một giả định, cập nhật file này.

## 1. Tài nguyên `flames` (ngọn lửa)

- **Giả định:** `flames` vừa là **máu** vừa là **nguồn sáng** (một tài nguyên chung), bắt đầu bằng `3`.
- **Hành vi:** bị Bóng Mực chạm → `-1`; tỏa sáng (pulse) → `-pulse_cost` (1); bằng `0` → thua `no_flames`.
- **Lý do:** Test Contract chỉ có duy nhất trường `player.flames`; không có trường máu/ánh sáng riêng. PRD nói "chạm thì mất máu" và "tỏa sáng tốn ánh sáng" → gộp làm một.

## 2. Điều kiện thắng / thua

| Kết quả | reason | Khi nào |
|---|---|---|
| `won` | `all_lit` | Thắp đủ cả 5 đèn |
| `lost` | `no_flames` | `flames == 0` (do bị chạm hoặc tỏa sáng đến cạn) |
| `lost` | `dawn` | Hết giờ đêm (`time_left_s <= 0`) mà chưa thắp hết đèn |

- **Giả định:** hết giờ đêm = **thua** (`dawn`), vì mục tiêu PRD là "thắp hết đèn thì thắng"; không thắp kịp trước bình minh là thất bại.
- **Thứ tự ưu tiên khi xung đột:** `all_lit` > `no_flames` > `dawn`.

## 3. Nhặt đom đóm vs nạp đèn

- **Giả định:** đom đóm **tự nhặt khi đi qua** trong `pickup_radius` (1.5m); đèn cần **bấm interact** trong `interact_radius` (2.0m). Hai bán kính riêng trong tuning gợi ý cơ chế này.
- **Giả định khi nạp:** nạp vào đèn chưa thắp gần nhất, số nạp = `min(carried, lantern_cost - deposited)` (không nạp thừa). Đủ `lantern_cost` thì thắp (`lit = true`, phát `lantern_lit`).

## 4. Rơi đom đóm khi bị chạm

- **Giả định:** `hit_drop_ratio` = 0.5, số rơi = `floor(carried * 0.5)` khi bị **Bóng Mực** chạm; khi **rơi khỏi đảo** thì rơi **toàn bộ** (`dropped = carried`).
- Đom đóm rơi **tái xuất hiện** quanh người chơi (bán kính 2m, vị trí tất định theo chỉ số) để nhặt lại được.

## 5. Đảo và rơi khỏi đảo

- **Giả định:** đảo tròn bán kính `ISLAND_RADIUS = 30m` (không nằm trong contract — là hằng số thiết kế riêng).
- **Giả định:** `fall_enabled = true` → đi quá rìa đảo bị phạt (`player_hit by=fall`, `-1` flames, rơi hết đom đóm, hồi sinh giữa đảo `(0,0,0)`).

## 6. Bóng Mực

- **Trạng thái:** tối thiểu `stunned` (theo contract); trạng thái còn lại tôi đặt là `chase`.
- **Giả định:** khi `random_shades = false`, các Bóng Mực liệt kê hoạt động ngay. Khi `true` (mặc định), có 2 con ngay từ đầu + 1 con xuất hiện ở tick 1200 (20s).
- **Vùng an toàn:** Bóng Mực không vào được bán kính `safe_radius` quanh đèn **đã thắp**; khi đèn vừa thắp, Bóng Mực đang ở trong vùng đó bị đẩy ra ngoài biên.
- **Tốc độ:** `shade_speed = 3.5 m/s` (chậm hơn người chơi 5 m/s để né được).

## 7. Tỏa sáng (pulse)

- **Giả định:** pulse choáng tất cả Bóng Mực trong `pulse_radius` (6m), đẩy lùi `pulse_push_m` (4m), choáng `pulse_stun_s` (3s), hồi chiêu `pulse_cooldown_s` (1s).
- **Giả định:** pulse **được phép tiêu đến ngọn lửa cuối** (nếu `flames` về 0 → thua `no_flames`). Sự kiện `pulse` luôn được ghi khi pulse xảy ra (kể cả `stunned_ids` rỗng).

## 8. Nhảy (jump)

- **Giả định:** jump là hành động **chỉ hiển thị** (không ảnh hưởng vị trí XZ, không có event headless). Trong headless nhận input `jump` bình thường nhưng không đổi trạng thái quan sát được.

## 9. Sinh đom đóm / vị trí mặc định

- **Giả định:** khi `random_motes = true` (mặc định), sinh **30 đom đóm** (cần 25 để thắp 5 đèn, dư 5 để có chỗ rơi). Không sinh lại đom đóm trong Đêm 1.
- **Vị trí 5 đèn mặc định** (vòng tròn bán kính 20m): L1 (20,0,0), L2 (6.18,0,19.021), L3 (-16.18,0,11.756), L4 (-16.18,0,-11.756), L5 (6.18,0,-19.021).

## 10. ID tự sinh

- **Giả định:** đom đóm đặt `M1, M2, ...`, Bóng Mực đặt `S1, S2, ...` theo thứ tự xuất hiện (tất định). Scenario có thể ghi đè id Bóng Mực (`shades[].id`).

## 11. Làm tròn số

- **Giả định:** tọa độ làm tròn **3 chữ số thập phân** ở đầu ra; `time_left_s` cũng làm tròn 3 chữ số. Điểm số luôn là số nguyên.
