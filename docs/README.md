# Đảo Toán Vui — tài liệu sản phẩm và kỹ thuật

Tài liệu này mô tả trạng thái đang chạy của Đảo Toán Vui. App là một website tĩnh, viết bằng JavaScript ES modules và CSS thuần, dành cho trẻ luyện cộng trừ trong phạm vi 20.

## Bắt đầu từ đâu

- [FEATURES.md](./FEATURES.md): toàn bộ tính năng, luật và flow của từng game.
- [ENGINE.md](./ENGINE.md): kiến trúc, engine, mô hình dữ liệu, học thích ứng, lưu trữ và vòng đời controller.
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md): màu sắc, typography, layout, component, motion, responsive, accessibility và quy tắc viết nội dung.

## Trạng thái sản phẩm

App hiện có 8 game được đăng ký trong menu:

1. Vườn luyện tập
2. Phiếu 20 phép
3. Mưa phép tính
4. Bắt bong bóng
5. Lật thẻ thần kỳ
6. Số nào trốn mất?
7. Số nào lớn hơn?
8. Đúng hay sai?

Mã nguồn nằm trực tiếp trong `src/`; đây đồng thời là source và artifact được deploy. Không có package manager, bundler hay bước build. Chạy toàn bộ test bằng:

```bash
node --test
```

Chạy local bằng một static server trỏ vào `src/`, ví dụ:

```bash
python3 -m http.server -d src
```

## Deploy lên Vercel

Cấu hình nằm trong `vercel.json` ở thư mục gốc: không có bước build, Vercel phục vụ trực tiếp thư mục `src/` (`outputDirectory`). `.vercelignore` loại `tests/`, `docs/` khỏi bản upload.

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
| HTML entrypoint | `src/index.html` |
| Shell, menu, router, sao và âm thanh | `src/app.js` |
| Sinh phép tính cơ bản | `src/math.mjs` |
| Hồ sơ học và mastery | `src/mastery-engine.mjs` |
| Chọn phép tính thích ứng | `src/adaptive-selector.mjs` |
| Facade học tập | `src/learning-service.mjs` |
| Lưu tiến độ | `src/learning-store.mjs` |
| Lưu bảng điểm | `src/high-scores.mjs` |
| Mưa phép tính | `src/rain-engine.mjs`, `src/rain.mjs`, `src/rain.css` |
| Vườn luyện tập | `src/practice-engine.mjs`, `src/practice.mjs` |
| Bong bóng, số trốn mất, lật thẻ | `src/challenge-engine.mjs`, `src/challenge.mjs`, `src/challenge.css` |
| Số nào lớn hơn | `src/compare-engine.mjs`, `src/compare.mjs`, `src/compare.css` |
| Đúng hay sai | `src/truefalse-engine.mjs`, `src/truefalse.mjs`, `src/truefalse.css` |
| Nền tảng giao diện | `src/style.css` |
| Kiểm thử | `tests/*.test.mjs` |

