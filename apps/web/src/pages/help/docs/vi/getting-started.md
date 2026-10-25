# Bắt đầu

ColTex là trình soạn thảo LaTeX cộng tác chạy trên máy chủ của riêng bạn. Cách dùng rất giống Overleaf: mã nguồn ở bên trái, PDF ở bên phải, và nhiều người có thể cùng chỉnh sửa một dự án cùng lúc.

## Dự án mới

Nhấp **Dự án mới** ở góc trên bên trái, đặt tên và chọn một mẫu:

| Lĩnh vực | Mẫu |
| --- | --- |
| Chung | Bài báo trống, Bản tiền ấn phẩm arXiv, Tạp chí Elsevier, Tạp chí Elsevier (tác giả–năm), Tạp chí Elsevier (hai cột), Tạp chí Elsevier CAS (hai cột), Nature, Bài tổng quan, Thông báo ngắn |
| Máy tính và kỹ thuật điện | Hội nghị IEEE, Tạp chí IEEE, Hội nghị IEEE Computer Society, Tạp chí IEEE Computer Society, Tạp chí IEEE Communications Society, Hội nghị ACM, Tạp chí ACM, Bài nộp ACM (ẩn danh), Hội nghị ACM SIGPLAN, ACM Transactions on Graphics, Springer LNCS, Kỷ yếu PMLR |
| Kỹ thuật | Hội nghị ASME, Tạp chí ASCE, Bài hội nghị AIAA, Kỷ yếu SPIE |
| Vật lý | APS (REVTeX 4.2), Physical Review Letters, Tạp chí AIP, Journal of the Physical Society of Japan, Bài hội nghị JACoW |
| Thiên văn học | Tạp chí AAS (AASTeX), Monthly Notices of the RAS |
| Hóa học | Bài tạp chí ACS, Letter ACS |
| Khoa học sự sống | Bài nghiên cứu khoa học sự sống, Ghi chú ứng dụng tin sinh học |
| Y học | Báo cáo thử nghiệm lâm sàng, Đề cương thử nghiệm lâm sàng, Nghiên cứu quan sát, Nghiên cứu độ chính xác chẩn đoán, Tổng quan hệ thống và phân tích gộp, Báo cáo ca bệnh, Thư nghiên cứu y học, Tạp chí Elsevier CAS, Tạp chí của Oxford University Press |
| Toán và thống kê | Bài báo AMS, Kỷ yếu AMS, Annals of Mathematics, Bài phương pháp thống kê |
| Kinh tế | Bài kinh tế học (kiểu AEA), Bài kinh tế lượng |
| Khoa học xã hội và nhân văn | Bản thảo APA 7, Bố cục tạp chí APA 7, Bài sinh viên APA 7, Bài nhân văn (chú thích Chicago), Tiểu luận văn học (MLA), Bài luật học (OSCOLA) |
| Trái Đất và môi trường | Bài khoa học Trái Đất (kiểu AGU), Nghiên cứu thực địa sinh thái, Tạp chí Canadian Science Publishing |

Ngoài bài viết trống, mỗi mẫu đều có tóm tắt, các mục ví dụ và một tệp `references.bib`, và biên dịch được ngay. Các lớp đều là lớp chính thức có trong TeX Live. Nhiều mẫu nổi tiếng của tạp chí và hội nghị không được tích hợp sẵn; [Mẫu](#/help/templates) giải thích lý do và cách thêm chúng.

Các nút phía trên các mẫu hiện mẫu của một lĩnh vực. Mẫu được chia sẻ với bạn (ví dụ định dạng luận văn của một nhóm) nằm trong cùng danh sách, có nhãn cho biết ai đã chia sẻ; xem [Mẫu](#/help/templates).

Dự án mới biên dịch với **Tự động**: trình biên dịch được chọn ở mỗi lần biên dịch dựa trên tài liệu; xem [Biên dịch và PDF](#/help/compiling).

Để chuyển một dự án từ Overleaf sang, hãy chọn **Download Source** ở đó rồi **Nhập** tệp zip ở đây (tối đa 200 MB). Tài liệu chính được tự động phát hiện, và trình biên dịch cũng là Tự động. Các tệp biên dịch do trình soạn thảo khác để lại (`.aux`, `.log`, `.synctex.gz` và tương tự) cùng các thư mục như `.vscode` sẽ được bỏ qua, giống như trên Overleaf; tệp `latexmkrc` và `.bbl` được giữ lại.

## Trình soạn thảo

- **Phía trên**: tên dự án, những ai đang có mặt, **Lịch sử** và **Chia sẻ**.
- **Thanh bên trái**: chuyển bảng bên trái giữa tệp, tìm kiếm, tài liệu tham khảo, duyệt, trò chuyện và AI; phím tắt và cài đặt dự án nằm ở cuối thanh.
- **Ở giữa**: trình soạn thảo, với **Mã / Trực quan** trên thanh công cụ.
- **Bên phải**: PDF, với **Biên dịch lại**, **Nhật ký**, nút đến vị trí trong PDF, mở trong cửa sổ mới và tải xuống.

## Biên dịch và PDF

- Nhấp **Biên dịch lại** hoặc nhấn `Mod+S` / `Mod+Enter`. Tự động biên dịch được bật sẵn và sẽ biên dịch khi bạn ngừng gõ.
- **Nhật ký** hiển thị số lỗi; mở ra để xem từng lỗi kèm giải thích, và nhấp vào một lỗi để nhảy tới dòng của nó. Lỗi cũng được đánh dấu cạnh số dòng trong trình soạn thảo.
- **Mã nguồn ↔ PDF**: khi con trỏ ở trong mã nguồn, nhấp vào biểu tượng tâm ngắm trên thanh PDF và PDF sẽ cuộn tới vị trí đó; nhấp đúp vào PDF để quay lại mã nguồn.
- **PDF trong cửa sổ riêng**: “Mở PDF trong cửa sổ mới” trên thanh PDF cho phép bạn đặt PDF sang màn hình khác trong khi trình soạn thảo chiếm trọn cửa sổ của nó. Xem [Biên dịch và PDF](#/help/compiling).

## Tiếp theo

- [Trình soạn thảo](#/help/editor): hai chế độ, bảng và hình, xem trước công thức, kiểm tra chính tả, menu chuột phải.
- [Cộng tác](#/help/collaboration): mời người khác, bình luận, theo dõi thay đổi, trò chuyện.
- [Tác tử AI](#/help/ai): giải thích và chỉnh sửa, chỉ được áp dụng sau khi bạn xem xét.
