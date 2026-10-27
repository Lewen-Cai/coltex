# Tác tử AI

**AI** ở thanh bên trái mở tác tử AI. Tác tử AI khả dụng khi quản trị viên đã kết nối một dịch vụ mô hình và thêm bạn vào một nhóm AI; nhóm quyết định bạn được dùng những mô hình nào.

## Tác tử AI làm được gì

- Trả lời câu hỏi về LaTeX và giải thích đoạn mã đã chọn.
- Giải thích hoặc sửa lỗi biên dịch (nhật ký cũng có nút “Sửa bằng AI”).
- Viết lại, trau chuốt hoặc dịch đoạn đã chọn.
- Cho cái nhìn tổng quan về dự án, tìm các nhãn không được tham chiếu, v.v.
- Xem các trang PDF để kiểm tra bố cục, như hình và bảng có nằm trong cột không, công thức có tràn ra không (với các mô hình xem được ảnh).

Tệp đang mở, vùng chọn và các lỗi biên dịch gần đây được đính kèm vào tin nhắn của bạn; nhấp vào một tệp đính kèm để bỏ nó ra.

Trong một tin nhắn, tác tử AI có thể làm tối đa 60 bước (đọc, sửa, biên dịch, tìm kiếm…). Khi đến giới hạn, nó dừng lại và cho bạn biết đã làm gì và còn lại gì; gửi “tiếp tục” để nó làm tiếp.

## Quyền

Tác tử AI được phép thay đổi những gì là do bạn quyết định: chọn trong **Cài đặt → Tác tử AI**, hoặc trong bộ chọn mô hình ở cuối bảng (bên dưới mức suy nghĩ); dòng bên dưới ô nhập tin nhắn cho biết lựa chọn hiện tại. Lựa chọn này cũng áp dụng cho các tác tử của riêng bạn kết nối qua MCP (xem bên dưới).

- **Thủ công** (mặc định): thay đổi của tác tử AI được đưa vào một bản nháp, và không có gì thay đổi cho đến khi bạn áp dụng.
  1. Khi tác tử AI xong, bản nháp được biên dịch thử và bạn được báo liệu nó có làm tăng lỗi không.
  2. **Xem lại thay đổi** hiển thị phần khác biệt theo từng tệp; bạn có thể chỉ áp dụng một phần.
  3. **Áp dụng** ghi các thay đổi vào dự án rồi biên dịch; nếu kết quả biên dịch tệ hơn, thay đổi sẽ được hoàn nguyên. Một phiên bản được lưu trước khi áp dụng.
  4. Sau khi áp dụng, **Hoàn tác** đảo ngược các thay đổi và giữ lại những chỉnh sửa người khác đã làm trong lúc đó.
- **Tự động**: bản nháp được áp dụng ngay khi tác tử AI trả lời xong, với cùng các biện pháp an toàn: một phiên bản được lưu trước, dự án được biên dịch, kết quả biên dịch tệ hơn sẽ được hoàn nguyên, và sau đó vẫn có **Hoàn tác**. Nếu trong lúc đó có người đã thay đổi chính những dòng ấy, sẽ không có gì được áp dụng và bản nháp chờ bạn. Khi bạn dừng tác tử AI, bản nháp của nó cũng chờ bạn.
- **Toàn quyền**: như Tự động, và tác tử AI còn có thể xóa, di chuyển và đổi tên tệp. Các thao tác này diễn ra ngay, không qua bản nháp; một phiên bản được lưu trước thao tác đầu tiên trong mỗi câu trả lời. Câu trả lời liệt kê chúng cùng với các tệp đã thay đổi.

Người xem và người duyệt có thể hỏi tác tử AI, nhưng nó không thể thay đổi gì thay họ.

## Web

Khi tìm kiếm web đã được thiết lập, tác tử AI có thể tìm trên web và đọc trang web: hướng dẫn tác giả hiện hành của một tạp chí, ghi chú phát hành của một gói, một nguồn để kiểm chứng một nhận định. Các mô hình của Anthropic, OpenAI và ChatGPT dùng tìm kiếm tích hợp của chính chúng; các mô hình khác dùng dịch vụ tìm kiếm mà quản trị viên đã kết nối. Những gì nó tìm và các trang nó đọc hiện thành các bước trong cuộc trò chuyện, và nó cho biết câu trả lời dựa trên những trang nào.

Để không gì trong dự án của bạn lọt ra ngoài theo đường này:
- Truy vấn chỉ gửi tới dịch vụ tìm kiếm mà quản trị viên chọn (hoặc tìm kiếm tích hợp của mô hình), dài tối đa 128 ký tự.
- Nó chỉ đọc những địa chỉ bạn đã viết trong cuộc trò chuyện hoặc do kết quả tìm kiếm trả về, đúng nguyên văn; nó không thể tự nghĩ ra địa chỉ.
- Chỉ đọc: không tải lên hay gửi đi thứ gì.

Ai cũng có thể viết trang web, và trong đó có thể có những chỉ dẫn nhằm đánh lừa tác tử AI. Vì vậy, khi bạn dùng được web, các thay đổi của tác tử AI luôn chờ bạn xem lại, kể cả ở chế độ **Tự động** hay **Toàn quyền**, và nó không xóa hay di chuyển tệp. Các công cụ AI của bạn (MCP) vẫn theo quyền bạn đặt.

## Mô hình và suy nghĩ

- Chọn mô hình ở cuối bảng. Với **Tự động**, ColTex chọn mô hình nhẹ hoặc mạnh tùy theo câu hỏi.
- Với các mô hình có khả năng suy nghĩ, mức suy nghĩ được đặt trong cùng bộ chọn đó; dòng bên dưới ô nhập tin nhắn hiển thị mức này.

## Cuộc trò chuyện và ngữ cảnh

- Các cuộc trò chuyện được lưu cho riêng bạn, theo từng dự án (người khác không bao giờ thấy). **Cuộc trò chuyện mới** bắt đầu một cuộc khác; **Cuộc trò chuyện** liệt kê các cuộc trước: mở, đổi tên hoặc xóa chúng. Mở lại một cuộc trò chuyện sẽ tiếp tục từ chỗ đã dừng; bản nháp chưa được áp dụng sẽ không được giữ, nên khi rời khỏi một cuộc trò chuyện có bản nháp, bạn sẽ được hỏi trước.
- Vòng tròn bên dưới ô nhập tin nhắn cho biết cuộc trò chuyện đang dùng bao nhiêu phần cửa sổ ngữ cảnh của mô hình (vd. `12k / 200k`). Nó chuyển sang màu hổ phách ở mức 70% và màu đỏ ở mức 90%.
- Nếu nhóm AI của bạn có giới hạn mức dùng, một thanh bên cạnh cho biết bạn đã dùng bao nhiêu trong ngày, tuần hoặc tháng này (di chuột qua để xem chi tiết). Khi đạt giới hạn, tin nhắn phải chờ đến chu kỳ tiếp theo. **Cài đặt → Tác tử AI** hiển thị mức dùng của bạn trong 30 ngày qua và phần còn lại.
- Gõ `/` trong ô nhập tin nhắn để dùng lệnh:
  - `/compact`: tóm tắt cuộc trò chuyện đến lúc này và tiếp tục từ bản tóm tắt, giải phóng ngữ cảnh. Các tin nhắn vẫn hiển thị; tác tử AI nhớ chúng qua bản tóm tắt.
  - `/new`: bắt đầu cuộc trò chuyện mới.
  - `/chats`: các cuộc trò chuyện trước.
- Ô nhập tin nhắn cao dần theo nội dung bạn gõ. Kéo mép trên để làm nó cao hơn (được ghi nhớ trong trình duyệt này, cả trong trò chuyện dự án); nhấp đúp vào mép để trở lại như cũ.

## Skill

Skill là một bộ hướng dẫn cho một công việc bạn làm đi làm lại, ví dụ “rút gọn tóm tắt cho vừa giới hạn của tạp chí” hoặc “kiểm tra mọi hình đều được tham chiếu”. Skill dùng định dạng Agent Skills (một tệp `SKILL.md` gồm tên, mô tả và hướng dẫn), nên các skill viết cho tác tử AI khác cũng dùng được ở đây.

- **Skill của bạn** nằm trong **Cài đặt → Skill AI**; chỉ bạn thấy chúng, và bạn có thể dùng chúng trong mọi dự án.
- Thêm các skill bạn đã có bằng **Nhập**: **Tải tệp lên** nhận một tệp `SKILL.md` cùng các tệp tham khảo của nó, hoặc một tệp `.zip` chứa các thư mục skill; **Tải thư mục lên** nhận thư mục của một skill, hoặc một thư mục chứa nhiều skill. Các script trong skill được giữ dưới dạng văn bản để tác tử AI đọc; không có gì trong skill bị chạy.
- Dùng một skill bằng cách gõ `/` và chọn nó, rồi thêm tin nhắn của bạn (`/polish-abstract keep it under 200 words`). Tác tử AI cũng đọc phần mô tả và tự nạp một skill khi yêu cầu của bạn phù hợp.
- Hãy nhờ tác tử AI biến một việc thành skill (“lưu cách chúng ta vừa sửa tài liệu tham khảo thành một skill”): nó soạn nháp skill trong cuộc trò chuyện, và bạn sửa hoặc lưu vào skill của bạn.
- Trong **Cài đặt → Skill AI**, các skill của bạn được liệt kê ở bên trái; chọn một skill để đọc hướng dẫn và tệp tham khảo của nó, hoặc **Tạo bằng AI** để mở cuộc trò chuyện với tác tử AI nhằm viết skill (**Cải thiện trong cuộc trò chuyện** trên một skill của bạn sẽ bắt đầu một tin nhắn về skill đó). Cuộc trò chuyện làm theo skill tích hợp sẵn **skill-creator**: nó hỏi bạn sẽ dùng skill ra sao, soạn nháp skill (kèm tệp tham khảo khi hữu ích), và có thể thử bản nháp trên đoạn văn bản bạn dán vào. Bản nháp chỉ được lưu khi bạn lưu; lưu với một tên bạn đã dùng sẽ hỏi trước khi thay thế. Cuộc trò chuyện được giữ cho đến khi bạn bắt đầu cuộc mới.
- ColTex có sẵn các skill tích hợp (liệt kê trong **Tích hợp sẵn**). Bạn có thể đọc và tải chúng xuống nhưng không thay đổi được; một skill của riêng bạn trùng tên sẽ được dùng thay thế.
  - **skill-creator**: viết skill (cuộc trò chuyện về skill làm theo nó).
  - **template-conversion**: hoàn tất việc chuyển mẫu: hỏi tạp chí hoặc hội nghị, tra cứu hướng dẫn tác giả và chỉnh bài cho phù hợp (**Mở và sửa bằng AI** sau khi chuyển sẽ dùng nó).

## Công cụ AI của riêng bạn (MCP)

Các công cụ AI như Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, Gemini CLI, Cline hay OpenCode có thể làm việc trực tiếp trên các dự án của bạn: liệt kê dự án, đọc và tìm trong tệp, chỉnh sửa tệp, biên dịch và đọc nhật ký, xem lịch sử, và đọc, thêm, trả lời bình luận. ColTex là một máy chủ MCP cho chúng, với một địa chỉ duy nhất cho mọi dự án của bạn; công cụ nêu tên dự án mà nó làm việc.

Trong **Cài đặt → Tác tử AI**, ở mục **Công cụ AI của bạn (MCP)**, chọn công cụ của bạn ở bên trái và làm theo ba bước: địa chỉ, một token (**Tạo token**; token chỉ hiện một lần), và cấu hình để sao chép, với cả hai đã được điền sẵn. Bất kỳ công cụ nào khác kết nối tới máy chủ MCP qua HTTP với một header chứa token cũng dùng được (**Khác**). Các ứng dụng chỉ chấp nhận máy chủ đăng nhập qua OAuth (như custom connector của Claude hoặc ChatGPT) hiện chưa kết nối được.

Những gì công cụ của bạn được phép thay đổi theo quyền của bạn trong **Cài đặt → Tác tử AI**:

- **Thủ công** (mặc định): chỉnh sửa của chúng trở thành đề xuất của bạn, mà bạn và cộng tác viên chấp nhận hoặc từ chối trong **Duyệt**. Tệp mới được tạo trực tiếp.
- **Tự động**: chỉnh sửa của chúng được áp dụng trực tiếp, như của chính bạn. Nếu theo dõi thay đổi đang bật cho bạn, chúng vẫn là đề xuất.
- **Toàn quyền**: như Tự động, và chúng còn có thể xóa, di chuyển và đổi tên tệp.

Trước thay đổi đầu tiên của một công cụ sau một khoảng thời gian, trạng thái của dự án được lưu thành một phiên bản, để bạn có thể quay lại. Công cụ của người duyệt chỉ có thể đề xuất thay đổi, công cụ của người xem chỉ có thể đọc và bình luận.

### An toàn

- Bất kỳ ai có token của bạn đều hành động với tư cách là bạn: hãy giữ nó như mật khẩu, và thu hồi nó trong danh sách token khi không còn cần (mỗi công cụ hoặc máy tính một token sẽ giúp việc này dễ dàng). Khi tạo, hãy chỉ cấp cho mỗi token những gì nó cần:
  - **Dùng cho**: Git, MCP, hoặc cả hai. Token chỉ tạo cho MCP không thể clone hay push, và ngược lại.
  - **Quyền truy cập**: **Chỉ đọc** cho phép công cụ liệt kê, đọc, tìm kiếm và biên dịch, nhưng không thay đổi tệp hay bình luận (và cho phép git clone và pull, không cho push), bất kể quyền của bạn là gì.
  - **Dự án**: tất cả dự án của bạn, hoặc chỉ những dự án bạn chọn; với token, các dự án khác coi như không tồn tại.
  - **Hết hạn**: sau 30 ngày, 90 ngày, một năm, hoặc không bao giờ. Token đã hết hạn sẽ ngừng hoạt động; hãy thu hồi nó và tạo token mới.
- ColTex chỉ trả lời công cụ của bạn; nó không bao giờ kết nối tới các máy chủ MCP khác. Công cụ của bạn còn làm được gì khác (một trình duyệt qua Playwright MCP, một terminal, các dịch vụ khác) là do công cụ và cài đặt của chính nó quyết định. Văn bản, bình luận và nhật ký của một dự án có thể do cộng tác viên của bạn viết, nên một công cụ đọc chúng có thể bị yêu cầu, ngay trong văn bản đó, làm điều gì đó bằng các khả năng khác của nó. ColTex yêu cầu các công cụ coi nội dung dự án là nội dung, không phải chỉ dẫn, nhưng chỉ công cụ của bạn mới thực thi được điều đó: hãy giữ bật các bước xác nhận của chính công cụ cho những thao tác bên ngoài ColTex, và dùng **Thủ công** khi công cụ còn có trình duyệt hoặc terminal.
- Một công cụ có trình duyệt đã đăng nhập vào ColTex sẽ hành động với toàn bộ quyền của bạn qua các trang web, không qua MCP, nên quyền ở trên không giới hạn nó ở đó. Hãy để những công cụ như vậy dùng một hồ sơ trình duyệt chưa đăng nhập.
