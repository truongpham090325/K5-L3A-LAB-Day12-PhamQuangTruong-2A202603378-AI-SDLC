# CREDITS — nguồn tài sản & công cụ

## Thư viện / công cụ

| Thành phần | Nguồn | Giấy phép |
|---|---|---|
| Three.js v0.160.0 (đồ họa 3D) | https://threejs.org — vendor tại `src/vendor/three.module.js` | MIT |
| Node.js (runtime headless + server) | https://nodejs.org | MIT |

## Tài sản đồ họa / âm thanh

- **Toàn bộ hình ảnh 3D được tạo thủ tục** bằng Three.js primitives (hình cầu, hình nón, hình trụ, ...) ngay trong `src/render/main.js`; không dùng model, texture hay sprite từ bên ngoài.
- **Không có âm thanh** trong Phase 1.
- Nhân vật "Mây", "Đảo Bến", "Bóng Mực", "Đèn Lồng Lớn", "Đom Đóm" là bản gốc của lab; không dùng nhân vật/thương hiệu game/phim có sẵn.

## Ghi chú bản quyền

- Mã nguồn của repo được phát hành theo [LICENSE](LICENSE) (MIT).
- Ba file mẫu ban đầu (README/GUIDE/RULES/RUBRIC/CHECKPOINTS/SUBMISSION) là tài liệu của lab Day 12, giữ nguyên.
