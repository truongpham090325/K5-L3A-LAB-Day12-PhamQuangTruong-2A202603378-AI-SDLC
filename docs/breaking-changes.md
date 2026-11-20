# Changelog — Phase 3 (Ticket-03): Đèn cạn dầu

Các thay đổi giá trị, chân trị phá vỡ so với Phase 1–2 (Áp dụng cho bộ code ở tag `phase-3`; các tag cũ vẫn nguyên văn).

## Phá vỡ (breaking changes)

| Mục | Phase 1–2 (thay đổi) | Phase 3 (hiện tại) |
|---|---|---|
| Cấp kết thúc Đêm 1–3 | 300, 330, 360 s | **240, 270, 300** (ngưỡng thắng: ceil(0.6×đèn)) |
| Nhiên liệu đèn | (Không có) | **fuel 100, hao 1.0/s, châm dầu trừ đom đóm** |
| Tắt đèn khi cạn | (Không có) | **Có** — tự tắt, `lantern_out`, `ever_lit` |
| Thắp lạ | (Không có) | **5 đom đóm** |
| Sức chứa | 10 (tĩnh) | **10–20 (tăng 2×successful_lights)** |
| Điểm | per_mote=10, per_second_left×2 | **per_mote=5, per_lantern=100, per_relight=40, dawn bonus** |
| World win | Thắp đủ đèn → thắng sớm | **Giaỉ hold đến bình minh (dawn_survived)** |
| game_over.reason | all_lit | **dawn_survived, dawn, no_flames** (all_lit loại bỏ) |

## Những gì không đổi

- Phần sáng tạo Phase 1–2 giữ nguyên.
- Thứ tự xử lý tick, `headless_cmd`, formatting JSONL, determinism (seed), exit codes.

## Header files đồng bộ

- `game.contract.json` → v1.2.
- `constants.js` (TUNING + tuning JSON) khớp.
- `src/core/sim.js` — engine cập nhật: `fuel`, `drain`, `relight`, `dawn_survived`, `capacity`.
- `src/render/main.js` — UI: thanh dầu, blink <30, mũi tên châm dầu, mù màu.

## Ghi chép

- ADR: `docs/adr/03-lantern-fuel-dawn-win.md`.
- Giả định chọn: `docs/notes/assumptions.md`.
- Test cập nhật: `tests/run_tests.mjs` (24 test v1.2), bằng chứng vào `docs/proof/phase-3/`.
