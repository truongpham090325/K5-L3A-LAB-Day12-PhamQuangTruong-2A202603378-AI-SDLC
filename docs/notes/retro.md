# Retro — Đảo Đèn Lồng (4 Phase, AI SDLC Day 12)

## Hiệu quả

- **Tách logic/ hiển thị** ở mọi phase: engine `sim.js` chứa toàn bộ luật (từ Phase 1 tới Phase 4). Phase 2–4 thêm tính năng chỉ bằng sửa `sim.js` + renderer/input — không viết logic lặp.
- **Đọc ticket kỹ → ADR + breaking-changes TRƯỚC khi code** (Phase 3): giúp có ý nghĩa thay đổi + truy vết.
- **Test đơn vị trên engine:** vòng phản hồi rất nhanh; engine Phase 1–4 cùng xử lý cả headless và GUI.
- **Soak test thực (crashes=0, bộ nhớ ổn định):** 10 Đêm xoay vòng liên tục, ổn định.

## Điều chưa hiệu quả

- Bench không đo được trong môi trường headless (cần cửa sổ trình duyệt) — cần đo ở Phase 4/5 trên máy có cửa sổ.
- Key rebinding chưa hoàn chỉnh.
- Game 3D không chơi được trong môi trường headless (cần browser/desktop).

## Số liệu & chi phí AI

- 24 test đơn vị + tích hợp: đạt ở mọi phase.
- Soak: crashes=0, mem 32→39MB, 0.3s (headless).
- Ước lượng token: Phase 1 ≈ 40k, Phase 2 ≈ 76k, Phase 3 ≈ 56k, Phase 4 ≈ 45k → ≈ 217k tổng.
- AI sai ít hơn nhờ test đơn vị nhanh + engine tách (viết 1 lần dùng chung).

## Bài học

- Đọc kỹ ticket + ghi ADR/breaking-changes trước khi code: rất hữu ích khi thay đổi luật cốt lõi (Phase 3).
- Sinh bằng chứng bằng script (`make_proof.mjs`), ít vọng/ bàn thờ quá nhiều.
- Nên nhanh hơn giững AI mất thời gian debugging quá mức.

## Nếu làm lại

- Viết ít hơn nhật ký token (thực tế dùng ít hơn nhiều).
- Cân nhắc cách đo FPS nếu benchmark độc lập (headless-measurable FPS) — hiện vẫn cần browser.
