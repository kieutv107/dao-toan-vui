# Thiết kế Green Check Feedback

## Mục tiêu

Làm phản hồi đúng/sai trong bốn game trả lời nhanh (Vườn luyện tập, Bắt bong bóng, Số nào trốn mất, Số nào lớn hơn) tức thời, trực quan và vui theo tinh thần Lumosity nhưng đơn giản cho trẻ 7 tuổi. Bé nhìn thấy dấu ✓ xanh đúng nơi mắt đang nhìn thay vì đọc một dòng chữ, và câu mới đến nhanh hơn. Không đổi engine, cách ghi mastery, điểm hay mạng.

## Phạm vi

- Thêm module dùng chung `dist/feedback.mjs` và `dist/feedback.css`.
- Sửa `dist/practice.mjs`, `dist/challenge.mjs` (chỉ nhánh bubble và mystery), `dist/compare.mjs` để gọi module.
- Đổi âm báo đúng/sai trong `dist/app.js` cho ngắn hơn.
- Không đổi Lật thẻ thần kỳ, Mưa phép tính, Phiếu 20 phép.
- Không thêm confetti, điểm nổi hay hiệu ứng toàn màn hình.

## Module `feedback.mjs`

Bốn hàm thuần DOM, không giữ trạng thái, không gọi engine:

- `showCheck(target, answer)`. Có `answer`: dùng cho ô `?` (class `.unknown`). Ô nhận class `is-check`, một `<i class="fb-check">✓</i>` được chèn vào và phóng từ 40% lên 100% trong 180 ms; từ 200 ms dấu ✓ mờ đi và nội dung ô đổi thành `answer`. Không có `answer`: dùng cho thẻ đã hiện giá trị (Số nào lớn hơn). Dấu ✓ phóng lên giữa thẻ trong 180 ms rồi thu về huy hiệu nhỏ ở góc trên phải, giá trị thẻ vẫn đọc được.
- `showMiss(button)`. Chèn `<i class="fb-miss">✗</i>` vào nút, huy hiệu đỏ nhỏ ở góc trên phải hiện 300 ms rồi tan; class `challenge-shake` vẫn do controller gắn như hiện tại. Sau đó nút giữ trạng thái mờ, vô hiệu như cũ.
- `showStreak(anchor, n)`. Chèn `<span class="fb-streak">Chuỗi n</span>` cạnh `anchor`, pill bay lên khoảng 24 px và tan trong 600 ms rồi tự gỡ khỏi DOM. Không chặn việc sang câu mới.
- `announce(region, text)`. Xóa nội dung vùng `aria-live` và chèn `<span class="sr-only">text</span>` để trình đọc màn hình đọc câu đúng dù màn hình không hiện chữ.
- Hằng xuất `NEXT_DELAY_MS = 450`: thời gian từ lúc chạm đúng đến khi câu mới xuất hiện. Cả ba controller dùng hằng này thay số riêng.

`feedback.css` cũng định nghĩa class `sr-only` (repo chưa có) để giấu chữ khỏi màn hình nhưng vẫn cho trình đọc màn hình đọc.

Mọi phần tử chèn vào có `aria-hidden="true"`. Hàm tự gỡ phần tử tạm sau khi animation kết thúc bằng `setTimeout`, không phụ thuộc sự kiện `animationend` để vẫn đúng khi animation bị tắt.

## Trải nghiệm theo game

### Vườn luyện tập

- Đúng: nút chuyển xanh và pop như hiện tại; đồng thời `showCheck(unknownBox, q.answer)`. Dòng chữ "Chính xác!" không hiện nữa; vùng `#feedback` giữ chiều cao để layout không nhảy. Vùng aria-live vẫn nhận câu "Chính xác, a + b = c" qua một `<span class="sr-only">` để trình đọc màn hình nghe được. Sang câu mới sau `NEXT_DELAY_MS` thay cho 700 ms.
- Sai: `showMiss(button)`, nút rung và mờ như cũ. Dòng chữ "Chưa đúng. Bé thử lại nhé!" giữ nguyên.
- Không có pill chuỗi.

### Bắt bong bóng và Số nào trốn mất

- Đúng: như Luyện tập, thêm `showStreak` khi `g.streak > 0 && g.streak % 3 === 0`, neo vào ô `?`. Dòng "Chính xác! +10 điểm" bỏ; điểm đã hiện trong HUD. Sang câu sau `NEXT_DELAY_MS` thay cho `max(650, 1100 − level × 80)`.
- Sai: `showMiss(button)`; dòng chữ về mạng giữ nguyên.
- Hết giờ: không đổi.
- Nhánh `practice` và `memory` trong `challenge.mjs` không đổi.

### Số nào lớn hơn

- Đúng: thẻ hoặc nút "Hai thẻ bằng nhau" chuyển xanh như hiện tại; `showCheck(chosenButton)` không có `answer`. `showStreak` khi streak chia hết cho 3, neo vào thẻ đã chọn. Dòng chữ "Chính xác!" bỏ, nhưng câu "Tuyệt! Bé đã tăng một bậc." vẫn hiện vì mang thông tin mới. Sang lượt mới sau `NEXT_DELAY_MS` thay cho 650 ms.
- Sai: `showMiss(chosenButton)`; thẻ đúng vẫn tô xanh như hiện tại và gọi `showCheck(rightButton)` để ✓ chỉ rõ đáp án. Dòng giải thích và 1 giây chờ giữ nguyên để bé đọc.

## Âm thanh

`beep(win)` trong `app.js` hiện phát ba nốt kéo dài khoảng 440 ms, dài hơn khoảnh khắc 450 ms.

- Đúng: hai nốt lên nhanh (520 Hz rồi 780 Hz), tổng khoảng 150 ms.
- Sai: một nốt trầm 200 Hz, khoảng 100 ms, biên độ thấp hơn.
- `beep` chỉ được gọi khi trả lời, không có chỗ nào gọi lúc kết thúc, nên không cần hàm riêng. Mưa phép tính và Lật thẻ cũng dùng `beep` nên âm ngắn hơn ở đó luôn; đây là hiệu ứng mong muốn.

## Trợ năng và giảm chuyển động

- Rule `prefers-reduced-motion` toàn cục đã tắt mọi animation. Trạng thái cuối phải đúng khi không có animation: ô `?` xanh có số, thẻ xanh có ✓ góc, nút sai có ✗ trong 300 ms rồi mất.
- Màu luôn đi kèm ký hiệu ✓ hoặc ✗, không chỉ dựa vào màu.
- Vùng aria-live giữ thông báo đúng/sai đầy đủ.

## Kiểm thử

Theo mẫu regex trên file nguồn như `tests/home-ui.test.mjs`:

- `feedback.mjs` xuất `showCheck`, `showMiss`, `showStreak`, `NEXT_DELAY_MS` bằng 450.
- `feedback.css` có keyframes cho check, miss, streak và các class `fb-check`, `fb-miss`, `fb-streak`, `is-check`, `sr-only`.
- `index.html` nạp `feedback.css`.
- `practice.mjs` import `showCheck`, `showMiss`, `NEXT_DELAY_MS`; không gọi `showStreak`; không còn số 700 trong `setTimeout` chuyển câu.
- `challenge.mjs` và `compare.mjs` import cả ba hàm và dùng `NEXT_DELAY_MS`; không còn biểu thức `1100-difficulty().level*80` và `delayLeft=.65`.
- `beep` trong `app.js` không còn mảng ba mốc thời gian `[0,.12,.24]`; có hai nhánh đúng/sai riêng.

Kiểm tra trực quan bằng trình duyệt sau khi code: bốn game, cả trên bề rộng 400 px, và một lần với `prefers-reduced-motion`.

## Tài liệu

Cập nhật `docs/FEATURES.md` mục 2, 4, 5, 7 và `docs/DESIGN_SYSTEM.md` phần phản hồi.
