# Retro — Phase 1

## Điều hiệu quả

- **Tách logic/ hiển thị ngay từ đầu** là quyết định tốt nhất: headless (chấm tự động) và game 3D dùng chung một `Game`, nên không bao giờ lệch nhau.
- **Kiểm chứng trước khi viết** giúp agent làm đúng ngay, giảm vòng lặp sửa.
- **Test đơn vị trên engine logic** cho vòng phản hồi gần như tức thì, rẻ token.

## Điều chưa tốt

- Mất thời gian debug công cụ (server nền, chụp màn hình headless) không liên quan đến yêu cầu. Cần cô lập sớm.
- Chưa kịp quay video demo (dự kiến Phase 4).

## Số liệu Phase 1

- 17 test (14 đơn vị + 3 tích hợp CLI) đạt.
- 9 file bằng chứng JSONL thật.
- ~40k token ước tính.

## Nếu làm lại

- Viết trước một **skill "chạy headless + lưu bằng chứng"** để không phải lặp lại thao tác tay.
- Định sẵn **danh sách scenario chuẩn** cho từng yêu cầu ngay khi đọc PRD, thay vì vừa làm vừa nghĩ.
