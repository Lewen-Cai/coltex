# Cài đặt

Nhấp vào ảnh đại diện của bạn ở góc dưới bên trái và chọn **Cài đặt**.

- **Tài khoản**: tên hiển thị của bạn (hiện cho cộng tác viên, trong bình luận và trong lịch sử), màu ảnh đại diện của bạn (cũng là màu con trỏ của bạn trong trình soạn thảo; **Tự động** là màu do ColTex chọn), và mật khẩu của bạn. Khi đổi mật khẩu, bạn có thể đăng xuất trên các thiết bị khác. Mật khẩu cần từ 8 ký tự trở lên, có một chữ hoa, một chữ thường và một chữ số; ký hiệu là không bắt buộc. Mức đánh giá hiện ra khi bạn gõ (yếu, trung bình, khá, mạnh) tăng theo độ dài và ký hiệu. Đăng ký và việc quản trị viên đặt lại mật khẩu cũng theo cùng quy tắc. Chỉ quản trị viên mới đổi được email đăng nhập của bạn. Xác minh 2 bước và hoạt động đăng nhập của bạn cũng nằm trên trang này (xem bên dưới).
- **Giao diện**: chủ đề (Sáng và Tối tông xanh dương, Rừng và Rêu tông xanh lá, Oải hương và Mận tông tím; mặc định là Sáng), và ngôn ngữ giao diện (14 ngôn ngữ, trong đó có English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français và Deutsch; ban đầu theo ngôn ngữ của trình duyệt). Chủ đề tối cũng áp dụng cho trình soạn thảo; các trang PDF vẫn giữ màu trắng. Chủ đề được lưu theo tài khoản của bạn, nên sẽ theo bạn sang các trình duyệt khác (trang đăng nhập luôn dùng Sáng); ngôn ngữ được lưu trong trình duyệt này.
- **Dịch vụ đồng bộ**: kết nối tài khoản Zotero của bạn (xem [Tài liệu tham khảo](#/help/references)), và tạo cũng như thu hồi token git (xem [Tệp](#/help/files)): mỗi token dùng cho Git, MCP hoặc cả hai, đọc và ghi hoặc chỉ đọc, cho tất cả hoặc một số dự án của bạn, có thời hạn. Hãy dùng một token cho mỗi máy tính, để có thể thu hồi riêng từng token.
- **Tác tử AI**: mức dùng AI của bạn trong 7, 30 hoặc 90 ngày qua (yêu cầu, token, chi phí, theo ngày và theo mô hình) và phần còn lại trong giới hạn của bạn (khi bạn có tác tử AI), những gì tác tử AI được phép thay đổi thay bạn (**Quyền**), và kết nối các tác tử AI của riêng bạn qua **MCP**, kèm token của chúng; xem [Tác tử AI](#/help/ai).
- **Skill AI** (khi bạn có tác tử AI): skill của riêng bạn, các skill tích hợp sẵn, và cuộc trò chuyện với tác tử AI để viết skill; xem [Tác tử AI](#/help/ai).

## Xác minh 2 bước

Khi bật xác minh 2 bước, sau mật khẩu, việc đăng nhập sẽ yêu cầu một mã từ ứng dụng xác thực trên điện thoại của bạn (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…). Đây là lựa chọn của riêng bạn; không ai khác bật được thay bạn.

1. Trong **Cài đặt → Tài khoản**, ở mục **Xác minh 2 bước**, nhấp **Bật** và nhập mật khẩu của bạn.
2. Quét mã QR bằng ứng dụng (hoặc nhập khóa thiết lập vào ứng dụng), rồi nhập mã 6 chữ số mà ứng dụng hiển thị.
3. Lưu 10 **mã khôi phục** (sao chép, hoặc tải xuống dưới dạng tệp). Nếu mất điện thoại, mỗi mã giúp bạn đăng nhập một lần thay cho mã từ ứng dụng. Các mã chỉ hiển thị lúc này.

Khi đăng nhập, sau mật khẩu, hãy nhập mã từ ứng dụng, hoặc nhấp **Dùng mã khôi phục**. **Không hỏi lại trên thiết bị này trong 30 ngày** bỏ qua bước nhập mã trong trình duyệt đó. **Tạo mã khôi phục mới** thay thế các mã cũ (hãy cất giữ các mã mới); **Tắt** quay lại chỉ dùng mật khẩu. Token Git và MCP vẫn hoạt động như trước.

> Mất cả điện thoại lẫn mã khôi phục? Quản trị viên hệ thống có thể tắt xác minh 2 bước cho tài khoản của bạn trên máy chủ (`coltex reset-2fa <email>`); sau đó bạn đăng nhập bằng mật khẩu và có thể bật lại.

## Hoạt động đăng nhập

**Hoạt động đăng nhập** ở cuối **Cài đặt → Tài khoản** liệt kê các lần đăng nhập vào tài khoản của bạn, mới nhất trước: thời điểm, kết quả (đã đăng nhập, sai mật khẩu, sai mã, bị từ chối), trình duyệt và hệ điều hành, và địa chỉ cùng vị trí của nó: mạng cục bộ, Tailscale, hoặc với địa chỉ trên internet là quốc gia, vùng, thành phố và nhà mạng. Vị trí được tra từ một cơ sở dữ liệu trên máy chủ; địa chỉ không bao giờ được gửi đi nơi khác để tra cứu. Bản ghi được giữ 90 ngày.

Cài đặt trình soạn thảo (cỡ chữ, màu, Vim…) nằm trong **Cài đặt** ở cuối thanh bên trái của trình soạn thảo; xem [Trình soạn thảo](#/help/editor).
