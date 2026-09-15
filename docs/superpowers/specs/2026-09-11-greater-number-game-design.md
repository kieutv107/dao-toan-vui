# Thiết kế game Số nào lớn hơn

## Mục tiêu

Thêm một mini-game so sánh trong 2 phút. Bé chọn thẻ trên, thẻ dưới hoặc nút “Bằng nhau” dựa trên giá trị của hai thẻ. Game luyện khả năng tính nhẩm và so sánh, dùng tiến độ học hiện có, lưu năm điểm cao nhất và không làm thay đổi các game đang có.

## Trải nghiệm chơi

- Hai thẻ lớn xếp dọc. Chạm thẻ trên khi giá trị trên lớn hơn, chạm thẻ dưới khi giá trị dưới lớn hơn.
- Một nút “Bằng nhau” nằm bên dưới hai thẻ.
- Có hướng dẫn ngắn trước lượt chơi, HUD hiển thị điểm, kỷ lục, thời gian còn lại, chuỗi đúng. Không cần hiển thị bậc khó.
- Một lượt kéo dài 2 phút. Tạm dừng sẽ dừng đồng hồ và các chuyển tiếp đang chờ.
- Đúng: cộng điểm theo cơ chế chuỗi, phát phản hồi nhẹ và chuyển câu sau một khoảng ngắn.
- Sai: không trừ điểm, đặt chuỗi về 0, tô nổi lựa chọn đúng rồi chuyển câu.
- Hết giờ: hủy chuyển tiếp đang chờ và kết thúc ngay, lưu điểm vào danh sách năm điểm cao nhất của riêng game và chúc mừng nếu có kỷ lục mới.
- Hỗ trợ cảm ứng, chuột và phím `ArrowUp`, `ArrowDown`, `=` hoặc `Enter` cho lựa chọn bằng nhau.

## Câu hỏi và độ khó

Game có ba bậc hiển thị:

1. **Số với số:** lượt 1–5.
2. **Phép tính với số:** lượt 6–10; vị trí phép tính đổi ngẫu nhiên.
3. **Phép tính với phép tính:** từ lượt 11.

Khoảng 20% câu có hai giá trị bằng nhau. Các câu còn lại có một đáp án lớn hơn rõ ràng. Bộ sinh câu không tạo giá trị ngoài 0–20.

Ở bậc 3, khoảng cách giữa hai giá trị thu hẹp dần theo số lượt đã chơi. Ban đầu ưu tiên chênh lệch 3–6, sau đó 2–4, cuối cùng 1–2. Câu bằng nhau không phụ thuộc khoảng cách này.

Độ khó thích ứng dùng hai bộ đếm liên tiếp:

- Hai câu sai liên tiếp làm giảm một bậc và đặt lại bộ đếm sai. Bậc 1 không giảm thêm.
- Sau khi bị giảm, ba câu đúng liên tiếp khôi phục một bậc và đặt lại bộ đếm đúng. Không tăng cao hơn bậc đã mở theo số lượt.
- Bậc được mở theo số lượt vẫn tiến từ 1 sang 2 sau lượt 5 và từ 2 sang 3 sau lượt 10. Nếu đang bị giảm, bậc hiển thị bằng bậc đã mở trừ mức giảm hiện tại.

## Điểm số và phản hồi

- Câu đúng đầu tiên nhận 10 điểm.
- Điểm tăng theo chuỗi đúng bằng cơ chế đang dùng ở các mini-game: tối đa 40 điểm mỗi câu.
- Câu sai không trừ điểm và không kết thúc lượt.
- Ô kỷ lục trong HUD đổi nền vàng và nội dung khi vượt điểm cao nhất nhưng không chạy animation.
- Phản hồi đúng/sai dùng màu, viền và thay đổi nhẹ trên thẻ; không dùng hiệu ứng che nội dung hoặc gây rung toàn màn hình.

## Liên kết tiến độ học

- Thẻ phép tính lấy từ bộ chọn thích ứng hiện có, vì vậy ưu tiên phần bé đang luyện trong level hiện tại.
- Khi bé chọn đúng, mỗi phép tính đang hiển thị được ghi nhận là `review`. Dữ liệu này cho biết bé đã gặp lại phép tính nhưng không tự tăng sức mạnh hay đưa phép tính lên trạng thái “Đã thuộc”.
- Khi bé chọn sai, không ghi nhận phép tính là sai vì lỗi có thể nằm ở thao tác so sánh.
- Các lượt chỉ có số không tạo bằng chứng học tập.

## Cấu trúc mã

- `src/compare-engine.mjs`: trạng thái 2 phút, bậc đã mở, giảm/khôi phục độ khó, sinh cặp so sánh, xác định đáp án và tính điểm.
- `src/compare.mjs`: giao diện, đồng hồ, bàn phím, phản hồi, ghi tiến độ và lưu kỷ lục.
- `src/compare.css`: bố cục hai thẻ, trạng thái đúng/sai và responsive.
- `src/app.js`: thêm game vào menu và định tuyến đến controller mới.
- Engine giữ logic thuần, nhận hàm sinh số/phép tính qua tham số để kiểm thử ổn định.

## Kiểm thử và xác nhận

Kiểm thử tự động sẽ bao phủ:

- Ba bậc ở đúng mốc lượt 1, 6 và 11.
- Giảm bậc sau hai sai liên tiếp và khôi phục sau ba đúng liên tiếp.
- Không giảm dưới bậc 1 hoặc tăng cao hơn bậc đã mở.
- Câu sai giữ nguyên điểm và ngắt chuỗi.
- Đồng hồ kết thúc ở 2 phút và không chạy khi tạm dừng.
- Câu bằng nhau, câu có một phép tính và câu có hai phép tính trả về đúng lựa chọn.
- Giá trị luôn trong 0–20 và khoảng cách hẹp dần ở bậc 3.
- Phím tắt, lưu top 5, thông báo kỷ lục và ghi nhận `review` đúng phạm vi.

Sau kiểm thử tự động, chạy game trên desktop và mobile để kiểm tra thao tác thẻ, nút “Bằng nhau”, tạm dừng, phản hồi một giây, hết giờ và khả năng đọc phép tính.
