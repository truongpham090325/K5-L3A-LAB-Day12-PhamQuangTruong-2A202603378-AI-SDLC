# Retro

## Điều hiệu quả

- **Tách logic/ hiển thị** là quyết định tốt nhất: Phase 2 chỉ cần viết lại `sim.js`, game 3D "chỉ" hiển thị lại, không viết 2 lần.
- **Đọc kỹ ticket trước khi code**: phần "số liệu chuẩn" được gom hết vào `constants.js` + `game.contract.json` (khớp bằng test), tránh sai lệch.
- **Test đơn vị trên engine** cho vòng phản hồi gần như tức thì; hiệu năng Đêm đầy đủ 21600 tick chỉ 173ms.
- **Âm thanh thủ tục** (WebAudio) đáp ứng yêu cầu âm thanh mà không cần asset ngoài.

## Điều chưa tốt

- Chưa đo được FPS thật (≥30 FPS @1280×720) vì môi trường chạy headless không render; cần đo khi quay video ở Phase 4.
- Một số giả định (chiều cao tâm Bóng Mực = mặt đất+1m, `wander` đứng yên) là lựa chọn chủ quan — đã ghi rõ trong `assumptions.md` để người chấm hiểu.

## Số liệu đến hết Phase 2

- 24 test (đơn vị + tích hợp CLI) đạt.
- Đêm đầy đủ 21600 tick: 173ms.
- ~76k token ước tính cho Phase 2.

## Nếu làm lại

- Viết **skill "chạy headless + lưu bằng chứng"** sớm hơn (đang làm tay qua script `make_proof.mjs`).
- Định trước **bảng ánh xạ yêu cầu → scenario** ngay khi đọc ticket để sinh bằng chứng nhanh hơn.
