# Tệp

## Cây thư mục

- Các nút ở đầu cây: tệp mới, thư mục mới, tải lên, và thêm tệp liên kết.
- Kéo một tệp vào thư mục để di chuyển nó; nhấp đúp vào tên để đổi tên. Các tệp được thả từ máy tính của bạn sẽ được tải lên.
- Nhấp chuột phải vào tệp hoặc thư mục để tạo, tải lên, đổi tên hoặc xóa.
- Một chấm màu cạnh tệp nghĩa là có người khác đang mở tệp đó.

Các tệp đã xóa có thể được lấy lại từ lịch sử.

## Tệp liên kết

Tệp liên kết đến từ nơi khác và có thể được làm mới từ nguồn của nó bất cứ lúc nào:

- **Từ dự án khác**: bất kỳ tệp nào của một dự án khác, hoặc PDF đã biên dịch của dự án đó (được biên dịch trước). Hữu ích cho hình dùng chung hoặc tệp `.bib` dùng chung, hoặc để dùng PDF của một dự án làm hình trong dự án khác.
- **Từ URL**: tải xuống từ một địa chỉ công khai (tối đa 50 MB). Không dùng được các địa chỉ trong mạng cục bộ hoặc mạng riêng.

> Tệp liên kết có dấu liên kết trong cây thư mục; di chuột qua để xem nguồn của nó. Nhấp chuột phải và chọn **Làm mới tệp liên kết** để tải lại và thay thế tệp. Muốn thêm hoặc làm mới, bạn phải có quyền truy cập dự án nguồn.

## Git

Mọi dự án đều có thể được clone, pull và push bằng git:

1. Tạo một token cho Git trong **Cài đặt → Dịch vụ đồng bộ** (token chỉ hiện một lần; hãy cất giữ). Token **Chỉ đọc** có thể clone và pull nhưng không push được.
2. Sao chép địa chỉ clone từ cài đặt dự án và chạy `git clone <address>`. Khi git hỏi, hãy dùng tên người dùng bất kỳ và token làm mật khẩu.
3. Commit cục bộ rồi `git push`: các thay đổi vào dự án ngay lập tức, nơi các cộng tác viên nhìn thấy chúng.

Cần biết:

- Mỗi dự án có một nhánh duy nhất, `main`.
- Nếu có người thay đổi dự án kể từ lần pull gần nhất của bạn, git sẽ từ chối push: hãy `git pull` trước, rồi push lại.
- Trước khi một lần push được áp dụng, trạng thái của dự án được lưu thành một phiên bản.
- Người duyệt và người xem không push được.
- Để khỏi phải gõ token mỗi lần: `git config --global credential.helper store` (hoặc `osxkeychain` trên Mac).
