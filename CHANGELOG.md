# Changelog — Đảo Đèn Lồng (Day 12)

## Phase 1 (Contract v1.0)
- Game 3D: 3 Đêm, engine logic tách riêng (`src/core/sim.js`), headless CLI (`src/headless.js`), Bóng Mực, Mây, Gió Lạc (Phase 2).
- Bằng chứng: `docs/proof/phase-1/`, test 17, README, harness (AGENTS.md).

## Phase 2 (Ticket-02 — 3 Đêm: Bến, Cau, Chuông) (Contract v1.1)
- Bản đồ 3 Đêm với địa hình riêng (đảo tròn / đảo hai + cầu tre + bục nhảy / 3 tầng + dốc + tháp chuông + gió).
- Cơ chế mới: vật lý Y (nhảy, trọng lực, rơi Y<−10 + hồi sinh), lướt (dash), pause, Bóng Mực (spawning/wander/chase/recoil/stunned), Gió Lạc (cướp đom đóm), Bùa Gió, gió Đêm 3, Gió cơn mạnh.
- Số liệu chuẩn (chạy 6 m/s, gây sát mất fuels, Bóng Mực xuất phát tick 300...).
- Giả định + ADR: `docs/notes/assumptions.md`.

## Phase 3 (Ticket-03 — "Đèn cạn dầu") (Contract v1.2)
- Nhiên liệu đèn (fuel, hao 1.0/s, châm dầu), đèn tắt (lantern_out), thắp lạp (+40).
- Bóng Mực hút dầu (trạng thái drain mới; fears fuel < 30).
- Thắng: giữ đảo sáng đến bình minh (dawn_survived), tỷ lệ 0.6; không thắng sớm.
- Sức chứa tăng dần 10 + 2×successful_lights (max 20).
- Chế độ mù màu (cài đặt Bảng màu dễ phân biệt).
- ADR: `docs/adr/03-lantern-fuel-dawn-win.md`.
- Test Phase 1–2: xâu tự động (24 test đơn vị + tích hợp).

## Phase 4 (Ticket-04 — "Bình minh: phát hành v1.0.0") (Contract v1.3)
- Chế độ benchmark (`bench_cmd`, cảnh 1270×720, 200 Bóng Mực, 100 đom đóm, 3 đèn L1–L3, camera vòng tròn; XORT of FPS).
- Soak test (`soak_cmd`, 10 Đêm liên tiếp, no crashes, bộ nhớ ổn định).
- Bảng xếp hạn cục bộ (nhập tên sau bình minh/thua; xuất `<run_cmd> --export-leaderboard out.json`).
- Dễ tiếp cận (Accessibility: Đổi phím/Giảm chuyển động/Chữ lớn/Phụ đề/Mù màu).
- Thay đổi phá vỡ: `docs/breaking-changes.md`.
- Bench metrics: `bench.json` (do benchmark tự chạy, committed).
- Retro: `docs/notes/retro.md`.

## Changelog
- `docs/breaking-changes.md` — thay đổi phá vỡ Phase 3 (dùng kèm contract 1.2).
