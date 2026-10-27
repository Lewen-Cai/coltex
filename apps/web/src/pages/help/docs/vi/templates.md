# Mẫu

## Dự án mới từ mẫu

**Dự án mới** hiện một danh sách duy nhất: các mẫu tích hợp sẵn và các mẫu được chia sẻ với bạn. Nhãn trên mỗi mẫu cho biết nguồn gốc:

- **Tích hợp sẵn**: đi kèm ColTex.
- **Quản trị viên hệ thống đã chia sẻ**: cho mọi người trên máy chủ này.
- **Chia sẻ trong** tên một nhóm: được chia sẻ với một nhóm bạn tham gia.
- Một tên **đã chia sẻ**: được chia sẻ riêng với bạn.

Các nút phía trên danh sách (**Tất cả**, rồi các lĩnh vực) hiện mẫu của một lĩnh vực. Bạn chỉ thấy các mẫu được chia sẻ với bạn. Xem thêm [Bắt đầu](#/help/getting-started).

## Xuất bản một dự án thành mẫu

Quản trị viên có thể xuất bản dự án của mình thành mẫu, ví dụ định dạng luận văn của một nhóm:

1. Trong menu dự án (⋯) ở danh sách dự án, hoặc trong cài đặt dự án, chọn **Xuất bản thành mẫu…**.
2. Đặt tên, mô tả và **Lĩnh vực** (nơi nó được liệt kê), chọn ai nhận trong **Chia sẻ với**, rồi nhấn **Xuất bản**.

Có thể dành cho ai:

- Quản trị viên: các nhóm họ tham gia và những người họ chọn theo tên hoặc email.
- Quản trị viên hệ thống: thêm **Mọi người trên máy chủ này**.
- Thành viên không thể xuất bản mẫu; hãy nhờ quản trị viên.

Cần biết:

- Dự án mới từ mẫu nhận các tệp của dự án như **ở thời điểm đó**, trình biên dịch và ngôn ngữ kiểm tra chính tả; không nhận thành viên, lịch sử hay bình luận.
- Mẫu đi theo dự án: thay đổi dự án, các dự án mới về sau sẽ nhận thay đổi.
- Mở lại **Xuất bản thành mẫu…** để đổi tên, lĩnh vực hoặc người nhận, hoặc để **Hủy xuất bản**. Quản trị viên hệ thống cũng có thể xóa bất kỳ mẫu nào trong hộp thoại dự án mới.
- Mẫu biến mất khi dự án bị xóa.

## Nhập mẫu của một tạp chí

Nhiều tạp chí và hội nghị phát hành mẫu LaTeX không được tích hợp sẵn trong ColTex: giấy phép của chúng không cho phép phân phối lại, hoặc chúng không có trong TeX Live. Trong số đó có NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, ICCV, AAAI, IJCAI, USENIX, IEEE Access, Springer Nature (`sn-jnl`), PNAS, Science, Cell, eLife, PLOS, Frontiers, MDPI, BMC, Wiley, Taylor & Francis, SAGE, IOP, SIAM, Copernicus, AGU, Astronomy & Astrophysics. Hãy tải mẫu chính thức từ trang web của hội nghị hoặc nhà xuất bản rồi nhập nó làm mẫu:

1. Nhấn **Dự án mới**, rồi **Nhập mẫu** (chỉ quản trị viên).
2. Chọn tệp zip, đặt tên, mô tả và **Lĩnh vực**, chọn ai nhận trong **Chia sẻ với**, rồi nhấn **Nhập**.

Cần biết:

- Người nhận theo cùng quy tắc như khi xuất bản (ở trên): quản trị viên chia sẻ với nhóm của mình và những người họ chọn, quản trị viên hệ thống còn với mọi người.
- Tệp zip trở thành một dự án của bạn, được xuất bản thành mẫu. Tài liệu chính được tìm như khi nhập dự án; tệp biên dịch và tệp rác của hệ thống bị bỏ qua.
- Menu ⋯ của mẫu có **Mở dự án** (để sửa tệp), **Sửa mẫu…** (để đổi tên, đổi người nhận hoặc hủy xuất bản) và **Xóa mẫu**.

## Chuyển sang mẫu tạp chí

**Chuyển sang mẫu khác…** trong menu của dự án (trong cài đặt dự án: “Chuyển sang mẫu tạp chí”) viết lại một bài báo cho tạp chí hoặc hội nghị khác: IEEE Transactions, Hội nghị IEEE, Hội nghị ACM, Tạp chí ACM, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS hoặc một article đơn giản. Mọi mẫu tích hợp đều chuyển được sang bất kỳ định dạng nào trong số này.

Trong **Mẫu**, bài báo được chuyển sang một mẫu bất kỳ: một mẫu trong danh sách mẫu, một dự án của bạn (**Một dự án của tôi**), hoặc tệp zip mà tạp chí cho tải về (**Tải lên mẫu (.zip)**). Tiêu đề, tác giả, đơn vị, tóm tắt và từ khóa được ghi vào đúng chỗ mẫu có ví dụ, theo cách viết của chính mẫu, còn phần văn bản ví dụ phía sau được thay bằng bài báo của bạn. Các tệp lớp và tệp kiểu của mẫu đi kèm, và tệp chính ví dụ của mẫu được giữ lại trong dự án để tham khảo.

- Tiêu đề, tác giả, đơn vị công tác, tóm tắt, các gói và tài liệu tham khảo được dựng lại trong một **dự án mới**, sau đó dự án này được biên dịch. Bản gốc vẫn giữ nguyên.
- Bài viết theo mẫu `sn-jnl` của Springer Nature cũng đọc được, các bài theo mẫu BMC, OUP và Elsevier CAS cũng vậy: tác giả với tên và họ, đơn vị công tác, `\abstract{}` và tóm tắt có cấu trúc, từ khóa và phần tuyên bố ở cuối bài.
- Báo cáo liệt kê những gì đã đổi và những gì cần kiểm tra. Nếu bản dịch có lỗi hoặc báo cáo có cảnh báo, **Mở và sửa bằng AI** mở dự án mới và tác tử AI làm theo Skill tích hợp **template-conversion**: trước tiên nó hỏi bạn định gửi bài cho tạp chí hay hội nghị nào, tra cứu hướng dẫn tác giả hiện hành, làm cho bài biên dịch được rồi chỉnh theo hướng dẫn mà không đổi nội dung. Các thay đổi của nó chờ bạn xem lại.
