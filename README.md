# Đảo Đèn Lồng (3 Đêm)

> **Video demo:** *(sẽ thêm ở Phase 4)*

Game 3D góc nhìn thứ ba. Bạn điều khiển **Mây**, người giữ đèn nhỏ tuổi của hòn đảo giữa biển mây. Sương đen đã nuốt hết ánh sáng — Mây phải chạy khắp ba hòn đảo thu thập **đom đóm**, mang về nạp vào các **Đèn Lồng Lớn**, né **Bóng Mực** và **Gió Lạc**, cho tới khi bình minh.

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
| `E` | Nạp đom đóm vào đèn gần nhất |
| `Q` | Tỏa sáng (xua Bóng Mực, tốn 3 đom đóm) |
| `Esc` / `P` | Tạm dừng (Tiếp tục / Chơi lại / Cài đặt / Về menu) |

## Ba Đêm

| Đêm | Đảo | Thời gian | Đèn | Điểm riêng |
|---|---|---:|---:|---|
| 1 | Đảo Bến (đảo tròn 40m) | 300s | 5 | Bóng Mực |
| 2 | Đảo Cau (hai đảo nối cầu tre, bục nhảy) | 330s | 6 | Bóng Mực, Gió Lạc, Bùa Gió |
| 3 | Đảo Chuông (3 tầng, dốc, tháp chuông, gió mạnh) | 360s | 7 | Bóng Mực, Gió Lạc, Bùa Gió |

## Cách tính điểm (chuẩn hóa)

| Sự kiện | Điểm |
|---|---:|
| Nạp 1 đom đóm vào đèn | +10 |
| Thắp 1 Đèn Lồng Lớn | +100 |
| 1 Bóng Mực trúng Tỏa Sáng | +5 |
| Thắng: mỗi giây còn lại | +2 |
| Thắng: mỗi ngọn lửa còn lại | +50 |

Tổng điểm = tổng điểm các Đêm **đã thắng**.

## Luật chơi (tóm tắt)

- Mỗi đèn cần **10 đom đóm** để thắp; nạp nhiều lần được, đèn nhớ tiến độ. Mang tối đa **10**.
- **Đom đóm** rải rác, nhặt tự động khi đi qua (bán kính 1m); sinh thêm theo thời gian.
- **Bóng Mực** đuổi theo khi lại gần (12m); chạm mất 1 Ngọn Lửa và rơi nửa số đom đóm đang mang.
- **Gió Lạc** (Đêm 2–3) cướp đom đóm khi Mây mang ≥ 5; Tỏa Sáng đuổi chúng đi.
- **Tỏa Sáng** tốn 3 đom đóm, làm choáng Bóng Mực 2s.
- **Lướt** (dash) phóng nhanh 14 m/s trong 0.2s, hồi chiêu 1.5s.
- **Bùa Gió** tăng tốc chạy (7.2 m/s) và Lướt không hồi chiêu trong 10s.
- Ngọn Lửa = máu, bắt đầu 3, hồi đầy mỗi Đêm.
- **Thắng** khi thắp đủ đèn; **thua** khi hết Ngọn Lửa hoặc hết giờ.
- Đèn đã sáng tạo vùng an toàn (6m) mà Bóng Mực không vào được.

---

## Chế độ headless (Test Contract v1.1)

Khai báo ở **`game.contract.json`** (v1.1). Hỗ trợ `--night 1|2|3`.

```bash
node src/headless.js --seed <int> --night <1|2|3> [--scenario file.json] [--inputs file.json] \
                     --ticks <int> --out file.jsonl [--snapshot-every <int, mặc định 10>]
```

- Logic chạy **60 tick/giây** cố định, không cần cửa sổ/GPU. Đêm đầy đủ (21600 tick) chạy **< 0.2s**.
- Output **JSONL**: dòng `night_start`, `snapshot`, `event`, `end` (bắt buộc cuối).
- **Tính tất định:** cùng `--seed`, scenario, inputs luôn cho output giống hệt nhau.
- Lỗi định dạng scenario/inputs → mã thoát `2`.

Chi tiết giả định: [`docs/notes/assumptions.md`](docs/notes/assumptions.md).

---

## Kiểm chứng

- **Chạy test:** `npm test` (24 test đơn vị + tích hợp: di chuyển, nhảy, lướt, nhặt, nạp, tỏa sáng, Bóng Mực, Gió Lạc, Bùa Gió, gió, bục nhảy, rơi, thắng/thua, pause, tính tất định, hiệu năng).
- **Bằng chứng:** [`docs/proof/phase-2/README.md`](docs/proof/phase-2/README.md).

---

## Sáng tạo của tôi

Ngoài phần lõi bắt buộc, tôi thêm các chi tiết **chỉ ở lớp hiển thị** (không đổi đầu ra headless):

1. Nhân vật Mây với nón lá, khăn đỏ và đèn lồng nhỏ phát sáng ấm.
2. Không khí đêm cổ tích: sao trời, sương mù, biển mây, đảo sáng dần khi thắp đèn.
3. Hiệu ứng: vòng sóng khi Tỏa Sáng, chớp đỏ khi bị đánh, đom đóm bồng bềnh, Bóng Mực phát viền tím.
4. Trang trí đảo: cây, đá, cầu tre, tháp chuông.
5. Âm thanh **thủ tục** (WebAudio, không asset ngoài): nhạc nền + hiệu ứng nhặt/thắp/tỏa sáng/bị đánh/nhảy/lướt/thắng/thua/đếm ngược.

## Giấy phép & nguồn

- Mã nguồn: MIT ([LICENSE](LICENSE)). Toàn bộ hình ảnh/âm thanh tạo thủ tục, không asset ngoài ([CREDITS.md](CREDITS.md)).
