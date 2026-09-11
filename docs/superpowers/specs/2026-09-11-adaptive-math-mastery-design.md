# Thiết kế luyện thích ứng và thành tích cá nhân

## Mục tiêu

Đảo Toán Vui giúp một trẻ dần thành thạo và tạo phản xạ với phép cộng, phép trừ trong phạm vi 20. Ứng dụng ghi nhớ phần trẻ đã thuộc, phần còn chậm và phần cần ôn trên chính thiết bị đang dùng. Vườn luyện tập là nơi đánh giá chính; các mini-game dùng cùng hồ sơ để chọn nội dung phù hợp mà vẫn giữ luật chơi riêng.

Ứng dụng không yêu cầu tài khoản và không hỗ trợ nhiều hồ sơ ở giai đoạn này. Đồng hồ phản hồi được đo ngầm, không hiển thị cho trẻ. Toàn bộ ứng dụng luôn dùng cả phép cộng và phép trừ trong phạm vi 20; màn hình chọn phép toán và phạm vi được loại bỏ.

## Trải nghiệm chính

### Trang chủ

Trang chủ có khu vực **Hành trình của bé** với ba thông tin ngắn:

- số phép tính đã thuộc;
- số phép tính đang luyện;
- gợi ý hoạt động tiếp theo, ví dụ “Hôm nay mình ôn 7 phép nhé”.

Vườn luyện tập vẫn là lựa chọn nổi bật. Trẻ có thể vào bất kỳ mini-game nào; gợi ý chỉ định hướng, không khóa trò chơi. Khu vực dành cho phụ huynh cho phép xem tiến độ chi tiết và đặt lại toàn bộ tiến độ cùng thành tích sau một bước xác nhận.

### Vườn luyện tập

Mỗi lượt có 18 câu, dự kiến kéo dài 3–5 phút. Một lượt thông thường gồm:

- 7 câu từ các phép trẻ còn yếu hoặc vừa trả lời sai;
- 5 câu từ các phép đang học;
- 4 câu đã vững hoặc đã thuộc nhưng đến hạn ôn;
- 2 câu mới ở vùng độ khó kế tiếp.

Nếu một nhóm không đủ câu, bộ chọn bù từ nhóm gần nhất theo thứ tự: cần ôn, đang học, đã vững, mới. Không lặp cùng cách viết ở hai câu liền nhau. Câu sai hoặc dùng gợi ý được chèn lại sau 3–5 câu, không bắt trẻ làm lại ngay.

Độ khó được chia thành bốn vùng theo tổng của phép cộng hoặc số bị trừ: 0–5, 6–10, 11–15 và 16–20. Lần đầu sử dụng bắt đầu ở vùng 0–5. Vùng kế tiếp được mở khi ít nhất 70% mục trong vùng hiện tại đạt mức “đang vững” hoặc cao hơn. Hai câu mới trong mỗi lượt được phép lấy từ vùng kế tiếp để trẻ đã có sẵn năng lực không phải luyện quá lâu ở phần dễ; các câu củng cố còn lại không vượt vùng đã mở.

Cuối lượt chỉ hiển thị tiến bộ tích cực: số phép thuộc thêm, số phép đang luyện và gợi ý lượt tiếp theo. Trẻ có thể nghỉ, luyện thêm hoặc chuyển sang mini-game được đề xuất. Vườn luyện tập không có điểm, combo, mạng hoặc bảng kỷ lục.

## Mô hình kiến thức

### Danh mục phép tính

Danh mục gồm các phép cộng có hai số hạng không âm và tổng không quá 20, cùng các phép trừ có số bị trừ không quá 20 và kết quả không âm. Mỗi cách viết là một mục riêng, vì tốc độ với `8 + 7`, `7 + 8`, `15 − 7` và `15 − 8` có thể khác nhau.

Các mục liên quan được nối thành một họ phép tính. Bằng chứng tốt ở một mục làm tăng nhẹ ưu tiên ôn các mục còn lại trong họ nhưng không tự đánh dấu chúng là đã thuộc.

### Dữ liệu của từng phép tính

Mỗi mục lưu dữ liệu gọn:

- số lần đúng, sai và dùng gợi ý;
- thời gian phản hồi trung bình có trọng số cho các lần gần đây;
- số phiên riêng biệt có câu trả lời đúng nhanh;
- trạng thái `mới`, `đang học`, `đang vững` hoặc `đã thuộc`;
- lần luyện gần nhất và thời điểm nên ôn lại;
- một điểm sức mạnh từ 0 đến 6 để chọn câu và chuyển trạng thái.

Không lưu lịch sử thao tác vô hạn. Dữ liệu có số phiên bản để có thể nâng cấp cấu trúc mà không làm hỏng dữ liệu cũ.

### Đánh giá tốc độ và mức thành thạo

Ứng dụng xây dựng mốc phản hồi từ trung vị tối đa 12 câu đúng không dùng gợi ý gần đây của chính trẻ, tách theo vùng độ khó và loại hoạt động. Khi chưa đủ bốn mẫu, dùng mốc khởi tạo 8 giây; mốc này không xuất hiện trên giao diện.

- Đúng, không gợi ý và không chậm hơn mốc cá nhân: tăng 2 điểm sức mạnh và ghi nhận phiên đúng nhanh.
- Đúng nhưng chậm: tăng 1 điểm sức mạnh và tiếp tục luyện.
- Dùng gợi ý: ghi nhận đã tiếp xúc nhưng không tăng sức mạnh hoặc số phiên đúng nhanh.
- Sai trong Vườn luyện tập, Bắt bong bóng hoặc Số nào trốn mất: giảm 1 điểm sức mạnh và lên lịch xuất hiện lại.
- Trạng thái được suy ra như sau: chưa gặp là `mới`; 0–2 điểm là `đang học`; 3–4 điểm là `đang vững`; 5–6 điểm và đúng nhanh trong ít nhất ba phiên khác nhau là `đã thuộc`.
- Phép đã thuộc được ôn thưa dần. Nếu trẻ lại trả lời sai, phép đó trở về nhóm cần luyện.

Việc chuyển trạng thái được giới hạn từng bước để một câu đúng hoặc sai đơn lẻ không làm tiến độ thay đổi quá mạnh.

## Bộ chọn thích ứng

Bộ chọn nhận loại hoạt động, danh sách phép hợp lệ, hồ sơ tiến độ và thời điểm hiện tại. Nó xếp trọng số theo trạng thái, hạn ôn, lỗi gần đây, tốc độ và vùng đã mở. Sau đó nó chọn ngẫu nhiên có trọng số, tránh lặp cách viết liên tiếp và giữ cân bằng giữa cộng với trừ.

Mini-game có thể yêu cầu một câu thường, một tập câu có đáp án khác nhau hoặc câu khó nhất. Bộ chọn trả về phép tính cùng mã nhận diện ổn định để game báo kết quả về đúng mục.

Nếu bộ nhớ trình duyệt không khả dụng hoặc dữ liệu bị lỗi, ứng dụng dùng hồ sơ mới trong phiên hiện tại và vẫn cho chơi bình thường. Dữ liệu lỗi không được làm ứng dụng dừng hoạt động.

## Tích hợp từng mini-game

### Bắt bong bóng

Các câu hỏi ưu tiên nhóm đang học, còn yếu và đến hạn ôn. Trả lời đúng, sai hoặc hết giờ đều cập nhật kết quả cùng thời gian phản hồi vì mỗi màn chỉ có một câu mục tiêu rõ ràng. Một lượt chơi tạo một mã phiên; câu đúng nhanh trong lượt đó chỉ đóng góp một phiên vào điều kiện thành thạo của mỗi phép.

### Số nào trốn mất

Game lấy một họ phép tính thích hợp rồi ẩn một thành phần. Kết quả đúng, sai hoặc hết giờ cập nhật mục tương ứng. Việc chọn câu vẫn giữ tỷ lệ cộng/trừ cân bằng. Game dùng mã phiên giống Bắt bong bóng để không đếm nhiều câu cùng một lượt thành nhiều phiên thành thạo.

### Lật thẻ thần kỳ

Bộ thẻ ưu tiên các phép cần ôn và bảo đảm các đáp án đủ phân biệt để ghép cặp. Ghép sai không hạ mức thành thạo toán vì có thể chỉ là lỗi nhớ vị trí. Ghép đúng cập nhật lần gặp gần nhất và lịch ôn nhưng không tăng điểm sức mạnh hoặc số phiên đúng nhanh.

### Mưa phép tính

Các giọt thường ưu tiên phép trẻ đang học hoặc cần ôn. Game chỉ gửi bằng chứng tích cực khi trẻ nhập một đáp án đúng. Gõ sai, để giọt chạm vạch hoặc hết mạng không ảnh hưởng hồ sơ học tập vì nhiều phép có thể xuất hiện cùng lúc.

Khi một đáp án đúng xóa nhiều giọt có cùng kết quả, chỉ phép tính mục tiêu mà game chọn để chấm được tăng 1 điểm sức mạnh. Các giọt còn lại bị xóa không tạo bằng chứng học tập. Mưa phép tính không ghi thời gian hoặc phiên đúng nhanh vì nhiều giọt cùng tồn tại nên không xác định được lúc trẻ bắt đầu giải một phép.

Phép tính vàng xuất hiện hiếm, chỉ khi màn đã có nhiều phép tính, và luôn lấy từ nhóm khó nhất trong vùng trẻ đã mở: sức mạnh thấp, từng cần gợi ý, phản hồi chậm hoặc đang đến hạn ôn. Khi chưa đủ lịch sử, nó lấy một phép khó ở vùng mới nhất đã mở, không nhảy quá xa năng lực hiện tại. Trả lời đúng phép vàng xóa toàn bộ giọt đang rơi nhưng chỉ cập nhật chính phép vàng.

## Điểm cao và động lực quay lại

Mỗi mini-game có tính điểm lưu tối đa năm kết quả cao nhất, xếp giảm dần. Vì ứng dụng luôn dùng cộng và trừ trong phạm vi 20, mỗi game chỉ cần một bảng thành tích. Vườn luyện tập không tham gia bảng điểm.

Trong lúc chơi, HUD hiển thị điểm hiện tại và **Kỷ lục** có từ trước khi bắt đầu lượt. Khi điểm hiện tại vượt kỷ lục, nhãn đổi tại chỗ thành **Kỷ lục mới!** và phát hiệu ứng nhấn nhẹ một lần, không mở lớp phủ làm ngắt lượt chơi. Khi màn kết thúc:

- kết quả được thêm vào bảng năm điểm nếu đủ điều kiện;
- nếu điểm lớn hơn kỷ lục trước lượt, màn kết quả hiển thị “Kỷ lục mới!” cùng hiệu ứng chúc mừng ngắn;
- bảng năm điểm cao nhất được hiển thị trên màn kết quả;
- lần chơi đầu tiên có điểm lớn hơn 0 được xem là kỷ lục mới;
- thoát về trang chủ trước khi màn kết thúc không ghi điểm. Một màn hoàn chỉnh là hết lượt do mất hết mạng với Mưa phép tính, Bắt bong bóng và Số nào trốn mất, hoặc hoàn tất cả ba chặng với Lật thẻ thần kỳ.

Một kết quả bằng đúng kỷ lục cũ có thể vào bảng năm điểm nhưng không được xem là phá kỷ lục. Hiệu ứng dùng chuyển động và âm thanh hiện có ở mức vừa phải, đồng thời tôn trọng tùy chọn giảm chuyển động của hệ điều hành và trạng thái tắt âm thanh.

## Lưu trữ và ranh giới dữ liệu

Một kho dữ liệu cục bộ có trách nhiệm đọc, kiểm tra, nâng cấp và ghi hồ sơ học tập cùng bảng điểm. Các game không thao tác trực tiếp với `localStorage`; chúng gọi các hàm rõ ràng để lấy câu, ghi bằng chứng và hoàn tất lượt chơi.

Các phần chính:

1. **Danh mục phép tính** tạo mã ổn định và quan hệ họ phép tính.
2. **Hồ sơ thành thạo** cập nhật trạng thái, tốc độ cá nhân và lịch ôn.
3. **Bộ chọn thích ứng** tạo nội dung cho từng hoạt động.
4. **Kho cục bộ** lưu một trẻ trên một thiết bị, có phiên bản và giá trị dự phòng an toàn.
5. **Kho thành tích** giữ năm điểm cao nhất của từng mini-game và phát hiện kỷ lục mới.
6. **Bộ điều khiển giao diện** chỉ hiển thị dữ liệu và gửi sự kiện học tập có ngữ cảnh rõ ràng.

Điểm, combo, mạng và cấp độ tiếp tục thuộc luật riêng của game. Chúng không trực tiếp quyết định mức thành thạo.

## Kiểm thử và tiêu chí hoàn thành

Kiểm thử tự động cần bao phủ:

- danh mục cộng/trừ trong phạm vi 20 và quan hệ họ phép tính;
- cập nhật đúng, sai, chậm, nhanh, dùng gợi ý và chuyển trạng thái;
- yêu cầu ba phiên khác nhau trước khi đánh dấu đã thuộc;
- lịch ôn và việc đưa câu sai trở lại sau 3–5 câu;
- tỷ lệ 7/5/4/2 và quy tắc bù khi một nhóm thiếu câu;
- cân bằng cộng/trừ, giới hạn vùng đã mở và tránh lặp liên tiếp;
- đọc, ghi, nâng cấp, đặt lại và phục hồi khi dữ liệu cục bộ lỗi;
- năm điểm cao nhất, điểm bằng kỷ lục, kỷ lục mới và lượt thoát sớm;
- quy tắc ghi nhận khác nhau của bốn mini-game;
- phép vàng luôn chọn từ nhóm khó nhất và chỉ cập nhật phép vàng khi xóa màn hình.

Kiểm tra trực tiếp trên trình duyệt cần xác nhận:

- trang chính không còn bộ chọn phép toán và phạm vi;
- Hành trình của bé cập nhật sau khi tải lại trang;
- Vườn luyện tập hoàn thành một lượt 18 câu, xử lý gợi ý và câu lặp lại đúng;
- HUD của mỗi mini-game hiển thị kỷ lục;
- chúc mừng kỷ lục mới chỉ xuất hiện khi kết thúc màn;
- bàn phím máy tính, keypad cảm ứng, pause/resume và điều hướng về trang chủ hoạt động;
- bố cục dùng tốt trên desktop và mobile;
- các mode hiện có vẫn chơi được, Tên lửa vũ trụ vẫn được ẩn.

Tính năng hoàn thành khi tiến độ tồn tại qua tải lại trang, mọi game lấy được câu thích ứng theo đúng quy tắc, kỷ lục được lưu chính xác và toàn bộ kiểm thử hiện có cùng kiểm thử mới đều đạt.
