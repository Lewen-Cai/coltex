# Biên dịch và PDF

## Trình biên dịch và tài liệu chính

Cài đặt dự án có **Trình biên dịch** và **Tài liệu chính**:

- **Tự động** (mặc định cho dự án mới): được chọn ở mỗi lần biên dịch dựa trên tài liệu. XeLaTeX khi phần mở đầu (cùng các tệp nó `\input` và các tệp `.sty`/`.cls` riêng của dự án) nạp `ctex`, `xeCJK`, `fontspec`, `unicode-math` và các gói tương tự, hoặc lớp là `ctexart`/`ctexbook` v.v.; LuaLaTeX khi nó nạp `luacode` hoặc `luatexja`; còn lại là pdfLaTeX. Một dòng đầu tiên `% !TEX program = xelatex`, hoặc một tệp `latexmkrc` trong dự án, sẽ quyết định thay.
- **pdfLaTeX**: lựa chọn thông thường cho tài liệu tiếng Anh.
- **XeLaTeX**: cần cho tiếng Trung (ctex) và phông chữ hệ thống.
- **LuaLaTeX**: cũng hỗ trợ phông chữ hệ thống.

Khi chọn một trình biên dịch cụ thể, trình đó luôn được dùng, không tự phát hiện.

> Với tiếng Trung, hãy nạp `\usepackage[UTF8]{ctex}` (hoặc dùng lớp `ctexart`) và Tự động sẽ chuyển sang XeLaTeX. Văn bản tiếng Trung không có ctex sẽ lỗi dưới pdfLaTeX với thông báo “Unicode character … not set up for use with LaTeX”.

Tài liệu chính là tệp mà một lần biên dịch bắt đầu từ đó; chọn nó ở **Tài liệu chính** trong cài đặt dự án.

Việc biên dịch dùng TeX Live đầy đủ với latexmk, công cụ chạy LaTeX, BibTeX/Biber và tạo chỉ mục bao nhiêu lần cần thiết. Quá trình biên dịch chạy cách ly, không có truy cập mạng, và shell escape bị hạn chế.

## Tùy chọn biên dịch

Mũi tên cạnh **Biên dịch lại** có:

- **Tự động biên dịch**: biên dịch khi bạn ngừng gõ (mỗi dự án chỉ một lần biên dịch tại một thời điểm, dù bao nhiêu người đang gõ).
- **Chế độ biên dịch**: Bình thường hoặc Nhanh [nháp]. Chế độ nháp bỏ qua hình ảnh và nhanh hơn.
- **Xử lý lỗi biên dịch**: dừng ở lỗi đầu tiên, hoặc cố biên dịch dù có lỗi.
- **Xóa bộ nhớ đệm và biên dịch lại**: khi kết quả biên dịch có vẻ sai, xóa các tệp phụ trợ và biên dịch lại từ đầu.

Các tùy chọn này được lưu theo từng dự án trong trình duyệt này.

## Nhật ký

Con số trên **Nhật ký** là số lỗi. Nhật ký liệt kê lỗi, cảnh báo và các vấn đề dàn trang:

- mỗi mục có thông báo LaTeX, và với các vấn đề thường gặp còn có giải thích (chẳng hạn thiếu gói thì nêu tên gói cần thêm);
- nhấp vào một mục để nhảy tới tệp và dòng của nó;
- nhật ký gốc cũng có ở đó, và AI có thể giải thích hoặc sửa các lỗi.

> Khi biên dịch thất bại, PDF của lần biên dịch thành công gần nhất vẫn được giữ trên màn hình.

## Giữa mã nguồn và PDF

- **Mã nguồn → PDF**: khi con trỏ ở trong mã nguồn, nhấp **Định vị** trên thanh PDF (hoặc “Đến vị trí trong PDF” trong menu chuột phải); PDF sẽ cuộn tới đó và tô sáng vị trí.
- **PDF → mã nguồn**: nhấp đúp vào PDF; trình soạn thảo mở tệp tại dòng đó.

## Bố cục: trình soạn thảo, PDF hoặc cả hai

Bộ chuyển chế độ xem (bốn nút nhỏ ở bên phải thanh PDF) hiển thị **Chỉ trình soạn thảo**, **Trình soạn thảo & PDF** cạnh nhau hoặc **Chỉ PDF**, như trong Overleaf, còn nút thứ tư mở PDF trong cửa sổ mới; trình duyệt này ghi nhớ lựa chọn. Kéo đường phân cách hết sang một bên cũng sẽ ẩn khung bên đó.

- Khi chỉ có trình soạn thảo, **Biên dịch lại** và bộ chuyển đó nằm ở cuối thanh công cụ của trình soạn thảo.
- **Đến vị trí trong PDF** từ trình soạn thảo sẽ hiện PDF khi nó đang ẩn.
- Trong cửa sổ hẹp (máy tính bảng hoặc điện thoại) chỉ đủ chỗ cho một khung tại một thời điểm, và các bảng bên (tệp, tìm kiếm…) sẽ che trình soạn thảo khi mở.

## PDF trong cửa sổ riêng

**Mở PDF trong cửa sổ mới** (nút cuối của bộ chuyển chế độ xem) mở PDF trong một cửa sổ riêng mà bạn có thể chuyển sang màn hình khác:

- Cửa sổ trình soạn thảo bỏ khung PDF và trình soạn thảo chiếm trọn cửa sổ; **Biên dịch lại** chuyển xuống cuối thanh công cụ của trình soạn thảo.
- Cửa sổ PDF có Biên dịch lại, Nhật ký, đến vị trí trong PDF và tải xuống. Nhấp đúp vào PDF ở đó sẽ nhảy tới mã nguồn trong cửa sổ trình soạn thảo.
- **Hiện PDF tại đây** trên thanh công cụ của trình soạn thảo, hoặc đóng cửa sổ, sẽ đưa khung PDF trở lại.

## Tải xuống

- Thanh PDF tải xuống PDF hiện tại.
- Nút tải xuống ở đầu cây thư mục tải các tệp mã nguồn của dự án dưới dạng .zip.
- Trong danh sách dự án, menu của một dự án (⋯) có **Tải xuống PDF**, sẽ biên dịch dự án trước, và **Tải xuống .zip** cho toàn bộ tệp mã nguồn.

## Xuất sang Word

Một số tạp chí chỉ nhận tệp Word. **Xuất sang Word…** trong menu của dự án (⋯) ở danh sách dự án, hoặc trong **Thao tác** của cài đặt dự án, chuyển dự án thành tệp .docx.

- Trang tiêu đề lấy từ chính tài liệu: tiêu đề, tác giả, đơn vị công tác, tác giả liên hệ, tóm tắt và từ khóa, với các lớp mà tính năng chuyển mẫu đọc được (Springer Nature `sn-jnl`, Elsevier, Elsevier CAS, OUP, BMC, IEEE, ACM, LNCS, REVTeX, `article`).
- Công thức toán trở thành phương trình Word. Word đánh số hình và bảng, hình PDF và EPS được chuyển thành ảnh, còn phương trình có số vẫn giữ số của mình nên `\eqref` vẫn trỏ đúng.
- **Kiểu trích dẫn**: **Giống tài liệu** theo kiểu tài liệu tham khảo mà tài liệu đang dùng. Bạn cũng có thể chọn APA, Vancouver, AMA, IEEE, Nature hoặc Chicago, hay một tệp `.csl` đã tải lên dự án.
- **Mẫu Word**: tải mẫu Word (`.docx`) của tạp chí lên dự án rồi chọn ở đây; tài liệu sẽ dùng các kiểu định dạng của mẫu đó. Mục này chỉ hiện khi dự án có tệp `.docx`.
- Hãy kiểm tra kết quả trước khi gửi: macro tự định nghĩa và bảng phức tạp có thể cần chỉnh lại trong Word. Hình vẽ TikZ không được chuyển đổi: hãy biên dịch chúng thành ảnh rồi chèn ảnh đó vào.
