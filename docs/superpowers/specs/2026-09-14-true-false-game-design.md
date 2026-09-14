# Thiết kế game Đúng hay sai?

## Mục tiêu

Thêm một mini-game 90 giây vào Khu trò chơi. Mỗi lượt hiện một phép tính, bé chạm thẻ **Đúng** hoặc **Sai**. Độ khó tăng theo đồng hồ: kết quả sai gần kết quả thật dần, và ở chặng cuối có thêm dạng hai vế. Game dùng tiến độ học hiện có, lưu năm điểm cao nhất riêng và không thay đổi hành vi các game đang có.

## Cách làm

Tạo cặp engine/controller riêng (`truefalse-engine.mjs`, `truefalse.mjs`) theo đúng khuôn của Số nào lớn hơn?. Không tách khung dùng chung từ `compare.mjs` để không đụng game đang chạy; phần đồng hồ, tạm dừng và màn kết thúc được lặp lại có chủ đích. Khi có game 90 giây thứ ba mới cân nhắc tách khung.

## Luật chơi

- Một lượt kéo dài 90 giây hoạt động. Tạm dừng dừng đồng hồ và chuyển tiếp đang chờ.
- Mỗi round hiện một phép tính và hai thẻ lớn **✓ Đúng**, **✗ Sai**. Xác suất phép tính đúng là 50%.
- Đúng: `10 × min(4, 1 + floor(streak / 5))` điểm, tức 10 điểm và tối đa 40 điểm mỗi câu (streak tính sau khi cộng câu này, giống `compare`).
- Sai: chuỗi đúng về 0. Không trừ điểm, không trừ giờ.
- Hết giờ: hủy chuyển tiếp đang chờ, kết thúc ngay, lưu điểm vào top 5 của game `truefalse` và ăn mừng nếu có kỷ lục mới. Câu trả lời sau khi hết giờ không được tính.

## Chặng và cách tạo câu hỏi

Chặng mở theo thời gian đã chơi `elapsed = 90 − remaining`:

| Chặng | Mở khi | Dạng câu | Câu “sai” |
| --- | --- | --- | --- |
| 1 | `elapsed < 30` | `a ± b = c` | `c` lệch 3–5 so với kết quả thật |
| 2 | `30 ≤ elapsed < 60` | `a ± b = c` | `c` lệch 1–2 |
| 3 | `elapsed ≥ 60` | 50% `a ± b = c`, 50% `a ± b = c ± d` | Một vế: `c` lệch đúng 1. Hai vế: giá trị hai vế chênh 1–2 |

- Vế trái lấy từ `learning.nextFact({context:'truefalse'})`, nên theo chặng giáo trình của bé. Nếu supplier không trả phép tính hợp lệ, engine tự tạo một phép tính có kết quả trong 0–20.
- Câu “đúng”: vế phải bằng đúng kết quả của vế trái.
- Câu “sai”: engine chọn lệch lên hoặc xuống ngẫu nhiên; nếu hướng đó ra ngoài 0–20 thì dùng hướng còn lại. Vế phải luôn khác kết quả thật.
- Vế phải dạng hai vế do engine tự tạo: một phép cộng hoặc trừ trong 0–20 có đúng giá trị cần có, không trùng id với vế trái.
- Mọi số hạng, số trừ và kết quả hiển thị đều nằm trong 0–20, không âm.

## Hạ bậc và hồi bậc

Giữ cơ chế của Số nào lớn hơn?:

- `trueFalseStage(g) = max(1, unlockedTrueFalseStage(g) − g.stagePenalty)`.
- Hai câu sai liên tiếp hạ một bậc nếu chặng thực tế đang lớn hơn 1, rồi đặt lại bộ đếm sai. Chặng 1 không hạ thêm.
- Sau khi bị hạ, ba câu đúng liên tiếp giảm `stagePenalty` một mức và đặt lại bộ đếm đúng.
- Chặng thực tế không bao giờ cao hơn chặng đồng hồ đã mở.
- Khi đồng hồ mở chặng mới trong lúc đang bị hạ, chặng thực tế tăng theo nhưng vẫn thấp hơn chặng đồng hồ đúng bằng mức đang bị hạ.

## Giao diện

- Màn chơi dùng màu `yellow`, khung giống Số nào lớn hơn?: thanh trên có “← Đảo trò chơi”, “✅ Đúng hay sai?” và “Tạm dừng”.
- HUD 4 ô: Điểm, Kỷ lục (kỷ lục trước lượt), Thời gian, Chuỗi đúng. Không có ô chặng và không có thông báo khi đồng hồ mở chặng mới.
- Thân màn: nhãn “LƯỢT n”, câu hỏi “Phép tính này đúng hay sai?”, một thẻ trắng lớn chứa phép tính (ví dụ `7 + 5 = 13`). Dạng hai vế dùng cỡ chữ nhỏ hơn một nấc để vừa màn hình 400 px. Mỗi phần phép tính (`a ± b`) là một khối riêng để ô kết quả khi sai căn giữa phía trên nó; thẻ chừa sẵn chỗ cho ô này nên phép tính không bị đẩy xuống khi ô hiện ra.
- Hai thẻ lớn nằm cạnh nhau ở mọi khổ màn hình: **✓ Đúng** bên trái, **✗ Sai** bên phải.
- Màn giới thiệu: biểu tượng, câu “Nhìn phép tính rồi chọn Đúng hoặc Sai.”, nút “Bắt đầu →” và dòng phím tắt. Không ghi thời lượng ở menu và màn giới thiệu.

## Phím tắt

- `ArrowLeft`: Đúng. `ArrowRight`: Sai. `Escape`: tạm dừng hoặc tiếp tục.
- Bỏ qua phím lặp và phím có Ctrl/Meta/Alt.
- Tab bị ẩn sẽ tự tạm dừng.

## Phản hồi

- Đúng: thẻ vừa chọn chuyển xanh, `showCenterCheck` bật ✓ lớn giữa màn, beep đúng, `award()` một sao, trình đọc màn hình nghe “Chính xác, +n điểm”. Câu mới sau `NEXT_DELAY_MS` (450 ms).
- Sai: `showMiss` hiện ✗ trên thẻ đã chọn, thẻ đúng chuyển xanh, beep sai. Không có dòng chữ giải thích nào hiện ra. Thay vào đó, một ô kết quả nhỏ hiện ở giữa, ngay phía trên phần phép tính, ghi kết quả thật:
  - Một vế `7 + 5 = 13`: ô `12` phía trên `7 + 5`.
  - Hai vế `6 + 7 = 9 + 5`: ô `13` phía trên `6 + 7` và ô `14` phía trên `9 + 5`.
  - Vế là số đơn (ví dụ `13` bên phải dấu `=`) không có ô.
- Trình đọc màn hình nghe kết quả qua `.sr-only` (ví dụ “Chưa đúng. 7 + 5 = 12”, hoặc “Chưa đúng. 6 + 7 = 13, 9 + 5 = 14”); không có chữ nhìn thấy. Việc hạ bậc không có thông báo.
- Sau câu sai chờ 1 giây rồi sang câu mới, giống Số nào lớn hơn?. Đồng hồ vẫn chạy trong lúc chờ.
- Câu đúng không hiện ô kết quả, giữ quy ước “chỉ một tín hiệu” của các game khác.
- Màn hết giờ và màn kỷ lục dùng lại cấu trúc của Số nào lớn hơn?: 🌟 “Hết giờ!” hoặc 🏆 “Kỷ lục mới!” kèm `celebrateRecord`, điểm, số lượt đúng, chuỗi tốt nhất, bảng “5 điểm cao nhất” highlight lượt hiện tại với nhãn “Lượt chơi hiện tại”, nút “↻ Chơi lại” và “Chọn trò khác”.

## Liên kết tiến độ học

- Khi bé trả lời đúng, phép tính vế trái được ghi `review` với context `truefalse` và `sessionId` của lượt. `review` không tăng strength.
- Vế phải của dạng hai vế do engine tự tạo nên không ghi.
- Khi bé trả lời sai, không ghi evidence.

## Trang chủ

- Thêm mode `{id:'truefalse',zone:'game',icon:'✅',title:'Đúng hay sai?',desc:'Nhìn phép tính, chọn Đúng hoặc Sai thật nhanh!',tag:'KIỂM TRA · TÍNH NHẨM',color:'yellow',label:'Thử tài'}` sau `compare`.
- Khu trò chơi có 6 game. Thẻ lời khuyên trải hết một hàng (`.cards>.tip{grid-column:1/-1}`) thành dải ngang dưới các game, ở lưới 3 cột và 2 cột.
- Mô tả trang trong `index.html` đổi “7 trò chơi” thành “8 trò chơi”.

## Cấu trúc mã

File mới:

- `dist/truefalse-engine.mjs`: `createTrueFalseGame()`, `unlockedTrueFalseStage(g)`, `trueFalseStage(g)`, `recordTrueFalseAnswer(g, good)`, `elapseTrueFalse(g, seconds)`, `createTrueFalseRound(g, {fact, random})`, `reviewFacts(round, correct)`. Round trả về vế trái (có `fact`), vế phải (số hoặc phép tính), `truth` và giá trị thật của hai vế. Engine thuần, nhận supplier và `random` qua tham số.
- `dist/truefalse.mjs`: `mountTrueFalse(app, {home, award, beep, learning, scores})`, trả về hàm cleanup.
- `dist/truefalse.css`: thẻ phép tính, hai thẻ Đúng/Sai, trạng thái đúng/sai và responsive.
- `tests/truefalse.test.mjs`.

File sửa:

- `dist/app.js`: import, thêm mode, định tuyến `truefalse` tới `mountTrueFalse`.
- `dist/index.html`: thêm `truefalse.css?v=2`, đổi số trò chơi.
- `dist/sw.js`: thêm `truefalse-engine.mjs`, `truefalse.mjs`, `truefalse.css` vào `ASSETS`.
- `dist/style.css`: thẻ lời khuyên trải hàng.
- `tests/home-ui.test.mjs`: danh sách zone, test thẻ lời khuyên đổi sang trải hàng, đưa `truefalse.mjs` vào các test HUD kỷ lục/ăn mừng/top 5, thêm test đăng ký game, không ghi thời lượng, HUD không có ô chặng.
- `docs/FEATURES.md`: mục mới “Đúng hay sai?”, danh sách game, bảng router, danh sách game có kỷ lục, danh sách ghi tiến độ.
- `docs/ENGINE.md`: bảng hàm engine mới.
- `docs/DESIGN_SYSTEM.md`: Khu trò chơi có 6 game và thẻ lời khuyên thành dải ngang.

## Kiểm thử và xác nhận

Test engine:

- Chặng mở ở `elapsed` 0, 30 và 60 giây.
- Hai sai liên tiếp hạ bậc, ba đúng liên tiếp hồi bậc, kể cả qua mốc mở chặng. Không dưới chặng 1, không vượt chặng đã mở.
- Sai giữ điểm và reset chuỗi; điểm mỗi câu tối đa 40.
- 90 giây kết thúc lượt; câu trả lời sau đó không đổi trạng thái.
- Với `random` cố định: câu đúng hiện đúng kết quả; câu sai lệch 3–5 ở chặng 1, 1–2 ở chặng 2, đúng 1 với dạng một vế và 1–2 với dạng hai vế ở chặng 3; mọi số trong 0–20; chặng 3 tạo được cả hai dạng; vế phải không trùng id vế trái; vẫn tạo được câu khi supplier trả `undefined`.
- `reviewFacts` chỉ trả phép tính vế trái khi đúng.

Test UI tĩnh trong `home-ui.test.mjs` và `offline.test.mjs` như mục Cấu trúc mã.

Kiểm tra bằng tay trên desktop và khổ 400 px: màn giới thiệu, chọn cả hai thẻ, `ArrowLeft`/`ArrowRight`/`Escape`, tạm dừng, ô kết quả chỉ hiện khi sai và nằm giữa phía trên phép tính (cả hai vế ở dạng hai vế), khựng 1 giây khi sai và 450 ms khi đúng, dạng hai vế không tràn, màn hết giờ và kỷ lục, dải lời khuyên ở lưới 3, 2 và 1 cột.
