# Đảo Đèn Lồng (Đêm 1 — Đảo Bến)

> **Video demo:** *(sẽ thêm ở Phase 4)*

Game 3D góc nhìn thứ ba. Bạn điều khiển **Mây**, người giữ đèn nhỏ tuổi của hòn đảo giữa biển mây. Đêm nay sương đen đã nuốt hết ánh sáng — Mây phải chạy khắp đảo thu thập **đom đóm**, mang về nạp vào các **Đèn Lồng Lớn**, đồng thời né **Bóng Mực** trong bóng tối.

- **Công nghệ:** JavaScript (ES modules) + **Three.js** (đồ họa 3D, chạy trên trình duyệt) + **Node.js** (chế độ headless). Không phụ thuộc engine thương mại; chạy được trên macOS, Linux và Windows.
- **Kiến trúc:** logic game tách riêng trong `src/core/sim.js`, dùng chung cho cả chế độ chơi 3D lẫn chế độ headless — nên đầu ra headless luôn khớp đúng hành vi thật.

---

## Cài đặt và chạy (tối đa 3 lệnh)

```bash
npm install     # 1) cài đặt (repo không có thư viện ngoài; lệnh này chỉ để chuẩn hóa)
npm start       # 2) chạy game, mở trình duyệt tại http://localhost:8080
```

Nếu trình duyệt không tự mở, truy cập **http://localhost:8080**.

## Điều khiển

| Phím | Hành động |
|---|---|
| `W A S D` / phím mũi tên | Di chuyển |
| Chuột (click để khóa con trỏ) | Xoay camera |
| `Space` | Nhảy |
| `E` | Nạp đom đóm vào đèn gần nhất |
| `Q` | Tỏa sáng (xua Bóng Mực, tốn 1 ngọn lửa) |
| `Esc` | Thả con trỏ chuột |

## Cách tính điểm

| Sự kiện | Điểm |
|---|---:|
| Nhặt 1 đom đóm | +10 |
| Thắp 1 Đèn Lồng Lớn | +100 |
| Làm choáng 1 Bóng Mực | +5 |
| Thắng: mỗi giây còn lại | +1 |
| Thắng: mỗi ngọn lửa còn lại | +50 |

## Luật chơi (tóm tắt)

- Đêm 1 có **5 Đèn Lồng Lớn**; mỗi đèn cần **5 đom đóm** để thắp.
- **Đom đóm** rải rác trên đảo, nhặt tự động khi đi qua (bán kính 1.5m), mang tối đa **10** con.
- **Bóng Mực** đuổi theo Mây; chạm vào **mất 1 ngọn lửa** và đánh rơi một nửa số đom đóm đang mang (tạm bất tử 1s).
- **Tỏa sáng** (Q) làm choáng Bóng Mực 3s và đẩy lùi 4m, tốn 1 ngọn lửa.
- Ngọn lửa (`flames`) vừa là máu vừa là nguồn sáng, bắt đầu bằng **3**.
- **Thắng:** thắp đủ 5 đèn. **Thua:** hết ngọn lửa, hoặc hết giờ đêm (180s).
- Đèn đã thắp tạo vùng an toàn (bán kính 3m) mà Bóng Mực không vào được.

---

## Chế độ headless (Test Contract v1.0)

Mọi bài nộp được chấm tự động qua chế độ chạy không giao diện. Khai báo nằm ở **`game.contract.json`**.

```bash
# ví dụ
node src/headless.js --seed 42 --night 1 --ticks 120 --out out.jsonl
# đầy đủ tham số:
node src/headless.js --seed <int> --night 1 [--scenario file.json] [--inputs file.json] \
                     --ticks <int> --out file.jsonl [--snapshot-every <int, mặc định 10>]
```

- Logic chạy **60 tick/giây** cố định, không cần cửa sổ/GPU.
- Output là **JSONL** gồm 3 loại dòng: `snapshot`, `event`, `end` (dòng cuối bắt buộc).
- **Tính tất định:** cùng `--seed`, scenario và inputs luôn cho output giống hệt nhau.
- Lỗi định dạng scenario/inputs → mã thoát `2`; lỗi khác → mã thoát khác `0`.

Chi tiết đầy đủ về Test Contract (cấu trúc `scenario`, `inputs`, `output`) nằm trong PRD-0. Các **giả định** tôi đã chọn ghi ở [`docs/notes/assumptions.md`](docs/notes/assumptions.md).

---

## Kiểm chứng

- **Chạy bộ test:** `npm test` (17 test đơn vị + tích hợp, gồm kiểm tra tính tất định và mã thoát lỗi).
- **Bằng chứng Phase 1:** [`docs/proof/phase-1/README.md`](docs/proof/phase-1/README.md) — bảng truy vết từng yêu cầu đến file `.jsonl` thật.

---

## Sáng tạo của tôi

Ngoài phần lõi bắt buộc, tôi thêm các chi tiết **chỉ ở lớp hiển thị** (không làm đổi đầu ra headless):

1. **Nhân vật Mây** có nón lá và đèn lồng nhỏ phát sáng ấm quanh người (theo đúng mô tả PRD).
2. **Không khí đêm cổ tích:** bầu trời sao, sương mù, đèn vàng cam ấm áp, Bóng Mực tím đen bồng bềnh.
3. **Hiệu ứng:** vòng sóng khi tỏa sáng, chớp đỏ khi bị chạm, đom đóm bồng bềnh có quầng sáng, đảo sáng dần khi thắp đèn, nhảy có chuyển động.
4. **Trang trí đảo:** cây và đá rải rác.

Các phần thêm đều là hình học dựng sẵn (procedural), không dùng asset ngoài (xem [CREDITS.md](CREDITS.md)).

---

## Cấu trúc repo

```text
game.contract.json        Khai báo Test Contract v1.0 + tuning
src/
  core/sim.js             Engine logic (dùng chung headless + 3D)
  core/constants.js       Tuning + hằng số thiết kế
  core/rng.js             RNG tất định (mulberry32)
  headless.js             Chế độ headless (CLI)
  server.js               Máy chủ tĩnh cho game web
  render/main.js          Đồ họa 3D (Three.js)
  vendor/three.module.js  Three.js (vendor, chạy offline)
index.html                Trang game + HUD
tests/run_tests.mjs       Bộ test (npm test)
tests/make_proof.mjs      Sinh bằng chứng JSONL
docs/notes/               Giả định, nhật ký dùng AI, retro
docs/proof/phase-1/       Bằng chứng kiểm chứng
```

## Giấy phép & nguồn

- Mã nguồn: MIT ([LICENSE](LICENSE)).
- Tài sản/âm thanh: toàn bộ tạo thủ tục bằng Three.js primitives, không asset ngoài ([CREDITS.md](CREDITS.md)).
