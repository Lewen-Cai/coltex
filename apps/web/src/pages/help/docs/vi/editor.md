# Trình soạn thảo

## Chế độ mã và chế độ trực quan

**Mã / Trực quan** trên thanh công cụ chuyển cách bạn soạn thảo; cả hai đều chỉnh sửa cùng một mã nguồn LaTeX.

- **Mã**: chính mã nguồn, có tô sáng cú pháp, tự động hoàn thành và ghép cặp dấu ngoặc. Khi con trỏ ở trong công thức, công thức đã dàn trang được hiện phía trên (`Esc` để ẩn).
- **Trực quan**: tiêu đề, chữ đậm, danh sách, công thức, bảng và hình trông như đã dàn trang; mã nguồn hiện ra ở chỗ con trỏ đang đứng. Thích hợp để đọc và chỉnh sửa văn bản.

## Thanh công cụ

Cấp tiêu đề, đậm, nghiêng, công thức, ký hiệu, liên kết, `\ref`, `\cite`, hình, bảng, danh sách và tìm kiếm. Các nút không vừa chỗ sẽ nằm trong menu **⋯**.

- **Ký hiệu** (Σ): chữ cái Hy Lạp, toán tử, mũi tên và nhiều thứ khác theo nhóm; nhấp để chèn.
- **Bảng**: chọn kích thước khi chèn. Ở chế độ trực quan, nhấp vào một bảng để sửa các ô của nó (`Tab` để di chuyển giữa các ô); thanh công cụ của bảng thêm và xóa hàng, cột, gộp ô và đặt căn lề cũng như đường viền.
- **Hình**: tải ảnh lên, chọn một ảnh trong dự án, hoặc dán hay thả ảnh vào trình soạn thảo. Ở chế độ trực quan, nút sửa trên một hình cho phép thay đổi độ rộng, chú thích và nhãn của nó.

## Tự động hoàn thành

Gõ `\` sẽ gợi ý các lệnh; `\ref{` và `\cite{` liệt kê các nhãn và khóa tài liệu tham khảo của dự án. `Ctrl+Space` mở gợi ý bất cứ lúc nào.

## Lỗi

- **Lỗi biên dịch**: các lỗi và cảnh báo của lần biên dịch gần nhất trong tệp đang mở có một chấm cạnh số dòng, và lỗi được gạch chân. Di chuột qua để xem thông báo LaTeX và phần giải thích.
- **Kiểm tra mã**: kiểm tra ngay khi bạn gõ, không cần biên dịch: môi trường chưa đóng hoặc không khớp, dấu `}` hay `$` thừa, lệnh toán học nằm ngoài công thức. Chỗ bạn đang gõ sẽ không bị đánh dấu. Đặt `%%begin novalidate` và `%%end novalidate` quanh một đoạn để bỏ qua đoạn đó.

## Kiểm tra chính tả

Từ sai chính tả có gạch chân chấm đỏ (văn bản CJK không được kiểm tra). Nhấp chuột phải vào từ đó để xem gợi ý hoặc **Thêm vào từ điển**. Ngôn ngữ là một cài đặt của dự án.

Từ điển của bạn nằm ở **Cài đặt → Từ điển** ở cuối thanh bên của trình soạn thảo; các từ trong đó được coi là đúng trong mọi dự án của bạn. Gõ vào ô để tìm một từ, và nhấn Enter để thêm nếu từ đó chưa có; các chữ cái phía trên danh sách giúp nhảy tới chữ cái đó. Menu **⋯** nhập một tệp văn bản (mỗi dòng một từ, hoặc phân tách bằng khoảng trắng hay dấu phẩy; tệp `.dic` của Hunspell cũng dùng được), xuất các từ của bạn thành `dictionary.txt`, và xóa tất cả. Các trình soạn thảo đang mở sẽ kiểm tra lại các từ ngay lập tức.

## Menu chuột phải

Cắt, sao chép, dán, chọn tất cả, xóa, đến vị trí trong PDF và thêm bình luận. Trên `\ref{…}` menu có **Đến nhãn**; trên `\input{…}` hoặc `\include{…}`, có **Mở tệp**.

## Dàn ý và đường dẫn điều hướng

- **Dàn ý tệp** bên dưới cây thư mục liệt kê các mục của tệp đang mở; nhấp vào một mục để đến đó. Mục bạn đang ở được tô sáng.
- Hàng phía trên trình soạn thảo hiển thị “tệp › mục › tiểu mục” tại vị trí con trỏ; nhấp vào một mục để đến đó. Có thể tắt hàng này trong cài đặt trình soạn thảo.

## Tìm kiếm

`Mod+F` (hoặc `Mod+Shift+F`, hoặc nút tìm kiếm trên thanh công cụ) mở bảng **Tìm kiếm** ở bên trái, với văn bản đang chọn được điền sẵn. Nó tìm trong toàn bộ dự án, các kết quả của tệp đang mở được xếp trước, hỗ trợ biểu thức chính quy, phân biệt hoa thường và khớp nguyên từ, và thay thế một kết quả hoặc tất cả. Một phiên bản được lưu trước khi thay thế tất cả.

## Cài đặt trình soạn thảo

**Cài đặt** ở cuối thanh bên trái nhóm các cài đặt thành các mục ở bên trái:

- **Dự án**: trình biên dịch, tài liệu chính, ngôn ngữ kiểm tra chính tả (người chỉnh sửa thay đổi chúng, cho mọi người), và địa chỉ clone Git;
- **Giao diện**: cỡ chữ, phông chữ (đơn cách hoặc không chân), chiều cao dòng, **Màu mã** (GitHub, Solarized, Monokai, Dracula, Nord, One Dark và nhiều hơn nữa, chỉ ở chế độ mã), đường dẫn điều hướng;
- **Soạn thảo**: tổ hợp phím (mặc định, Vim hoặc Emacs) và các công tắc cho kiểm tra mã, xem trước công thức, tự động đóng ngoặc và tự động hoàn thành;
- **Phím tắt**: xem bên dưới;
- **Thao tác**: đếm từ, sao chép, chuyển đổi mẫu, xuất bản thành mẫu.

Giao diện, soạn thảo và phím tắt là của riêng bạn, được lưu trong trình duyệt này, cho mọi dự án.

## Phím tắt

**Phím tắt** ở thanh bên trái liệt kê tất cả. Những phím hay dùng nhất:

| Thao tác | Phím |
| --- | --- |
| Biên dịch | `Mod+S` hoặc `Mod+Enter` |
| Hoàn tác / làm lại | `Mod+Z` / `Mod+Shift+Z` |
| Tìm và thay thế | `Mod+F` |
| Đậm / nghiêng | `Mod+B` / `Mod+I` |
| Chú thích hoặc bỏ chú thích các dòng | `Mod+/` |
| Đến dòng | `Mod+Alt+G` |
| Bình luận về vùng chọn | `Mod+Alt+M` |
| Hiện gợi ý | `Ctrl+Space` |

Phím được hiển thị theo hệ thống của bạn: ⌘, ⌥ và ⇧ trên Mac, Ctrl, Alt và Shift trên Windows và Linux. Đây là các phím mặc định.

### Phím tắt của riêng bạn

Trong **Phím tắt** ở phần cài đặt, nhấp **Thay đổi** cạnh một lệnh rồi nhấn tổ hợp phím mới. Tổ hợp phải có Ctrl (⌘ trên Mac) hoặc Alt; không dùng được các phím mà lệnh khác đang dùng, hoặc các phím dành cho trình duyệt và thao tác soạn thảo cơ bản (hoàn tác, sao chép, dán, chọn tất cả…). Có thể đặt lại một phím hoặc tất cả. Gợi ý trên thanh công cụ và danh sách phím tắt sau đó sẽ hiển thị phím của bạn.
