# ADR 3 — Nhiên liệu đèn và luật thắng "giữ đảo sáng đến bình minh"

## Bối cảnh (playtest)

Nhà thiết kế: "Playtest cho thấy người chơi giỏi thắp hết đèn trong 2 phút rồi game kết thúc, thiếu căng thẳng ở cuối Đêm. Quyết định: đèn thắp rồi vẫn có thể tắt, mục tiêu chuyển từ 'thắp hết' sang 'giữ đảo sáng tới bình minh'."

## Quyết định

1. **Đèn có nhiên liệu (fuel) với trạng thái `ever_lit`/`relit_count`.**
   - Nên liệu trong đối tượng lantern (`fuel`), đơn vị nội bộ **1/60** (tối đa 6000) để tính chính xác 1/60 giây; chỉ làm tròn (1 chữ số thập phân) khi xuất JSON.
   - Hao hụt 1.0 đơn vị/giây khi đèn sáng; châm dầu tối đa 10 đom đóm/đầu (đổi 10×).
   - Nhiên liệu dùng cho vùng an toàn: đèn sáng & fuel ≥ 30 → có vùng an toàn 6m; < 30 → mất vùng an toàn.
   - Đèn tắt → `fuel = 0`, `lit = false`, `deposited = 0`, `lantern_out`; `ever_lit = true`.
   - Thắp lạp (`lantern_lit.relight`) dễ hơn: 5 đom đóm thay vì 10 (`relight_cost`), dùng `ever_lit` để nhận.

2. **Bóng Mực hút dầu trạng thái mới `drain` (thay thế luật "Bóng Mực không bao giờ vào vùng an toàn").**
   - Vì vùng an toàn nhậy cảm với fuel: shades chỉ chọn đèn **yếu** (wander + fuel < 30); tìm đèn yếu rồi di tới (cách ≤ 2m) → `drain` (đứng yên hút 5/giây).
   - Từ drain: → `chase` nếu Mây trong 6m; → `stunned` nếu trúng Tỏa Sáng; → `wander` nếu đèn tắt/châm dầu lên ≥ 30/cách > 2m.
   - Mục tiêu game: làm **dầu đèn cạn** để tạo căng thẳng — dầu đèn là cơ chế mới làm Mây quản lý số giờ còn lại.

3. **Luật thắng mới: "giữ đảo sáng đến bình minh".**
   - Thời gian lên 100 sáng bởi các cấp (240/270/300) và thắng khi còn sống: số đèn đang sáng tại tick cuối ≥ `ceil(0.6 × tổng)` (3/5, 4/6, 5/7).
   - Hết Ngọn Lửa → thua `no_flames` luôn (kể cả ở tick cuối).
   - Hết giờ → `won` (thắng, `dawn_survived`) nếu đủ đèn, ngược lại `lost`/`dawn`.
   - Thay đổi: Thắp đủ đèn không còn thắng sớm.

4. **Sức chứa đom đóm tăng dần.**
   - `capacity = min(20, 10 + 2 × successful_lights)` (successful_lights đếm lần thắp thành công: tính thắp lại, không tính đèn đặt sẵn).

5. **Điểm mới (thay đổi hoàn toàn):**
   - Nạp vào đèn (thắp/châm dầu) +5; thắp lần đầu +100; thắp lạp +40; Bóng Mực trúng Tỏa Sáng +5 (+15 nếu drain); bình minh (thắng) +50 + floor(fuel) mỗi đèn + 50/Ngọn Lửa còn.
   - Bỏ thưởng thời gian (`per_second_left`).

6. **Cạn dầu/tắt:** đèn tắt (nhớ `ever_lit`), `deposited=0`, `lantern_out`; môi trường giảm nếu tất cả đèn tắt.

## Tại sao không phát luật cũ trên

Thắp đủ đèn = thắng là **quá mỏng**: player xếp chuột kịp 2 phút. Giữ đảo sáng đến bình minh tạo áp lực trường dài hạn + dầu hỏa/tắt đèn là cơ chế nhất quyết nghiêm — cả Mây lẫn Bóng Mực phải xử lý số giờ còn lại, thêm hồi chiêu lướt/châm dầu.

## Giả định được vẽ ra (đã ghi `assumptions.md`)

- `fuel` nội bộ 1/60 (tất định); `range fuel` snapshot 1 chữ số thập phân.
- `drain → chase` trong 6m (Mây), `drain → stun` khi trúng Tỏa Sáng.
- Lần trùng tên shade `drain`: Mây vào 6m mới chase (đã trúng Tỏa Sáng thì đã stun trước).
- Chạm dầu chọn đèn "receiving" (chưa sáng, hoặc sáng không đầy).
- Công thức `used = min(carried, ceil((100 - fuel_actual)/10))` (per ticket).
- Đèn sắp hết dầu nhấp nháy chậm 1Hz (3D); đổi emissive/opacity theo `fuel < low_fuel_threshold` (P).
