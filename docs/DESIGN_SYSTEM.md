# Design system

## 1. Tinh thần thiết kế

Đảo Toán Vui dùng phong cách vui, mềm, sáng và thân thiện với trẻ. Giao diện ưu tiên một hành động rõ ở mỗi thời điểm, số lớn dễ đọc, feedback tức thì và thông điệp khuyến khích thử lại.

Nguyên tắc:

- Mỗi game có một accent riêng nhưng dùng chung cấu trúc card, play surface, HUD, button và feedback.
- Không dùng ngôn ngữ phán xét. Sai là một lượt thử, không phải thất bại.
- Nội dung chính luôn là phép tính và thao tác chơi; mô tả chỉ hỗ trợ.
- Mọi target tương tác chính đủ lớn cho trẻ dùng chuột hoặc cảm ứng.

## 2. Typography

Font stack:

```css
'Nunito', ui-rounded, system-ui, sans-serif
```

Nunito được tải từ Google Fonts với weight 400, 600, 700, 800, 900 và 1000.

| Vai trò | Kích thước desktop | Đặc điểm |
| --- | ---: | --- |
| Hero `h1` | 52 px | weight 1000, line-height 1.12 |
| Tiêu đề play | 28 px | weight 1000 |
| Tiêu đề card | 23 px | weight 1000 |
| Phép tính chính | 54–64 px | weight 1000, tabular khi cần |
| Đáp án | 36 px | weight 1000 |
| HUD value | 23–25 px | accent, tabular nums |
| Body | 14–17 px | line-height khoảng 1.5–1.65 |
| Label/tag | 8–12 px | uppercase, letter-spacing 1.3–2 px, weight 900–1000 |

Trên mobile, hero giảm còn 37 px, phép tính khoảng 38–44 px và tiêu đề play còn 23 px.

## 3. Màu nền tảng

| Token ý nghĩa | Giá trị hiện tại | Dùng cho |
| --- | --- | --- |
| Page background | `#f7f8fd` | nền toàn trang |
| Primary text | `#292944` | chữ chính |
| Muted text | `#77758d` | mô tả |
| Primary purple | `#7253e9`, `#7453dd` | brand và CTA |
| Focus | `#6550de` | outline bàn phím |
| Success dark | `#237249` | feedback đúng |
| Success fill | `#51a978` | đáp án đúng |
| Error dark | `#a14660` | feedback sai |
| Star fill | `#fff0c5` | bộ đếm sao |

Không chỉ dùng màu để báo trạng thái: nút còn đổi disabled state, animation và nội dung feedback.

## 4. Palette theo mode

Mỗi class màu khai báo bốn CSS custom properties: `--bg`, `--border`, `--accent`, `--icon`.

| Mode/class | Background | Border | Accent | Icon background |
| --- | --- | --- | --- | --- |
| Green / Practice | `#eaf8ec` | `#cce8d0` | `#2e8056` | `#d1edce` |
| Blue / Bubble | `#eaf4ff` | `#cedeef` | `#337cc0` | `#d4e9fc` |
| Purple / Compare | `#f0ebff` | `#ddd2f4` | `#7755c3` | `#e1d6fb` |
| Orange / Memory | `#fff2e6` | `#f1dec9` | `#ad6b24` | `#ffe5c4` |
| Pink / Mystery | `#fff0f4` | `#f1d6e1` | `#b7557e` | `#ffdae9` |
| Teal / Rain | `#e1f7f5` | `#b5e2dd` | `#126e71` | `#bde9e4` |
| Yellow / Sheet, Đúng hay sai | `#fff9e3` | `#efe1ae` | `#8a6512` | `#ffeeb5` |

Khi thêm mode, tạo palette đủ bốn biến và kiểm tra contrast cho chữ accent trên `--bg` và nền trắng.

## 5. Layout

### Khung trang

- Header: cao 98 px, rộng tối đa 1.200 px.
- Main: rộng tối đa 1.136 px.
- Play surface chung: rộng tối đa 900 px, min-height 550 px.
- Rain surface: rộng tối đa 980 px vì có field và keypad song song.
- Card grid desktop: 3 cột, gap 20 px. Khu luyện tập dùng 2 cột; Khu trò chơi 3 cột với 5 game và thẻ lời khuyên lấp ô cuối.
- Mỗi khu có nhãn nhỏ viết hoa (`zone-label`, 11 px, letter-spacing 1,6 px) trên tiêu đề `h2`, không có dòng chú thích bên cạnh. Khu trò chơi cách khu luyện tập 44 px và một đường nét đứt `#e5dfef` 2 px.

### Breakpoints

| Breakpoint | Thay đổi chính |
| --- | --- |
| `min-width: 1500px` | tăng top padding của main |
| `max-width: 1200px` | main có margin ngang 32 px |
| `max-width: 800px` | card còn 2 cột, hero nhỏ hơn, ẩn rocket track |
| `max-width: 650px` | Rain chuyển sang một cột; HUD của Compare và Đúng hay sai còn 2 cột |
| `max-width: 520px` | card trang chủ còn 1 cột (cả hai khu); header, card, play, equation, answers và kết quả thu gọn |

Từ 520 px trở xuống, card trang chủ xếp 1 cột, mỗi card một dòng, và bỏ `min-height` của tiêu đề/mô tả (chỉ cần khi 2 card đứng cạnh nhau). Từ 521 đến 800 px vẫn 2 cột.

## 6. Components

### Brand header

- Brand icon vuông bo 15 px, nền tím, xoay `-8deg`.
- Bộ đếm sao là pill vàng.
- Nút âm thanh hình tròn 44 px, giảm còn 37 px trên mobile.
### Game card

- Nền mode, border 1 px, radius 23 px.
- Shadow đáy 4 px; hover nâng card 4 px và shadow thành 8 px.
- Icon tile 63×63 px, radius 20 px, xoay `-5deg`.
- Số thứ tự lớn, dùng accent với opacity 0.15.
- CTA ngăn bằng border-top và mũi tên hướng lên phải.

### Play header

`.play-top` chứa nút về đảo, tên game và action phụ như pause. Trên mobile cho phép wrap.

### Play surface

`.play` dùng palette mode, radius 28 px, overflow hidden và căn giữa. Nội dung đi theo thứ tự:

1. HUD/rules.
2. Label cấp/lượt.
3. Câu hỏi hoặc phép tính.
4. Interaction chính.
5. Feedback.
6. Action tiếp theo nếu cần.

### Phản hồi đúng/sai (`feedback.css`)

- ✓ trắng trên nền xanh `#51a978`, ✗ trắng trên nền đỏ `#e0526c`. Luôn kèm ký hiệu, không chỉ đổi màu.
- Đúng ở game có ô `?`: ô `?` giữ nguyên, không hiện đáp án. Một ✓ trắng trong vòng tròn xanh 120 px (92 px dưới 520 px, viền trắng 4 px) hiện giữa play surface (`fb-check-center`), bật lên rồi mờ dần trong 600 ms (`fb-center`), `pointer-events:none` nên không chặn thao tác. Chỉ một tín hiệu để bé kịp nhìn.
- Huy hiệu ✗ góc 26 px (`fb-miss`), viền trắng 2 px. Không còn huy hiệu ✓ ở góc: mọi game (kể cả Số nào lớn hơn?) dùng chung ✓ giữa màn hình.
- Pill “⬆ Lên cấp N!” vàng `#ffe58a` (`fb-levelup`, chữ 16 px) chỉ hiện khi cấp độ tăng, không hiện theo chuỗi đúng. Pill hiện ngay trên ô “Cấp độ” của HUD (tâm pill trùng tâm ô) rồi bay lên; game không có ô cấp độ trên HUD (Số nào lớn hơn?, Vườn luyện tập) và Lật thẻ thần kỳ (cấp độ là chặng, đã có nút “Sang chặng tiếp”) thì không có pill. Pill là con của play surface và được đặt vị trí bằng script theo ô cấp độ, vì HUD vẽ lại mỗi tick. Pill hiện trong 600 ms (`fb-rise`, cùng nhịp với `LEVELUP_MS` trong `feedback.mjs`): trồi lên 90 ms, giữ rõ tới 70% rồi bay thêm và tan, tổng quãng bay 28 px.
- Nhịp chuyển câu 450 ms; ✓ giữa màn hình mờ nốt 150 ms còn lại trên câu mới. Với `prefers-reduced-motion`, animation tắt, ✓ đứng yên 600 ms rồi biến mất.
- Kỷ lục mới chỉ ăn mừng ở màn kết thúc: cúp 🏆 (`record-trophy`) bật lên, xoay nhẹ trong 1 s kèm vầng sáng vàng lan ra lặp mỗi 1,6 s (`record-glow`); tiêu đề “Kỷ lục mới!” (`record-title`) trồi lên sau 350 ms; `celebrateRecord(app)` thả 28 mảnh confetti vào `#confetti` trong 2,2 s. Reduced motion: không animation, không vầng sáng, không confetti.

### HUD

- Mỗi chỉ số nằm trong ô trắng mờ, radius 12–14 px.
- Nhãn nhỏ muted; giá trị lớn màu accent.
- Dùng `font-variant-numeric: tabular-nums` cho score/time.
- Ô “Kỷ lục” chỉ hiện kỷ lục trước lượt chơi, không đổi nhãn hay màu khi điểm vượt qua; ô cập nhật sang kỷ lục mới khi màn kết thúc hiện ra.
- Mobile giảm padding và có thể chuyển 5 ô thành grid 3 cột hoặc 4 ô thành 2 cột.

### Equation

- Dùng flex, căn giữa, gap 20 px.
- Toán tử và dấu bằng có màu muted tím.
- Ô chưa biết có nền trắng, border dashed, radius 18 px và min-width 90 px.

### Answer buttons

- Desktop: 4 cột, min-height 84 px, radius 18 px.
- Mobile: 2 cột, min-height 74 px.
- Border và shadow lấy từ palette mode.
- Đúng: nền xanh; sai: opacity thấp hoặc nền hồng tùy game.

### Feedback

- Luôn giữ `min-height` để layout không nhảy.
- Dùng `role="status"` và `aria-live="polite"` cho thông báo động.
- Success dùng xanh đậm; miss dùng đỏ hồng đậm.

### Overlay

Overlay phủ bên trong play surface cho intro, pause và kết thúc. Nền gần trắng có opacity cao, z-index 2–4, căn giữa theo cả hai trục.

### Results và score board

- Kết quả chính dùng nhóm số lớn và label nhỏ.
- Top 5 score là list/grid trên nền trắng mờ.
- Điểm của lượt vừa chơi (nếu lọt top 5) được highlight nền vàng `#fff0bd`, viền trong `#f0c94c` 2 px, kèm nhãn nhỏ “Lượt chơi hiện tại” cạnh điểm (`.current-run`). Điểm bằng nhau thì lượt mới đứng sau lượt cũ.
- Action kết thúc nằm ngang trên desktop, xếp dọc dưới 520 px.

## 7. Button behavior

Button toàn hệ thống:

- Transition transform và shadow: 180 ms.
- Hover: nâng 3 px.
- Active: hạ 1 px.
- Focus-visible: outline tím 3 px, offset 5 px.

CTA chính `.primary` có nền tím, chữ trắng, radius 12 px, padding 12×22 px. Nút phụ `.back` có nền trắng, border nhạt.

Không gắn hover translate cho control cần vị trí tuyệt đối trong game; Rain keypad chủ động override hover thành không dịch chuyển.

## 8. Motion

| Motion | Duration/nhịp | Mục đích |
| --- | --- | --- |
| Button transition | 180 ms | phản hồi hover/press |
| Challenge pop | 350 ms | đáp án đúng |
| Challenge shake | 240 ms | đáp án sai |
| Bubble float | 3 s → 1,4 s | tăng cảm giác tốc độ |
| Welcome float | 4 s | trang trí nhẹ |
| Rain score effect | 800 ms | điểm/mạng bay lên |
| Confetti fall | 1,5 s, trễ tối đa 0,6 s | ăn mừng kỷ lục mới toàn màn hình |
| Record trophy | 1 s, vầng sáng 1,6 s lặp | cúp ở màn kết thúc có kỷ lục mới |
| Record title | 500 ms, trễ 350 ms | tiêu đề “Kỷ lục mới!” |
| Compare transition | 650 ms đúng, 1 s sai | giữ nhịp đọc feedback |
| Đúng hay sai transition | 450 ms đúng, 1 s sai | ô kết quả chỉ hiện khi sai |

`@media (prefers-reduced-motion: reduce)` tắt toàn bộ animation và transition, đồng thời ẩn confetti. Feature mới phải hoạt động đúng khi animation bị tắt.

## 9. Accessibility và input

- Mọi button và link có focus-visible rõ.
- Trạng thái động dùng live region.
- Control chỉ có icon cần `aria-label`.
- Disabled state chặn submit lặp.
- Game có timer tự pause khi document bị ẩn.
- Rain có keypad cảm ứng và mapping bàn phím đầy đủ.
- Compare có mapping hướng vị trí rõ ràng.
- Đúng hay sai: `ArrowLeft` là Đúng, `ArrowRight` là Sai, khớp vị trí hai thẻ.
- Escape dùng nhất quán để pause ở các game có pause.
- Game mới phải trả focus hợp lý sau intro, pause, restart và khi sinh câu mới.

## 10. Voice và microcopy

Ngôn ngữ mặc định là tiếng Việt. Giọng viết:

- Gọi người chơi là “bé” hoặc “nhà thám hiểm nhí”.
- Dùng câu ngắn, động từ rõ: “Chọn”, “Chạm”, “Nhập”, “Thử lại”.
- Sai: giải thích điều xảy ra và mời thử lại; tránh “Thất bại”, “Kém”, “Sai rồi”.
- Đúng: phản hồi ngắn, có thể kèm điểm/streak.
- Kết thúc: nhấn mạnh tiến bộ và cho lựa chọn chơi lại hoặc đổi game.
- Không lặp lại luật dài trong lúc đang chơi.

Mẫu:

```text
Đúng: “Chính xác! +20 điểm · Chuỗi 5”
Sai: “Chưa đúng. Bé thử lại nhé!”
Hết giờ: “Hết giờ! 8 + 7 = 15. Mất 1 mạng.”
Hoàn thành: “Mỗi lần thử, bé lại giỏi hơn một chút.”
```

## 11. Checklist khi thêm UI mới

- Dùng palette mode qua CSS variables.
- Hoạt động ở desktop, 800 px, 650 px và 520 px.
- Target chính đủ lớn cho touch.
- Có focus-visible và aria-label phù hợp.
- Feedback không làm layout nhảy.
- Pause/visibility không làm timer tiếp tục chạy.
- Animation tắt được bằng reduced motion.
- Controller cleanup toàn bộ timer, frame và listener.
- Copy tiếng Việt ngắn, tích cực và đúng luật thực tế.
- Không thêm dependency chỉ để tạo một component nhỏ.

