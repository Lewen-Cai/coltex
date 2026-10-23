# Lịch sử

**Lịch sử** ở phía trên trình soạn thảo mở chế độ xem lịch sử. Nó hoạt động giống git log: mỗi phiên bản có một mã ngắn (như `a1b2c3d`), một mô tả, thời điểm tạo và người tạo.

- Các phiên bản được ghi lại tự động sau một quãng ngừng soạn thảo, kèm người đã thực hiện thay đổi.
- **Lưu phiên bản** ghi lại trạng thái hiện tại ngay lúc đó, với mô tả của bạn (như một commit message). Nếu không có gì thay đổi kể từ phiên bản trước, mô tả sẽ trở thành nhãn của phiên bản đó.
- Chọn một phiên bản để xem nó đã thay đổi những tệp nào và thay đổi ra sao, hoặc so sánh nó với dự án hiện tại.
- **Hoàn nguyên các thay đổi này** chỉ hoàn tác những gì phiên bản đó đã thay đổi và giữ mọi thay đổi sau đó (như `git revert`). Nếu một tệp đã bị thay đổi lại theo cách xung đột, sẽ không có gì bị thay đổi và tên tệp đó được nêu ra.
- **Khôi phục dự án** đưa mọi tệp về như ở phiên bản đó; các tệp được thêm sau đó sẽ bị xóa. **Khôi phục tệp này** làm điều tương tự cho một tệp.
- Hoàn nguyên và khôi phục là những phiên bản riêng (“Hoàn nguyên a1b2c3d”, “Trở về a1b2c3d”; nhấp vào mã để đến phiên bản đó), nên cũng có thể được hoàn tác.
- **Thêm nhãn** đặt tên cho một phiên bản (vd. “Đã nộp”) để bạn dễ tìm lại sau này.
- Tệp của bất kỳ phiên bản nào cũng có thể được tải xuống dưới dạng .zip.

> Một phiên bản cũng được lưu trước khi áp dụng thay đổi của AI, trước khi thay thế trên toàn dự án, trước một lần git push, một lần hoàn nguyên và một lần khôi phục.
