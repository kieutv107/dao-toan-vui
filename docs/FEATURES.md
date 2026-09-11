# Feature reference

## 1. Shell và màn hình đảo trò chơi

`dist/app.js` sở hữu shell toàn app và mount đúng một game tại một thời điểm.

### Header

- Logo “Đảo Toán Vui” quay về màn hình chính.
- Bộ đếm ⭐ dùng chung cho các game có thưởng.
- Nút bật/tắt âm thanh. Trạng thái âm thanh chỉ tồn tại trong phiên hiện tại.

### Hành trình của bé

- Hiển thị số phép đang đến hạn ôn, đã thuộc và đang luyện.
- “Xem tiến độ” mở chi tiết bốn trạng thái: đã thuộc, đang vững, đang học, chưa khám phá.
- “Đặt lại dữ liệu” yêu cầu bấm hai lần, sau đó xóa tiến độ học, bảng điểm và tổng sao.

### Danh sách game

Menu lấy từ mảng `modes` trong `dist/app.js`. Mỗi mode có `id`, icon, tiêu đề, mô tả, tag, màu và nhãn CTA. Router hiện ánh xạ:

| Mode | Controller |
| --- | --- |
| `practice` | `mountPractice` |
| `rain` | `mountRain` |
| `compare` | `mountCompare` |
| `bubble`, `memory`, `mystery` | `mountChallenge` |

Khi chuyển game hoặc về trang chủ, shell gọi cleanup của game đang chạy trước khi mount màn hình mới.

## 2. Vườn luyện tập

Mục tiêu: luyện đúng phần trẻ đang yếu mà không tạo áp lực điểm, giờ hoặc mạng.

### Flow

1. Tạo một session cơ sở 18 câu từ hồ sơ học hiện tại.
2. Hiển thị một phép tính và 4 đáp án.
3. Trả lời sai không chuyển câu; đáp án sai bị vô hiệu hóa và phép tính được xếp lại sau 3–5 vị trí.
4. Dùng gợi ý hiển thị chấm trực quan; phép tính cũng được xếp lại để ôn.
5. Trả lời đúng chuyển sang câu sau sau 700 ms.
6. Session có thể dài hơn 18 câu vì các câu sai hoặc dùng gợi ý được thêm lại.
7. Màn kết thúc hiển thị số câu đúng và thay đổi mastery; có thể luyện tiếp, sang Bắt bong bóng hoặc nghỉ.

### Quy tắc

- Không tính điểm, không trao sao, không có mạng, không có đồng hồ.
- 18 slot ban đầu gồm 7 `weak`, 5 `learning`, 4 `due`, 2 `new`.
- Dấu phép tính luân phiên cộng/trừ, bắt đầu bằng cộng.
- Hai trong mỗi ba slot cộng ưu tiên phép cộng qua 10 có hai số hạng nhỏ hơn 10.
- Một câu chỉ được xếp lại một lần trong lần xuất hiện hiện tại.

### Input và feedback

- Chạm/click đáp án.
- Bàn phím số hỗ trợ trực tiếp các đáp án một chữ số đang hiển thị.
- Đúng: nút xanh và pop nhẹ.
- Sai: nút mờ, rung nhẹ và cho thử lại.

## 3. Mưa phép tính

Mục tiêu: tính nhẩm liên tục trong khi các phép tính rơi xuống bốn làn.

### Flow

1. Phép tính xuất hiện ở một làn trống và rơi về vạch đáy.
2. Trẻ nhập đáp án bằng keypad hoặc bàn phím, rồi bấm OK/Enter.
3. Một đáp án đúng xóa tất cả giọt thường có cùng kết quả; giọt thấp nhất là giọt đại diện để chấm.
4. Nếu có giọt vàng cùng kết quả, giọt vàng được ưu tiên và xóa toàn bộ màn hình.
5. Một giọt chạm đáy làm mất 1 mạng, ngắt streak, xóa mọi giọt và tạo khoảng nghỉ 1,2 giây.
6. Hết 3 mạng thì kết thúc và lưu top 5 điểm.

### Độ khó

- Cấp độ tăng sau mỗi 6 câu đúng.
- Tốc độ rơi cố định `0.055` và nhịp spawn cố định `3.8` giây ở mọi cấp.
- Độ khó tăng bằng số giọt cùng lúc: từ 1 lên tối đa 4.
- Engine tính giới hạn fallback tăng từ 10, mỗi cấp thêm 2, tối đa 20. Trong flow hiện tại, phép tính chính đến từ learning service theo band mastery; giới hạn fallback chỉ dùng khi supplier không trả fact.
- Giọt vàng bắt đầu từ cấp 2. Xác suất bắt đầu 6%, tăng 2 điểm phần trăm mỗi cấp và tối đa 20%.
- Sau một giọt vàng phải có ít nhất 5 lượt spawn trước khi giọt vàng khác đủ điều kiện xuất hiện.

### Điểm và phạt

- Đúng: `10 × multiplier`, multiplier tăng mỗi 5 streak và tối đa `×5`.
- Sai: chỉ ngắt streak; không mất điểm và không mất mạng.
- Chạm đáy: mất 1 mạng; không trừ điểm.
- Điểm không âm.

### Input và accessibility

- Keypad cảm ứng gồm 0–9, xóa và OK.
- Bàn phím hỗ trợ số, Backspace/Delete, Enter và Escape để tạm dừng.
- Giọt có `aria-label`; giọt vàng mô tả rõ hiệu ứng xóa màn hình.
- Tab bị ẩn sẽ tự tạm dừng.

## 4. Bắt bong bóng

Mục tiêu: chọn nhanh kết quả đúng trong 4 bong bóng chuyển động.

### Luật

- Có 3 mạng.
- Cấp tăng sau mỗi 4 câu đúng.
- Engine tính mức giới hạn 6 ở cấp đầu và tăng 5 mỗi cấp, tối đa 20. Controller hiện lấy fact trực tiếp từ learning service, nên progression thực tế theo band mastery 11–15 rồi 16–20; giá trị `limit` của challenge chưa được truyền vào selector.
- Thời gian mỗi câu bắt đầu 18 giây, giảm 2 giây mỗi cấp, tối thiểu 8 giây.
- Chuyển động bong bóng bắt đầu chu kỳ 3 giây, nhanh dần và tối thiểu 1,4 giây.
- Trả lời sai hoặc hết giờ: mất 1 mạng, trừ 5 điểm, ngắt streak; cùng câu vẫn cho thử lại nếu còn mạng.
- Trả lời đúng: 10 điểm nhân multiplier streak, tối đa 40 điểm; nếu câu đã sai trước đó thì nhận 5 điểm.
- Sau câu đúng, câu mới xuất hiện sau khoảng 650–1.020 ms tùy cấp.

## 5. Số nào trốn mất?

Mục tiêu: tìm số hạng hoặc số trừ còn thiếu trong biểu thức `a ± ? = kết quả`.

### Luật

- Dùng chung score, lives và progression với Bắt bong bóng, bao gồm việc lấy fact theo band mastery thay vì `limit` tính bởi challenge engine.
- Có 3 mạng.
- Thời gian mỗi câu bắt đầu 22 giây, giảm 2 giây mỗi cấp, tối thiểu 10 giây.
- Bốn đáp án được tạo quanh giá trị `b` cần tìm.
- Sai hoặc hết giờ: mất 1 mạng, trừ 5 điểm và ngắt streak.
- Đúng lần đầu nhận điểm theo streak; đúng sau khi đã sai nhận 5 điểm.

## 6. Lật thẻ thần kỳ

Mục tiêu: ghép một thẻ phép tính với thẻ kết quả tương ứng.

### Cấu trúc chặng

| Chặng | Số cặp | Số thẻ |
| --- | ---: | ---: |
| 1 | 3 | 6 |
| 2 | 4 | 8 |
| 3 | 6 | 12 |

### Luật

- Không có đồng hồ, mạng hoặc streak.
- Mỗi cặp đúng được 20 điểm và 1 sao.
- Một lần mở hai thẻ được tính là một lượt ghép.
- Ghép sai không trừ điểm đã có.
- Có thể bấm thẻ thứ ba ngay để thay cặp sai đang mở; nếu không, cặp sai tự úp sau 1 giây.
- Mỗi chặng thưởng hiệu quả: `số cặp × 10 − số lượt sai × 5`, tối thiểu 0.
- Bonus mỗi chặng chỉ được trả một lần.
- Khi ghép đúng, phép tính được ghi nhận dưới dạng `review`, không tăng strength.

## 7. Số nào lớn hơn?

Mục tiêu: so sánh hai thẻ và chọn thẻ trên, thẻ dưới hoặc “Hai thẻ bằng nhau”.

### Thời lượng và stage

- Mỗi lượt kéo dài 120 giây hoạt động; tạm dừng không làm giảm giờ.
- Lượt 1–5: hai thẻ đều là số.
- Lượt 6–10: một phép tính và một số.
- Từ lượt 11: cả hai thẻ là phép tính.
- Mỗi round có xác suất 20% là hai giá trị bằng nhau.

### Thích ứng trong game

- Hai câu sai làm giảm một stage nếu có thể.
- Ba câu đúng liên tiếp sau khi bị giảm giúp hồi một stage.
- Stage không vượt stage đã mở theo số lượt đã làm.
- Ở stage 3, khoảng cách mục tiêu hẹp dần: lượt 11–15 là 3–6, lượt 16–20 là 2–4, sau đó là 1–2.

### Điểm và feedback

- Sai không trừ điểm nhưng reset streak.
- Đúng nhận 10 điểm, tăng multiplier mỗi 5 streak và tối đa 40 điểm.
- Đúng chuyển câu sau 650 ms; sai chuyển câu sau 1 giây.
- Các phép tính trên thẻ chỉ được ghi nhận là `review` khi round trả lời đúng.
- Top 5 điểm được lưu riêng cho mode `compare`.

### Input

- Click/chạm vào thẻ hoặc nút bằng nhau.
- `ArrowUp`: thẻ trên.
- `ArrowDown`: thẻ dưới.
- `Enter` hoặc `=`: bằng nhau.
- `Escape`: tạm dừng.
- Tab bị ẩn sẽ tự tạm dừng.

## 8. Học thích ứng và tiến độ dùng chung

Mỗi phép tính có trạng thái `new`, `learning`, `strong` hoặc `mastered`. Các game gửi evidence theo context riêng để benchmark tốc độ phản hồi phù hợp từng kiểu chơi.

- Vườn luyện tập ghi `correct`, `wrong`, `hint` và `review`.
- Mưa, Bắt bong bóng và Số trốn mất ghi đúng/sai với context của game.
- Lật thẻ ghi `review` cho cặp đúng.
- Số nào lớn hơn ghi `review` cho phép tính trong round đúng.

Tiến độ và bảng điểm lưu trên thiết bị hiện tại bằng `localStorage`; app không có tài khoản, đồng bộ cloud hoặc backend dữ liệu.

## 9. Khả năng engine chưa được đăng ký trong menu

`challenge-engine.mjs` và `challenge.mjs` vẫn chứa hai nhánh tương thích:

- `rocket`: mode 60 giây; sai hoặc timeout trừ 3 giây và 5 điểm.
- `practice` kiểu challenge cũ: 12 câu, có điểm và nút sang câu; khác với Vườn luyện tập đang dùng.

Hai nhánh này được test ở cấp engine nhưng không có card trong `modes`, vì vậy người dùng hiện không thể mở chúng từ UI. Khi chỉnh engine dùng chung cần giữ rõ sự khác biệt này để tránh vô tình thay đổi game đang hoạt động hoặc hồi sinh mode cũ.
