# Bắt đầu

ColTex là trình soạn thảo LaTeX cộng tác chạy trên máy chủ của riêng bạn. Cách dùng rất giống Overleaf: mã nguồn ở bên trái, PDF ở bên phải, và nhiều người có thể cùng chỉnh sửa một dự án cùng lúc.

## Dự án mới

Nhấp **Dự án mới** ở góc trên bên trái, đặt tên và chọn một mẫu:

| Mẫu | Lớp |
| --- | --- |
| Bài báo trống | Lớp `article` tiêu chuẩn, cách bắt đầu đơn giản nhất |
| Bản tiền ấn phẩm arXiv | `article`, một cột, tác giả kèm đơn vị công tác (authblk), tài liệu tham khảo natbib |
| Hội nghị IEEE / Tạp chí IEEE | `IEEEtran` ở chế độ hội nghị / tạp chí |
| Hội nghị ACM / Tạp chí ACM | `acmart` sigconf / acmsmall |
| Springer LNCS | `llncs`, cho LNCS và các kỷ yếu khác của Springer |
| Tạp chí Elsevier | `elsarticle`, bản tiền ấn phẩm một cột |
| APS (REVTeX 4.2) | `revtex4-2`, cho các tạp chí Physical Review và AIP |

Trừ bài báo trống, mỗi mẫu đều có sẵn tóm tắt, từ khóa, một công thức, một hình, một bảng và một tệp `references.bib`, và biên dịch được ngay. Các lớp đều là lớp chính thức đi kèm TeX Live. Những hội nghị phát hành tệp style mới mỗi năm (NeurIPS, ICML) không có trong TeX Live: hãy tải tệp của năm đó lên một dự án rồi xuất bản dự án đó thành mẫu.

Các dự án mà mọi người đã xuất bản thành mẫu (chẳng hạn định dạng luận văn của một nhóm) được liệt kê trong mục “Được chia sẻ trên máy chủ này”.

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
