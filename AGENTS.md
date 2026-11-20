# AGENTS.md — hướng dẫn cho AI làm việc trên repo này

Dự án: **Đảo Đèn Lồng** (game 3D, Day 12 AI SDLC). Logic game tách khỏi hiển thị.

## Lệnh quan trọng

```bash
npm install        # cài (không có thư viện ngoài)
npm start          # chạy game 3D (web, http://localhost:8080)
npm test           # chạy bộ test (24 test)
node tests/make_proof.mjs   # sinh lại bằng chứng JSONL vào docs/proof/phase-2/
node src/headless.js --seed <int> --night <1|2|3> --ticks <int> --out out.jsonl   # headless
```

## Quy ước bắt buộc

- **Tách logic/ hiển thị:** mọi luật game nằm trong `src/core/sim.js`, KHÔNG được viết luật vào `src/render/main.js`. `main.js` chỉ đọc trạng thái `Game` và vẽ.
- **Headless là nguồn sự thật:** mọi hành vi phải chạy được qua `src/headless.js` và khớp Test Contract v1.1 (`game.contract.json`). Không đổi định dạng output JSONL.
- **Tính tất định:** không dùng `Math.random()`/`Date.now()` trong `src/core/*`. Dùng `createRng(seed)` từ `src/core/rng.js`.
- **Tuning phải khớp 2 nơi:** `src/core/constants.js` và `game.contract.json`. Có test kiểm tra việc này.
- **Đơn vị:** mét, Y hướng lên; góc từ +X ngược chiều kim đồng hồ. Địa hình 3 Đêm xem `NIGHTS` trong `constants.js`.
- **Trạng thái Bóng Mực đúng tên:** `spawning`, `wander`, `chase`, `recoil`, `stunned`.
- **Thứ tự xử lý mỗi tick** (bắt buộc, xem `step()`): input/pause → giảm bộ đếm → di chuyển+rơi → nhặt → tương tác đèn → vùng an toàn → tỏa sáng → di chuyển Bóng Mực/Gió Lạc → chạm → sinh lịch → thắng/thua → snapshot.
- **Mỗi lần sửa logic:** chạy `npm test` trước khi báo xong. Test đỏ thì chưa xong.
- **Không commit** `.env`, API key, token.

## Nếu cần thêm thực thể/sáng tạo

- Phần thêm phải **tắt khi chạy headless** (không làm đổi đầu ra JSONL).
- Ghi mục "Sáng tạo của tôi" trong README kèm bằng chứng ngắn.

## Giả định đang dùng

Xem `docs/notes/assumptions.md`. Khi yêu cầu mới (phase sau) làm rõ/chuyển một giả định, cập nhật file đó kèm lý do.
