# Nhật ký dùng AI — Phase 1–3

## (Phase 3 — Ticket-03)

1. Đọc kỹ Ticket-03, tách **số liệu chuẩn (Phase 3)** khỏi phần thay đổi thiết kế → ghi ADR 3 + breaking-changes.
2. Viết lại engine (`sim.js`) v1.2: nhiên liệu đèn (`fuel` nội bộ 1/60), đèn tắt → `lantern_out`, thắp lạp (+40, `relight`), Bóng Mực hút dầu `drain` (+15 Tỏa Sáng), luật thắng `dawn_survived`, sức chứa `10 + 2×successful_lights`, điểm chuẩn Phase 3.
3. Cập nhật `game.contract.json` v1.2 + `constants.js` khớp.
4. Cập nhật bộ test (24 test), đặc biệt: nhiên liệu, hút dầu, thắp lạp, luật thắng/thua mới, hiệu năng.
5. Cập nhật game 3D: thanh dầu đèn + nhấp <30, mũi tên châm dầu, mù màu (cài đặt), trạng thái drain (viền tím), HUD (carried/capacity), tin nhắn Thắng.
6. Lấy ý nhỏ: đổi timeout âm thanh đầu giờ toàn bộ âm thana (đặt vào loop() chứ không phải setTimeout).

---

# Nhật ký dùng AI — Phase 1–2

> Cách tôi dùng AI: AI (Claude Code/agent) đóng vai trò **người viết code theo kế hoạch đã duyệt**, còn tôi **đọc yêu cầu, chọn giả định, định cách kiểm chứng trước, review và chạy test thật**.

## Tóm tắt công việc

1. Đọc toàn bộ hướng dẫn (README/GUIDE/CHECKPOINTS/SUBMISSION/RULES/RUBRIC) và PRD-0 + Test Contract v1.0.
2. Liệt kê chỗ mơ hồ → ghi giả định vào `docs/notes/assumptions.md`.
3. Chọn công nghệ: JS (ESM) + Three.js (web) + Node (headless), tách logic `src/core/sim.js` khỏi hiển thị.
4. Viết engine headless trước, kiểm chứng ngay bằng test đơn vị → phát hiện/sửa lỗi ngay khi test trượt.
5. Viết game 3D (Three.js) dùng chung engine, verify bằng trình duyệt (không lỗi console, HUD đúng).
6. Sinh bằng chứng JSONL từ CLI headless thật.

## Ước tính token / chi phí

| Việc | Ước lượng token (xấp xỉ) |
|---|---:|
| Đọc & phân tích yêu cầu + viết giả định | ~4k |
| Thiết kế engine + viết code lõi (sim/headless) | ~15k |
| Viết test + chạy + sửa lỗi | ~6k |
| Viết render 3D + server + HTML | ~10k |
| Tài liệu (README/AGENTS/CREDITS/ghi chép) | ~5k |
| **Tổng Phase 1** | **~40k token** |

## Cách tôi tiết kiệm token

- **Viết kế hoạch kiểm chứng trước khi code** → agent làm đúng ngay, ít vòng sửa.
- **Test đơn vị ngay trên engine logic** (không cần chạy game/GPU) → vòng phản hồi nhanh, rẻ.
- **Tách logic/ hiển thị** → headless và game 3D dùng chung một engine, không viết 2 lần.
- **Giữ AGENTS.md ngắn**, chỉ ghi lệnh build/test + quy ước cốt lõi.
- **Tự sinh bằng chứng** bằng 1 script thay vì chạy tay từng kịch bản.

## Những lần AI sai và cách xử lý

1. **Test "rơi khỏi đảo" viết sai** (mong đợi nhân vật đứng yên ở giữa đảo sau khi rơi, trong khi nhân vật vẫn giữ phím đi). → Tôi nhận ra assertion sai ngữ nghĩa, sửa test cho đúng hành vi thật (dừng di chuyển sau khi rơi). *Bài học: kiểm chứng phải mô tả đúng hành vi, không phải hành vi mình "muốn".*
2. **Server chạy nền bị chết** khi dùng `Start-Job` (chỉ sống trong session PowerShell). → Chuyển sang chạy background thật của harness. *Bài học: công cụ nền phải chọn đúng loại.*

---

# Nhật ký dùng AI — Phase 2 (Ticket-02)

## Tóm tắt công việc

1. Đọc Ticket-02 kỹ, tách **số liệu chuẩn bắt buộc** (Phần 1) khỏi chỗ mơ hồ → ghi giả định v1.1.
2. Viết lại engine (`sim.js`) theo contract v1.1: vật lý Y (nhảy/trọng lực/rơi), lướt, pause, 3 Đêm với địa hình khác nhau, Bóng Mực 5 trạng thái + lịch sinh, Gió Lạc, Bùa Gió, gió, bục nhảy, tầng/dốc/tháp.
3. Cập nhật `headless.js` (`--night 1|2|3`), `game.contract.json` (v1.1 + tuning chuẩn).
4. Viết lại bộ test (24 test) gồm regression Phase 1 + mỗi tính năng mới + hiệu năng.
5. Viết lại game 3D cho 3 Đêm: menu → giới thiệu Đêm → chơi → kết quả → Đêm kế, HUD đầy đủ, tạm dừng, cài đặt (lưu localStorage), âm thanh thủ tục, bảng màu chuẩn.

## Ước tính token / chi phí

| Việc | Ước lượng token (xấp xỉ) |
|---|---:|
| Đọc & phân tích Ticket-02 + ghi giả định | ~8k |
| Viết lại engine v1.1 (sim/headless/constants) | ~30k |
| Viết lại test + chạy + sửa lỗi | ~10k |
| Viết lại game 3D (3 Đêm, HUD, menu, audio) | ~20k |
| Tài liệu + bằng chứng | ~8k |
| **Tổng Phase 2** | **~76k token** |

## Cách tôi tiết kiệm token

- **Dùng lại kiến trúc Phase 1** (logic/ hiển thị tách rời) — không phải thiết kế lại.
- **Test đơn vị trên engine logic** trước khi đụng vào 3D → vòng phản hồi rẻ.
- **Sinh bằng chứng bằng script**, không chạy tay.
- **Âm thanh thủ tục** (WebAudio) thay vì tìm/ tải asset.

## Những lần AI sai và cách xử lý

1. **Test bùa Gió sai** (mong đợi `charm_ticks == 600` sau khi đã qua thêm 1 tick; thực tế bộ đếm đã trừ 1). → Nhận ra thứ tự xử lý tick (giảm bộ đếm trước khi nhặt), sửa test chạy đúng 1 tick.
2. **`requestPointerLock` ném `WrongDocumentError`** trong trình duyệt tự động (Promise bị từ chối không bắt được bằng try/catch thường). → Bắt thêm `.catch()` trên Promise; game không bị treo.

