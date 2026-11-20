# Nhật ký dùng AI — Phase 1

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
