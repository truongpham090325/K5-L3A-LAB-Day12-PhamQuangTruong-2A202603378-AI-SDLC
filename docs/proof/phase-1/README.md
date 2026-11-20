# Bằng chứng kiểm chứng Phase 1 (Đảo Đèn Lồng)

Mỗi file `.jsonl` bên dưới là output **thật** của `node src/headless.js` (Test Contract v1.0), chạy lại được bằng chính các scenario ghi trong file.

| File | Yêu cầu được chứng minh | Kết quả |
|---|---|---|
| [movement.jsonl](movement.jsonl) | Di chuyển theo move + cam_yaw (REQ: nhân vật đi lại) | mã thoát 0, 4 dòng |
| [pickup.jsonl](pickup.jsonl) | Nhặt đom đóm trong pickup_radius (REQ: nhặt đom đóm) | mã thoát 0, 5 dòng |
| [deposit_light.jsonl](deposit_light.jsonl) | Nạp đom đóm + thắp đèn (REQ: nạp ánh sáng để thắp đèn) | mã thoát 0, 7 dòng |
| [pulse_stun.jsonl](pulse_stun.jsonl) | Tỏa sáng xua Bóng Mực (REQ: tỏa sáng để xua Bóng Mực) | mã thoát 0, 6 dòng |
| [hit.jsonl](hit.jsonl) | Bóng Mực đuổi và gây sát thương, rơi đom đóm (REQ: Bóng Mực đuổi, chạm mất máu) | mã thoát 0, 6 dòng |
| [win.jsonl](win.jsonl) | Thắng khi thắp đủ 5 đèn (REQ: thắp hết đèn thì thắng) | mã thoát 0, 5 dòng |
| [lose_no_flames.jsonl](lose_no_flames.jsonl) | Thua khi hết flames (REQ: mất hết máu thì thua) | mã thoát 0, 4 dòng |
| [lose_dawn.jsonl](lose_dawn.jsonl) | Thua khi hết giờ đêm (REQ: giới hạn thời gian Đêm 1) | mã thoát 0, 4 dòng |
| [determinism.jsonl](determinism.jsonl) | Tính tất định: cùng seed/scenario/inputs -> output giống hệt (REQ: tính tất định) | mã thoát 0, 24 dòng (2 lần chạy giống hệt ✓) |

## Cách chạy lại

```bash
# ví dụ chạy lại một kịch bản (xem scenario trong file JSONL)
node src/headless.js --seed 7 --night 1 --ticks 60 --out out.jsonl
```
