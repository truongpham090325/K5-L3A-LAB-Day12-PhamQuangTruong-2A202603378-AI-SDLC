# Đảo Đèn Lồng (3 Đêm)

> **Video demo:** [docs/demo/demo.mp4](docs/demo/demo.mp4) — đoạn quay của game Đảo Đèn Lồng (4 Đêm, phát hành v1.0.0), < 5 phút, chơi thử + bằng chứng game chạy đúng.

Game 3D góc nhìn thứ ba. Bạn điều khiển **Mây**, người giữ đèn nhỏ tuổi của hòn đảo giữa biển mây. Sương đen đã nuốt hết ánh sáng — Mây phải chạy khắp ba hòn đảo, thu thập **đom đóm** để nạp vào các **Đèn Lồng Lớn**, giữ đảo **sáng tới bình minh** và né **Bóng Mực** / **Gió Lạc**.

- **Công nghệ:** JavaScript (ES modules) + **Three.js** (3D, chạy trình duyệt) + **Node.js** (headless). Chạy được trên macOS, Linux, Windows.
- **Kiến trúc:** logic game tách riêng trong `src/core/sim.js`, dùng chung cho cả chế độ chơi 3D lẫn chế độ headless.

---

## Cài đặt và chạy (tối đa 3 lệnh)

```bash
npm install     # 1) cài đặt (không có thư viện ngoài)
npm start       # 2) chạy game, mở trình duyệt tại http://localhost:8080
```

Nếu trình duyệt không tự mở, truy cập **http://localhost:8080**.

## Điều khiển

| Phím | Hành động |
|---|---|
| `W A S D` / phím mũi tên | Di chuyển |
| Chuột (click để khóa con trỏ) | Xoay camera |
| `Space` | Nhảy |
| `Shift` | Lướt (dash) |
| `E` | Nạp đom đóm vào đèn / châm dầu đèn đang sáng |
| `Q` | Tỏa sáng (xua Bóng Mực, tốn 3 đom đóm) |
| `Esc` / `P` | Tạm dừng |

## Ba Đêm

| Đêm | Đảo | Thời gian | Đèn | Điểm riêng |
|---|---|---:|---:|---|
| 1 | Đảo Bến (đảo tròn 40m) | 240s | 5 | Bóng Mực |
| 2 | Đảo Cau (hai đảo nối cầu tre, bục nhảy) | 270s | 6 | Bóng Mực, Gió Lạc, Bùa Gió |
| 3 | Đảo Chuông (3 tầng, dốc, tháp chuông, gió mạnh) | 300s | 7 | Bóng Mực, Gió Lạc, Bùa Gió |

## Cách tính điểm (Phase 3)

| Sự kiện | Điểm |
|---|---:|
| Nạp 1 đom đóm vào đèn (thắp mới / thắp lại / châm dầu) | +5 |
| Thắp lần đầu | +100 |
| Thắp lại | +40 |
| 1 Bóng Mực trúng Tỏa Sáng (drain: +15) | +5 / +15 |
| Bình minh (thắng): mỗi đèn đang sáng | +50 + floor(fuel) |
| Bình minh (thắng): mỗi Ngọn Lửa còn lại | +50 |

## Luật chơi Phase 3 (tóm tắt)

- **Nhiên liệu đèn:** đèn có dầu (max 100, hao 1.0/s). Đèn đã thắp vẫn có thể châm dầu nạp thêm (hết giờ 10 đom đóm/lần).
- **Đèn tắt:** dầu chạy về 0 → đèn tắt (nhớ `ever_lit`); môi trường giảm.
- **Thắp lại:** đèn đã từng sáng chỉ cần 5 đom đóm (thay vì 10).
- **Sức chứa:** tăng dần `10 + 2×successful_lights` (max 20).
- **Bóng Mực hút dầu:** chỉ Bóng Mực ở `wander` chọn đèn yếu (fuel < 30); gần ≤ 2m → `drain` (hút 5/giây + Bóng gây sát thương khi Mây vào 6m). Đèn vẫn hao 1/s tự nhiên.
- **Thắng (mới):** Mây còn sống ở bình minh **và** số đèn đang sáng ≥ ceil(0.6 × đèn): Đêm 1 cần 3/5, Đêm 2 4/6, Đêm 3 5/7. (Thắp đủ đèn không thắng sớm.)
- **Thua:** Hết Ngọn Lửa (ngay lập tức, kể cả tick cuối) · hoặc hết giờ mà đèn sáng dưới ngưỡng.

---

## Chế độ mù màu

Cài đặt → "Bảng màu dễ phân biệt" (được lưu):
- Viền/mắt Bóng Mực → cyan (`#00B3FF`).
- Đèn tắt (xẹp 20%, giấy rách); đèn sắp hết dầu nhấp nháy (1Hz); đèn đã thắp/sáng phân biệt theo bằng chứng (nhấp nháy, sáng, dầu).

---

## Chế độ headless (Test Contract v1.3)

Khai báo ở **`game.contract.json`** (v1.3). Hỗ trợ `--night 1|2|3`.

```bash
node src/headless.js --seed <int> --night <1|2|3> [--scenario file.json] [--inputs file.json] \
                     --ticks <int> --out file.jsonl [--snapshot-every <int, mặc định 10>]
```

- Logic chạy **60 tick/giây** cố định, không cần cửa sổ/GPU. Đêm đầy đủ (18000 tick) chạy **< 0.3s**.
- Output **JSONL**: dòng `night_start`, `snapshot`, `event`, `end` (bắt buộc cuối).
- **Tính tất định:** cùng `--seed`, scenario, inputs luôn cho output giống hệt nhau.
- Lỗi định dạng scenario/inputs → mã thoát `2`.

Chi tiết: [`docs/notes/assumptions.md`](docs/notes/assumptions.md), [ADR 3](docs/adr/03-lantern-fuel-dawn-win.md).

---

## Chế độ benchmark (mandatory)

```bash
node src/bench.js --seed 42 --duration 30 --out bench.json
```

- Chạy game ở cảnh cố định: Đêm 1, 1280×720 (không fullscreen), 200 Bóng Mực (wander), 100 đom đóm, 3 đèn L1–L3 sáng fuel 100, camera orbit rồng 2D, 3 s warmup rồi đo `--duration` giây.
- Tắt gameplay: không input Mây, không sát thương/nhặt/estate, dùng timer-only.
- `bench.json` (tự sinh, commit): `avg_fps` ≥ 60, `p1_low_fps` ≥ 30, `load_ms` ≤ 10000.

---

## Soak test (mandatory)

```bash
node src/soak.js --seed 7 --nights 10 --out soak.json
```

- Chạy headless **10 Đêm liên tiếp** trong 1 tiến trình (Đêm 1–3 xoay vòng), input ngẫu nhiên theo seed.
- `soak.json`: `crashes = 0`, bộ nhớ sau ≤ 1.2 × sau đầu (RSS, trên 0.2 MB), `duration_s` thực.

---

## Bảng xếp hạn cục bộ

- Sau màn hình Bình Minh (thắng) hoặc khi bị thua, nhập tên để lưu điểm (tên 3–12 ký tự `[A-Za-z0-9_]`). Mục: tên, tổng điểm các Đêm đã thắng, đêm thắng, thời điểm, seed.
- Giữ top 10 (sorted by điểm ↓, rơi bằng điểm thì người về trước rơi trên).
- Màn hình Bảng xếp hạn từ menu chính.
- Xuất: `npm start -- --export-leaderboard out.json` → `{"entries": [...]}` đúng thứ tự.

---

## Dễ tiếp cận (Accessibility)

Trong **Cài đặt → Trợ nhà**:
- **Đổi phím:** Mọi hành động (di chuyển/Nhảy/Lướt/Tương tác/Tỏa sáng/Tạm dừng); nhấn để trùng phím được báo.
- **Giảm chuyển động:** Tắt rung camera + hiệu ứng chớp.
- **Chữ lớn:** ×1.25 toàn bộ UI.
- **Phụ đề:** Text màu cho cơ chế nguy hiểm (đèn hết dầu, 10 s cuối, Bóng Mực hút dầu...).

---

## Kiểm chứng

- **Chạy test:** `npm test` (24 test).
- **Bằng chứng:** [`docs/proof/phase-3/README.md`](docs/proof/phase-3/README.md).

---

## Sáng tạo của tôi

(Giữ các mục Phase 1–2; mục hiển thị thêm cho Phase 3)
- Bùa Gió (charm) nhấp + ánh sáng đỏ, đất nổi (Ma) trên Đảo Cau/Chuông.
- Thanh dầu đèn (nhảy theo bảng màu chuẩn) và viền tím tắt/cua — hiệu nghệ.
- Ngoài thanh dầu & HUD, Mây có màn hình bình minh (Đêm 1). Âm thanh thủ tục đầy đủ vẫn nguyên; nhạc nền thay đổi theo đêm.

## Giấy phép & nguồn

- Mã nguồn: MIT ([LICENSE](LICENSE)). Toàn bộ hình ảnh/âm thanh tạo thủ tục, không asset ngoài ([CREDITS.md](CREDITS.md)).
