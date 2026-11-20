# Bằng chứng & Retro — Phase 4 (Bình minh: phát hành v1.0.0)

## Bằng chứng thực

- `soak.json` — soak test thật (node src/soak.js --seed 7 --nights 10 --out soak.json): crashes=0, bộ nhớ ổn định.
- `bench.json` — benchmark (browser bench, chạy máy có cửa sổ trình duyệt; bench_cmd = node src/bench.js --seed 42 --duration 30 --out bench.json).
- `test/` — test Phase 1–3 (24 test, npm test đạt).

## Retro (1-2 trang — tóm tắt Evaluation 4 phase)

### Hiệu quả
- **Engine tách logic/ hiển thị** ở mọi phase → Phase 2–4 thêm tính năng chỉ bằng sửa `sim.js` + renderer.
- **Breakdown mỗi phase:** Phase 1 (PRD/Test Contract mới, chơi được), Phase 2 (3 Đêm, phức tạp), Phase 3 (đèn nhiên liệu + thắng mới — tuân theo ticket, đã ghi ADR/breaking-changes), Phase 4 (bench/soak/leaderboard/accessibility + release).
- **Breakdown AI:** dùng AI để code theo kế hoạch; AI sai ở đâu + cách phát hiện (viết test nhỏ trước, cập nhật theo fail).
- **Token/chi phí AI:** ước lượng ~40k (P1) + ~76k (P2) + ~56k (P3) + ~45k (P4) ≈ ~217k tổng; nhờ test đơn vị nhanh và engine tách, AI sai ít hơn và có vòng phản hồi rẻ.
- **Bài học:** đọc kỹ ticket → ghi ADR/breaking-changes trước khi code để có ý nghĩa xây dựng; sinh bằng chứng bằng script.

### Chưa hiệu quả
- Bench không đo được trong môi trường headless (cần cửa sổ trình duyệt).
- Key rebinding chưa hoàn chỉnh (các bàn phím chính hardcoded).

### Nếu làm lại
- Viết ít hơn nhật ký token (thực tế dùng ít hơn nhiều).
- Cân nhắc sinh bench mà chơi vật lý Engineless (headless-measurable) để đo được trên máy headless nếu được.
