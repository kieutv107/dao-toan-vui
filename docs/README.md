# Đảo Toán Vui — tài liệu sản phẩm và kỹ thuật

Tài liệu này mô tả trạng thái đang chạy của Đảo Toán Vui. App là một website tĩnh, viết bằng JavaScript ES modules và CSS thuần, dành cho trẻ luyện cộng trừ trong phạm vi 20.

## Bắt đầu từ đâu

- [FEATURES.md](./FEATURES.md): toàn bộ tính năng, luật và flow của từng game.
- [ENGINE.md](./ENGINE.md): kiến trúc, engine, mô hình dữ liệu, học thích ứng, lưu trữ và vòng đời controller.
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md): màu sắc, typography, layout, component, motion, responsive, accessibility và quy tắc viết nội dung.

## Trạng thái sản phẩm

App hiện có 7 game được đăng ký trong menu:

1. Vườn luyện tập
2. Mưa phép tính
3. Bắt bong bóng
4. Lật thẻ thần kỳ
5. Số nào trốn mất?
6. Số nào lớn hơn?
7. Đúng hay sai?

Mã nguồn nằm trực tiếp trong `dist/`; đây đồng thời là source và artifact được deploy. Không có package manager, bundler hay bước build. Chạy toàn bộ test bằng:

```bash
node --test
```

Chạy local bằng một static server trỏ vào `dist/`, ví dụ:

```bash
python3 -m http.server -d dist
```

## Deploy lên Vercel

Cấu hình nằm trong `vercel.json` ở thư mục gốc: không có bước build, Vercel phục vụ trực tiếp thư mục `dist/` (`outputDirectory`). `.vercelignore` loại `tests/`, `docs/` khỏi bản upload.

- Qua dashboard: Import repo → Framework Preset để **Other** → bấm Deploy (không cần chỉnh Build/Output, `vercel.json` đã khai báo).
- Qua CLI: `npx vercel` (preview) hoặc `npx vercel --prod` (production).

Tên file không có hash nên mọi file được gửi với `Cache-Control: max-age=0, must-revalidate` để trình duyệt luôn lấy phiên bản mới sau mỗi lần deploy.

## Nguyên tắc phát triển

- Luật game nằm trong các module `*-engine.mjs` thuần, không truy cập DOM.
- Controller `*.mjs` chịu trách nhiệm render, timer, input, animation, âm thanh và cleanup.
- Mọi game dùng chung `learning-service.mjs` cho lựa chọn phép tính và cập nhật tiến độ.
- Mọi controller phải trả về hàm cleanup để router dừng timer và listener khi rời game.
- UI mới dùng tiếng Việt, giọng thân thiện, ngắn và khuyến khích trẻ thử lại.
- Không thêm dependency hoặc build step nếu chưa có lý do rõ ràng.

## Bản đồ mã nguồn

| Khu vực | File chính |
| --- | --- |
| HTML entrypoint | `dist/index.html` |
| Shell, menu, router, sao và âm thanh | `dist/app.js` |
| Sinh phép tính cơ bản | `dist/math.mjs` |
| Hồ sơ học và mastery | `dist/mastery-engine.mjs` |
| Chọn phép tính thích ứng | `dist/adaptive-selector.mjs` |
| Facade học tập | `dist/learning-service.mjs` |
| Lưu tiến độ | `dist/learning-store.mjs` |
| Lưu bảng điểm | `dist/high-scores.mjs` |
| Mưa phép tính | `dist/rain-engine.mjs`, `dist/rain.mjs`, `dist/rain.css` |
| Vườn luyện tập | `dist/practice-engine.mjs`, `dist/practice.mjs` |
| Bong bóng, số trốn mất, lật thẻ | `dist/challenge-engine.mjs`, `dist/challenge.mjs`, `dist/challenge.css` |
| Số nào lớn hơn | `dist/compare-engine.mjs`, `dist/compare.mjs`, `dist/compare.css` |
| Đúng hay sai | `dist/truefalse-engine.mjs`, `dist/truefalse.mjs`, `dist/truefalse.css` |
| Nền tảng giao diện | `dist/style.css` |
| Kiểm thử | `tests/*.test.mjs` |

