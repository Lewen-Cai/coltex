# Quản trị

Quản trị viên hệ thống thấy các trang Quản trị trong **Cài đặt** ở menu ảnh đại diện; quản trị viên thấy **Quản lý người dùng** và **Lời mời** ở đó, cho nhóm của chính họ.

## Người dùng và lời mời

- Không có đăng ký công khai: tài khoản chỉ được tạo từ liên kết mời, và dự án chỉ được chia sẻ với những người có tài khoản.
- Mỗi tài khoản có một trong ba vai trò:
  - **Thành viên**.
  - **Quản trị viên**: dẫn dắt một **nhóm**, chẳng hạn một người hướng dẫn và các sinh viên của họ. Những thành viên mà quản trị viên mời sẽ vào nhóm của quản trị viên đó, và quản trị viên chỉ quản lý những người này.
  - **Quản trị viên hệ thống**: chỉ có đúng một, là tài khoản được tạo khi thiết lập lần đầu. Tài khoản này vận hành toàn bộ phiên bản cài đặt (dịch vụ AI, sao lưu, mạng) và thấy tất cả mọi người. Không ai có thể được đặt làm quản trị viên hệ thống thứ hai, nên một tài khoản quản trị viên không thể chiếm quyền phiên bản cài đặt.
- **Lời mời**: liên kết dùng một lần, cho một email hoặc (khi để trống email) cho bất kỳ ai có liên kết, có thời hạn. Các liên kết của một lời mời đang chờ vẫn nằm trong danh sách (**Liên kết**), mỗi địa chỉ mà ColTex có thể được truy cập một liên kết (LAN, Tailscale, Cloudflare). Quản trị viên hệ thống mời thành viên hoặc quản trị viên và chọn **Nhóm AI** cho tài khoản mới. Quản trị viên chỉ mời thành viên, vào nhóm của chính họ; những thành viên này nhận nhóm AI của quản trị viên. Quản trị viên chỉ thấy và thu hồi lời mời của chính mình.
- **Quản lý người dùng**: quản trị viên hệ thống thấy mọi tài khoản, đặt người khác làm thành viên hoặc quản trị viên, chuyển thành viên giữa các nhóm (**Nhóm** trong menu của hàng), đặt lại mật khẩu, và tạm khóa hoặc xóa tài khoản. Quản trị viên thấy chính mình và nhóm của mình, và chỉ đặt lại mật khẩu, tạm khóa hoặc xóa thành viên trong nhóm mình. Xóa một tài khoản sẽ xóa các dự án mà tài khoản đó sở hữu.
- Để chuyển vai trò quản trị viên hệ thống cho người khác (hoặc lấy lại khi mất tài khoản đó), hãy chạy `coltex cli system-admin <email>` trên máy chủ; quản trị viên hệ thống trước đó sẽ trở thành quản trị viên.
- Quên mật khẩu, kể cả mật khẩu của quản trị viên hệ thống? Hãy chạy `coltex cli reset-password <email>` trên máy chủ: lệnh sẽ yêu cầu nhập mật khẩu mới hai lần và đăng xuất tài khoản đó ở mọi nơi.

## Dịch vụ AI

- **Dịch vụ AI**: kết nối nhà cung cấp bằng khóa API hoặc đăng nhập gói đăng ký (Claude Pro/Max, ChatGPT, Copilot…), hoặc máy chủ tương thích OpenAI của riêng bạn (Ollama, vLLM, LM Studio…). Khóa được lưu mã hóa, thành viên không bao giờ thấy chúng, và các yêu cầu đi qua máy chủ này.
- Nếu đăng nhập gói đăng ký kết thúc ở một địa chỉ localhost không tải được, hãy sao chép toàn bộ địa chỉ đó từ thanh địa chỉ và dán lại vào ColTex.
- Đặt ba mô hình của **Tự động** thì mọi người sẽ bắt đầu với chế độ tự động chọn: mô hình **phân loại** (một mô hình rẻ và nhanh) đọc từng tin nhắn rồi giao cho mô hình **nhẹ** (câu hỏi nhanh, sửa nhỏ) hoặc mô hình **mạnh** (nhiều lỗi, thay đổi trên nhiều tệp, viết cẩn thận). Cho đến khi đặt đủ cả ba, mọi người bắt đầu với mô hình đầu tiên mà họ được dùng.
- **Mức dùng & quyền truy cập AI**: số yêu cầu và token của cả nhóm và của từng người. Ai được dùng mô hình nào được đặt bằng **Nhóm AI**: mỗi nhóm cho phép một số nhà cung cấp (kể cả các mô hình được thêm sau này) hoặc từng mô hình riêng lẻ, vd. “Nghiên cứu sinh” với mô hình mạnh và “Sinh viên đại học” với mô hình nhẹ. Mỗi người thuộc tối đa một nhóm, được chọn trong lời mời hoặc sau đó bằng cách mở người đó trong danh sách. Người không thuộc nhóm nào thì không dùng được tác tử AI, nên người mới không có AI cho đến khi quản trị viên hệ thống thêm họ vào nhóm (thành viên do quản trị viên mời sẽ nhận nhóm của quản trị viên đó). Quản trị viên hệ thống luôn có thể dùng mọi mô hình. Xóa một nhóm sẽ khiến các thành viên của nó không có AI cho đến khi họ vào nhóm khác.

  Một nhóm cũng có thể giới hạn mức dùng của mỗi thành viên theo ngày, tuần hoặc tháng: theo token, chi phí (theo giá niêm yết), hoặc cả hai. Khi một thành viên đã đạt giới hạn, tin nhắn sẽ bị từ chối cho đến khi chu kỳ tiếp theo bắt đầu (ngày theo lịch, tuần bắt đầu từ thứ Hai, tháng, theo múi giờ của máy chủ); tin nhắn làm vượt giới hạn vẫn được hoàn tất. Thành viên thấy mức đã dùng bên dưới ô nhập tin nhắn của tác tử AI. Quản trị viên hệ thống không bị giới hạn.

  Để điều chỉnh riêng cho một người, hãy mở người đó trong danh sách: trong **Tùy chỉnh**, **Quyền dùng mô hình riêng** và **Giới hạn mức dùng riêng** thay thế thiết lập của nhóm khi được bật (quyền dùng riêng hoạt động cả khi không có nhóm). Danh sách đánh dấu những người này là **Đã tùy chỉnh**.

## Lưu trữ và sao lưu

- Tệp dự án được lưu trên ổ đĩa cục bộ hoặc trong bộ lưu trữ tương thích S3, đặt khi máy chủ khởi động (`STORAGE` và `S3_*`). Lịch sử, kết quả biên dịch và bản sao làm việc của trình biên dịch nằm trong thư mục dữ liệu.
- **Sao lưu WebDAV** được gửi tới một thư mục trên Nextcloud, ownCloud, NAS hoặc bất kỳ máy chủ WebDAV nào. Mỗi bản sao lưu là một tệp chứa cơ sở dữ liệu, tệp của mọi dự án và lịch sử của chúng. Hãy lên lịch sao lưu hằng ngày hoặc hằng tuần và chọn số bản cần giữ. Dùng mật khẩu ứng dụng nếu máy chủ hỗ trợ.
> **Mã hóa**: bản sao lưu mã hóa (AES-256) còn chứa khóa bí mật của phiên bản cài đặt, nên các dịch vụ AI đã kết nối vẫn hoạt động sau khi khôi phục. **Hãy cất mật khẩu ở nơi khác: không có nó thì không thể mở bản sao lưu.**
- Việc khôi phục được thực hiện trên máy chủ bằng lệnh `restore` khi máy chủ đã dừng; xem hướng dẫn vận hành.

## Giám sát

**Tổng quan** hiển thị trạng thái trực tiếp của máy chủ, trình biên dịch và cơ sở dữ liệu, kèm biểu đồ lịch sử cho CPU, bộ nhớ và các lần biên dịch. Máy chủ lấy mẫu mỗi 10 giây và giữ dữ liệu 30 ngày, kể cả khi không ai mở trang.

## Mạng

**Mạng** liệt kê các địa chỉ mà ColTex được truy cập (lời mời và địa chỉ Git dùng các địa chỉ này), bật Tailscale và Cloudflare Tunnel tích hợp sẵn, và cho thấy các yêu cầu tới máy chủ bằng cách nào. Xem [Triển khai và mạng](#/help/deployment).
