# Bằng chứng kiểm chứng Phase 3 (Ticket-03, Contract v1.2)

Mỗi file `.jsonl` là output **thật** của `node src/headless.js`.

| File | Yêu cầu được chứng minh | Kết quả |
|---|---|---|
| [movement.jsonl](movement.jsonl) | Chạy 6 m/s | mã thoát 0, 5 dòng |
| [deposit_light.jsonl](deposit_light.jsonl) | Thắp đèn lần đầu: +5/đom đóm +100 | mã thoát 0, 8 dòng |
| [pulse.jsonl](pulse.jsonl) | Tỏa sáng: tốn 3 đom đóm + choáng Bóng Mực | mã thoát 0, 7 dòng |
| [shade_hit.jsonl](shade_hit.jsonl) | Bóng Mực đuổi chạm: mất flames + rơi đom đóm | mã thoát 0, 7 dòng |
| [fuel_decay.jsonl](fuel_decay.jsonl) | Hao dầu 1/giây khi sáng | mã thoát 0, 4 dòng |
| [refuel.jsonl](refuel.jsonl) | Châm dầu: refuel + fuel tăng (E nạp đèn) | mã thoát 0, 6 dòng |
| [lantern_out.jsonl](lantern_out.jsonl) | Cạn dầu → lantern_out | mã thoát 0, 5 dòng |
| [relight.jsonl](relight.jsonl) | Thắp lạp: 5 đom đóm + relight:true + relit_count | mã thoát 0, 8 dòng |
| [drain.jsonl](drain.jsonl) | Bóng Mực wander → drain gần đèn yếu | mã thoát 0, 4 dòng |
| [pulse_drain.jsonl](pulse_drain.jsonl) | Tỏa Sáng trúng Bóng Mực đang drain: +15 | mã thoát 0, 5 dòng |
| [win_dawn_survived.jsonl](win_dawn_survived.jsonl) | Thắng: giữ đảo sáng đến bình minh (dawn_survived) | mã thoát 0, 5 dòng |
| [lose_dawn.jsonl](lose_dawn.jsonl) | Thua: đèn sáng dưới ngưỡng → dawn | mã thoát 0, 5 dòng |
| [capacity.jsonl](capacity.jsonl) | Sức chứa tăng dần (carried/capacity) | mã thoát 0, 4 dòng |
| [determinism.jsonl](determinism.jsonl) | Tính tất định (2 lần giống hệt) | mã thoát 0, 45 dòng (2 lần giống hệt ✓) |

## Cách chạy lại

```bash
node src/headless.js --seed 7 --night 1 --ticks 60 --out out.jsonl
```
