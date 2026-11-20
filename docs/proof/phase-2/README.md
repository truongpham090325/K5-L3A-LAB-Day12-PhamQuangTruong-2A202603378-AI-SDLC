# Bằng chứng kiểm chứng Phase 2 (Ticket-02)

Mỗi file `.jsonl` là output **thật** của `node src/headless.js` (Test Contract v1.1).

| File | Yêu cầu được chứng minh | Kết quả |
|---|---|---|
| [movement.jsonl](movement.jsonl) | Chạy 6 m/s, tăng tốc <=0.1s | mã thoát 0, 5 dòng |
| [jump.jsonl](jump.jsonl) | Nhảy (v=7, g=-20) | mã thoát 0, 8 dòng |
| [dash.jsonl](dash.jsonl) | Lướt 14 m/s trong 0.2s | mã thoát 0, 9 dòng |
| [pickup.jsonl](pickup.jsonl) | Nhặt đom đóm (không cộng điểm) | mã thoát 0, 6 dòng |
| [deposit_light.jsonl](deposit_light.jsonl) | Nạp 10 đom đóm + thắp đèn | mã thoát 0, 8 dòng |
| [pulse.jsonl](pulse.jsonl) | Tỏa sáng tốn 3 đom đóm + choáng Bóng Mực | mã thoát 0, 7 dòng |
| [shade_hit.jsonl](shade_hit.jsonl) | Bóng Mực chạm: mất flames + rơi đom đóm + recoil | mã thoát 0, 7 dòng |
| [shade_spawn.jsonl](shade_spawn.jsonl) | Bóng Mực sinh 2 con tại tick 300 | mã thoát 0, 6 dòng |
| [win.jsonl](win.jsonl) | Thắng khi thắp đủ đèn | mã thoát 0, 6 dòng |
| [lose_no_flames.jsonl](lose_no_flames.jsonl) | Thua khi hết Ngọn Lửa | mã thoát 0, 5 dòng |
| [lose_dawn.jsonl](lose_dawn.jsonl) | Thua khi hết giờ | mã thoát 0, 5 dòng |
| [fall.jsonl](fall.jsonl) | Rơi khỏi đảo (Y<-10) + hồi sinh | mã thoát 0, 6 dòng |
| [drifter.jsonl](drifter.jsonl) | Gió Lạc cướp đom đóm (Đêm 2) | mã thoát 0, 7 dòng |
| [charm.jsonl](charm.jsonl) | Bùa Gió: nhặt + tăng tốc (Đêm 2) | mã thoát 0, 6 dòng |
| [bounce_pad.jsonl](bounce_pad.jsonl) | Bục nhảy Đêm 2 | mã thoát 0, 9 dòng |
| [wind.jsonl](wind.jsonl) | Gió mạnh Đêm 3 (kích hoạt sau 30s) | mã thoát 0, 10 dòng |
| [determinism.jsonl](determinism.jsonl) | Tính tất định (2 lần chạy giống hệt) | mã thoát 0, 45 dòng (2 lần chạy giống hệt ✓) |

## Cách chạy lại

```bash
node src/headless.js --seed 7 --night 1 --ticks 120 --out out.jsonl
```
