# Retro

## Điều hiệu quả

- **Tách logic/ hiển thị** ở mọi phase: game 3D chỉ hiển thị, logic nằm `sim.js` — Phase 2–3 thêm tính năng chỉ bằng sửa `sim.js` + renderer, không viết 2 lần.
- **Đọc ticket kỹ → ghi ADR + breaking-changes TRƯỚC khi code:** Phase 3 thay đổi luật cốt lõi nên ADR + changelog giúp truy vết và sắp xếp "ưu tiên thay đổi".
- **Test đơn vị trên engine:** vòng phản hồi rất nhanh; hiệu năng Đêm đầy đủ < 0.3s.
- **Âm thana thủ tục (WebAudio)** thay vì tìm/tải asset.

## Điều chưa tốt

- Chưa đo FPS thật (≥30 @1280×720) — cần đo ở Phase 4 khi quay video.
- Giả định "đèn tắt bị xẹp 20% + giấy rách" (mù màu) là lựa chọn đơn giản — đã ghi `assumptions.md`.

## Số liệu đến hết Phase 3

- 24 test (đơn vị + CLI) đạt.
- Đêm đầy đủ 18000 tick: ~180ms.
- ~56k token Phase 3, ~76k Phase 2, ~40k Phase 1 → ~170k tổng.

## Nếu làm lại

- Viết ADR sớm hơn (trước code), dùng skill "viết ADR cho breaking change".
- Tận dụng `npm test` liên tục (có thể dùng --watch).
