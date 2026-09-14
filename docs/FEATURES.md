# Feature reference

## 1. Shell và màn hình đảo trò chơi

`dist/app.js` sở hữu shell toàn app và mount đúng một game tại một thời điểm.

### Header

- Logo “Đảo Toán Vui” quay về màn hình chính.
- Bộ đếm ⭐ dùng chung cho các game có thưởng.
- Nút bật/tắt âm thanh. Lựa chọn được lưu vào `localStorage` (`toan-sound`: `on`/`off`) và giữ nguyên ở lần mở sau. Lần đầu mở app, hoặc khi trình duyệt chặn storage, âm thanh bật (nút hiện 🔊).

### Chạy offline

- App không có nút cài riêng: bé lưu về màn hình bằng tính năng sẵn có của trình duyệt (Safari: Chia sẻ → Thêm vào MH chính; Chrome: Cài đặt ứng dụng / Thêm vào màn hình chính). `site.webmanifest` và các thẻ `apple-mobile-web-app-*` giúp app mở toàn màn hình với tên “Toán Vui” và icon riêng.
- `dist/offline.mjs` đăng ký `dist/sw.js`; service worker lưu sẵn toàn bộ file của app trong lần mở đầu tiên khi có mạng. Sau đó app mở và chơi được khi không có mạng, kể cả khi mở từ màn hình chính trên iPad/điện thoại.
- File của app luôn lấy bản mới từ mạng trước; mất mạng hoặc mạng chậm quá 3 giây thì dùng bản đã lưu. Vì vậy bản deploy mới đến tay bé ngay khi có mạng, không cần đổi phiên bản cache.
- Font Nunito được lưu lại ở lần tải đầu; nếu chưa kịp lưu, app dùng font hệ thống.
- Khi thêm file mới vào `dist`, phải thêm vào `ASSETS` trong `sw.js`; test `offline.test.mjs` sẽ báo nếu thiếu.

### Hành trình của bé

- Hiển thị chặng hiện tại của giáo trình (ví dụ “Chặng 1 · Bù về 10 và số đôi nhỏ”), số phép đang đến hạn ôn, đã thuộc và đang luyện.
- Nút “Luyện tập ngay” mở thẳng Vườn luyện tập. Animation ở trạng thái tĩnh cố ý tinh tế: bóng đổ “thở” chậm, và cứ 5 giây có một “khoảnh khắc mời gọi” dài khoảng 0,7 giây: nút nhấc nhẹ, vệt sáng quét ngang, tên lửa nhún, mũi tên nhích theo và một vòng sáng mỏng lan ra rồi tan. Chu kỳ được dịch pha (`--cta-phase`) để khoảnh khắc đầu tiên xuất hiện chỉ ~0,8 giây sau khi bé vào trang. Ngoài khoảnh khắc đó nút đứng yên; hover thì dừng animation và nhấc nút lên. Tắt hoàn toàn khi hệ thống bật `prefers-reduced-motion`.
- Link nhỏ “Chi tiết ›” trong dòng tóm tắt mở chi tiết bốn trạng thái (đã thuộc, đang vững, đang học, chưa khám phá) và thanh tiến độ `vững/tổng` của từng chặng trong giáo trình; chặng chưa mở hiện mờ.
- Mỗi chặng có nút “Luyện” (kể cả chặng chưa mở). Bấm vào sẽ mở một lượt Vườn luyện tập chỉ gồm câu của chặng đó. Lựa chọn chỉ áp dụng cho lượt ấy: kết quả vẫn ghi vào tiến độ chung, nhưng chặng hiện tại và điều kiện mở chặng không đổi. Cuối lượt, “↻ Luyện thêm chặng này” mở tiếp một lượt cùng chặng; vào Vườn luyện tập từ trang chủ thì quay lại theo chương trình.
- Bảng chi tiết có hàng tiêu đề “Chi tiết hành trình” với nút ✕ để đóng; đóng xong focus quay về link “Chi tiết ›”. App không còn nút đặt lại dữ liệu.

### Danh sách game

Menu lấy từ mảng `modes` trong `dist/app.js`. Mỗi mode có `id`, `zone`, icon, tiêu đề, mô tả, tag, màu và nhãn CTA. Trang chủ chia hai khu, ngăn cách bằng đường nét đứt:

- **Khu luyện tập** (`zone:'practice'`): Vườn luyện tập và Phiếu 20 phép, lưới 2 cột.
- **Khu trò chơi** (`zone:'game'`) bên dưới: Mưa phép tính, Bắt bong bóng, Lật thẻ thần kỳ, Số nào trốn mất?, Số nào lớn hơn?, kèm thẻ lời khuyên lấp ô cuối lưới 3 cột.

Số thứ tự trên thẻ đếm lại từ 01 trong mỗi khu. Trên điện thoại (≤ 520 px) mỗi thẻ chiếm một dòng. Router hiện ánh xạ:

| Mode | Controller |
| --- | --- |
| `practice` | `mountPractice` |
| `rain` | `mountRain` |
| `compare` | `mountCompare` |
| `sheet` | `mountSheet` |
| `bubble`, `memory`, `mystery` | `mountChallenge` |

Khi chuyển game hoặc về trang chủ, shell gọi cleanup của game đang chạy trước khi mount màn hình mới.

### Kỷ lục

- Các game có điểm (Bắt bong bóng, Tìm số bí ẩn, Phép tính tìm bạn, Mưa phép tính, Số nào lớn hơn?) hiện ô “Kỷ lục” trong HUD với kỷ lục trước lượt chơi. Khi đang chơi, ô này không đổi nhãn, màu hay giá trị dù bé đã vượt kỷ lục.
- Khi lượt chơi kết thúc với điểm lớn hơn kỷ lục cũ, màn kết thúc ăn mừng: cúp 🏆 bật lên kèm vầng sáng, tiêu đề “Kỷ lục mới!” trồi lên và confetti rơi khắp màn hình (`celebrateRecord` trong `feedback.mjs`). Ô “Kỷ lục” trong HUD lúc đó mới cập nhật sang điểm mới.
- Bảng “5 điểm cao nhất” ở màn kết thúc highlight điểm của lượt vừa chơi (nền vàng) và gắn nhãn “Lượt chơi hiện tại” cạnh điểm. Lượt không lọt top 5 thì không có dòng nào được highlight.

## 2. Vườn luyện tập

Mục tiêu: luyện đúng phần trẻ đang yếu mà không tạo áp lực điểm, giờ hoặc mạng.

### Flow

1. Tạo một session cơ sở 18 câu từ hồ sơ học hiện tại.
2. Hiển thị một phép tính và 4 đáp án.
3. Trả lời sai không chuyển câu; đáp án sai bị vô hiệu hóa và phép tính được xếp lại sau 3–5 vị trí.
4. Dùng gợi ý hiển thị chiến lược tính nhẩm của phép đó (xem `strategies.mjs`: bù về 10 với khung 10 ô, số đôi, gần số đôi, qua 10 kiểu “8 + 2 = 10, 10 + 3 = 13”) kèm chấm trực quan; phép tính cũng được xếp lại để bé làm lại ngay sau khi hiểu.
5. Trả lời đúng chuyển sang câu sau sau 700 ms.
6. Session có thể dài hơn 18 câu vì các câu sai hoặc dùng gợi ý được thêm lại.
7. Màn kết thúc hiển thị số câu đúng và thay đổi mastery; có thể luyện tiếp, chơi một game gợi ý hoặc nghỉ. Game gợi ý được chọn ngẫu nhiên mỗi lần trong Khu trò chơi (không gợi ý Phiếu 20 phép), nút ghi icon và tên game đó.

### Quy tắc

- Không tính điểm, không trao sao, không có mạng, không có đồng hồ.
- 18 slot ban đầu gồm 7 `weak`, 5 `learning`, 4 `due`, 2 `new`.
- Mỗi slot lấy từ chặng hiện tại của giáo trình với xác suất 75%, còn lại ôn các chặng đã qua (chặng 1 luôn 100%). Dấu phép tính do chặng quyết định: ba chặng đầu chỉ cộng, chặng 4 chỉ trừ, chặng 5 trộn.
- Khi pool của chặng hết câu chưa dùng (chặng 1 chỉ có 13 câu), session cho phép lặp lại nhưng không lặp trong 3 câu liền kề.
- Một câu chỉ được xếp lại một lần trong lần xuất hiện hiện tại.

### Input và feedback

- Chạm/click đáp án.
- Bàn phím số hỗ trợ trực tiếp các đáp án một chữ số đang hiển thị.
- Đúng: nút xanh và pop; một dấu ✓ xanh lớn bật lên giữa ô chơi rồi mờ trong 600 ms. Ô `?` giữ nguyên, không hiện đáp án, để bé chỉ cần nhìn một tín hiệu. Không có dòng chữ; trình đọc màn hình vẫn nghe "Chính xác, a + b = c" qua `.sr-only`. Câu mới sau 450 ms (`NEXT_DELAY_MS` trong `feedback.mjs`).
- Sai: nút rung, hiện ✗ đỏ ở góc trong 300 ms rồi mờ; dòng "Chưa đúng. Bé thử lại nhé!" giữ nguyên.

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

- Cấp độ tăng sau mỗi 6 câu đúng; lúc đó pill "⬆ Lên cấp n!" hiện trên ô “Cấp độ” của HUD và bay lên trong 600 ms.
- Tốc độ rơi cố định `0.055` và nhịp spawn cố định `3.8` giây ở mọi cấp.
- Độ khó tăng bằng số giọt cùng lúc: từ 1 lên tối đa 4.
- Engine tính giới hạn fallback tăng từ 10, mỗi cấp thêm 2, tối đa 20. Trong flow hiện tại, phép tính chính đến từ learning service theo chặng giáo trình (xem ENGINE.md mục 6); giới hạn fallback chỉ dùng khi supplier không trả fact.
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
- Engine tính mức giới hạn 6 ở cấp đầu và tăng 5 mỗi cấp, tối đa 20. Controller hiện lấy fact trực tiếp từ learning service, nên progression thực tế theo chặng giáo trình của Core Facts Engine; giá trị `limit` của challenge chưa được truyền vào selector.
- Thời gian mỗi câu bắt đầu 18 giây, giảm 2 giây mỗi cấp, tối thiểu 8 giây.
- Chuyển động bong bóng bắt đầu chu kỳ 3 giây, nhanh dần và tối thiểu 1,4 giây.
- Trả lời sai hoặc hết giờ: mất 1 mạng, trừ 5 điểm, ngắt streak; cùng câu vẫn cho thử lại nếu còn mạng.
- Trả lời đúng: 10 điểm nhân multiplier streak, tối đa 40 điểm; nếu câu đã sai trước đó thì nhận 5 điểm.
- Sau câu đúng, ✓ xanh lớn hiện giữa ô chơi (ô `?` giữ nguyên); câu mới sau 450 ms ở mọi cấp. Khi lên cấp (mỗi 4 câu đúng) có pill "⬆ Lên cấp n!" hiện ngay trên ô “Cấp độ” của HUD và bay lên trong 600 ms, không bị cắt khi sang câu mới. Chuỗi đúng không còn pill riêng.

## 5. Số nào trốn mất?

Mục tiêu: tìm số hạng hoặc số trừ còn thiếu trong biểu thức `a ± ? = kết quả`.

### Luật

- Dùng chung score, lives và progression với Bắt bong bóng, bao gồm việc lấy fact theo chặng giáo trình thay vì `limit` tính bởi challenge engine.
- Có 3 mạng.
- Thời gian mỗi câu bắt đầu 22 giây, giảm 2 giây mỗi cấp, tối thiểu 10 giây.
- Bốn đáp án được tạo quanh giá trị `b` cần tìm.
- Sai hoặc hết giờ: mất 1 mạng, trừ 5 điểm và ngắt streak.
- Đúng lần đầu nhận điểm theo streak; đúng sau khi đã sai nhận 5 điểm.
- Phản hồi giống Bắt bong bóng: ✓ xanh lớn giữa ô chơi (ô `?` giữ nguyên), câu mới sau 450 ms, pill "⬆ Lên cấp n!" trên ô “Cấp độ” khi lên cấp.

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
- Các phép tính trên thẻ chỉ được ghi nhận là `review` khi round trả lời đúng.
- Top 5 điểm được lưu riêng cho mode `compare`.
- Đúng: thẻ (hoặc nút "Hai thẻ bằng nhau") xanh và ✓ xanh lớn bật lên giữa ô chơi rồi mờ trong 600 ms, giống các game khác; lượt mới sau 450 ms. HUD không có ô cấp độ nên không có pill lên cấp khi tăng bậc. Sai: ✗ trên thẻ đã chọn, thẻ đúng chuyển xanh (không có ✓), chờ 1 giây để bé đọc lời giải thích.

### Input

- Click/chạm vào thẻ hoặc nút bằng nhau.
- `ArrowUp`: thẻ trên.
- `ArrowDown`: thẻ dưới.
- `Enter` hoặc `=`: bằng nhau.
- `Escape`: tạm dừng.
- Tab bị ẩn sẽ tự tạm dừng.

## 8. Phiếu 20 phép

Mục tiêu: một “tờ bài tập” điền cả 20 kết quả rồi chấm một lượt, dành cho lúc bé muốn làm bình tĩnh, không tương tác từng câu.

### Flow

1. `sheet-engine.mjs` lấy 20 câu qua `buildPracticeSession({count:20,unique:true})`, nên theo đúng chặng giáo trình và tỉ lệ 75% trọng tâm / 25% ôn như Vườn luyện tập. Một phiếu không bao giờ lặp phép tính. Ở chặng 1 pool chỉ có 13 câu, nên phiếu dùng đủ 13 câu đó rồi mượn 7 câu của chặng 2 (Số đôi và gần số đôi); chặng hiện tại không đổi.
2. Lưới 3 cột (2 cột dưới 900px), mỗi dòng `a ± b =` và một ô `input type=number`, không đánh số câu. Phép tính là một flex row `justify-content:space-evenly` chiếm hết bề rộng còn lại của dòng, nên số hạng và dấu dàn đều từ mép trái tới ô nhập.
3. Enter hoặc mũi tên xuống chuyển ô kế; mũi tên lên quay lại. Dòng trạng thái đếm số ô đã điền.
4. “Chấm bài” chấm đúng một lần: ô đúng xanh có ✓, ô sai đỏ gạch ngang và hiện `✗ sai → đáp án`, ô trống hiện `trống → đáp án` (nhãn nằm dòng riêng dưới phép tính). Ô khóa lại; phiếu tự cuộn tới câu sai đầu tiên.
5. Kết quả “Đúng x / 20 câu”, rồi “Làm phiếu mới” hoặc “Nghỉ một chút”.

### Quy tắc

- Không điểm, không sao, không mạng, không đồng hồ.
- Mỗi câu ghi `correct` hoặc `wrong` (ô trống tính là sai) với context `sheet`, không có `elapsedMs`, nên câu đúng chỉ tăng strength 1 như câu đúng chậm: phiếu củng cố kiến thức, không tính là phản xạ.
- Chấm lần hai không ghi thêm evidence.

## 9. Học thích ứng và tiến độ dùng chung

Mỗi phép tính có trạng thái `new`, `learning`, `strong` hoặc `mastered`. Các game gửi evidence theo context riêng để benchmark tốc độ phản hồi phù hợp từng kiểu chơi.

- Vườn luyện tập ghi `correct`, `wrong`, `hint` và `review`.
- Mưa, Bắt bong bóng và Số trốn mất ghi đúng/sai với context của game.
- Lật thẻ ghi `review` cho cặp đúng.
- Số nào lớn hơn ghi `review` cho phép tính trong round đúng.

Tiến độ và bảng điểm lưu trên thiết bị hiện tại bằng `localStorage`; app không có tài khoản, đồng bộ cloud hoặc backend dữ liệu.

## 10. Khả năng engine chưa được đăng ký trong menu

`challenge-engine.mjs` và `challenge.mjs` vẫn chứa hai nhánh tương thích:

- `rocket`: mode 60 giây; sai hoặc timeout trừ 3 giây và 5 điểm.
- `practice` kiểu challenge cũ: 12 câu, có điểm và nút sang câu; khác với Vườn luyện tập đang dùng.

Hai nhánh này được test ở cấp engine nhưng không có card trong `modes`, vì vậy người dùng hiện không thể mở chúng từ UI. Khi chỉnh engine dùng chung cần giữ rõ sự khác biệt này để tránh vô tình thay đổi game đang hoạt động hoặc hồi sinh mode cũ.
