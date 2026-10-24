# Triển khai và mạng

Khi chạy thực tế, ColTex dùng một cổng duy nhất (mặc định 3690): các trang, API, cộng tác trực tiếp (WebSocket) và thông báo đều đi qua cổng này. Bất cứ thứ gì chuyển tiếp được HTTP và WebSocket đều dùng được: máy tính này, mạng LAN, Tailscale, Cloudflare Tunnel hoặc một máy chủ đám mây. (3000 và 5173 là các cổng của máy chủ phát triển.)

## Cài đặt

Trên Linux hoặc macOS có Docker, chỉ cần một lệnh:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Nếu việc tải xuống bị ngắt (`curl: (35) Recv failure: Connection reset by peer`, thường gặp khi khó kết nối tới GitHub), hãy chạy lại lệnh.

Lệnh này hỏi ngôn ngữ và phiên bản TeX Live (dùng phím mũi tên; các tùy chọn `--edition` và `--lang` sẽ trả lời thay), kiểm tra Docker (trên Linux có thể cài đặt nó), tải ColTex về `~/coltex`, ghi cài đặt, tải các image dựng sẵn (x86-64 và ARM64) rồi khởi động, và in ra các địa chỉ để mở trên máy này và trong mạng của bạn. Lần khởi động đầu tiên sẽ tải TeX Live. Có hai phiên bản:

| Phiên bản | Dung lượng tải | Trên ổ đĩa (toàn bộ ColTex) | Dung lượng trống cần có |
| --- | --- | --- | --- |
| **standard** (mặc định) | khoảng 3 GB | khoảng 12 GB | 20 GB |
| **full** (`--edition full`) | khoảng 8 GB | khoảng 23 GB | 35 GB |

Cả hai đều có TeX Live đầy đủ và biên dịch như nhau, và tác tử AI dùng được với cả hai. Phiên bản standard không kèm tài liệu hướng dẫn và mã nguồn của các gói; phiên bản full có thêm chúng, và tác tử AI còn có thể đọc tài liệu hướng dẫn. Với phiên bản standard, nó trả lời dựa trên các tệp của gói và kiến thức của chính nó. Có thể chuyển đổi sau bằng `coltex edition full` hoặc `coltex edition standard`.

Truy cập từ xa (Tailscale, Cloudflare Tunnel) được bật sau khi cài, trong **Cài đặt → Mạng** (xem bên dưới). Khi cài bằng script, có thể dùng tùy chọn để thiết lập ngay trong lúc cài:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

Sau đó quản lý bằng `coltex`:

| Lệnh | Chức năng |
| --- | --- |
| `coltex status` / `logs` | Trạng thái / nhật ký |
| `coltex edition [standard\|full]` | Hiển thị hoặc chuyển phiên bản TeX Live (tải image trình biên dịch còn lại) |
| `coltex update` | Cập nhật lên bản phát hành mới nhất (tải các image mới); dữ liệu và cài đặt được giữ nguyên |
| `coltex stop` / `start` | Dừng / khởi động |
| `coltex tailscale up` | Tham gia tailnet của bạn (in ra liên kết đăng nhập và mã QR) |
| `coltex cloudflare quick` | Một địa chỉ Cloudflare công khai tạm thời |
| `coltex cloudflare token` | Một Cloudflare tunnel với tên miền của riêng bạn (hỏi token) |
| `coltex reset` | Xóa mọi thứ (tài khoản, dự án, cơ sở dữ liệu) và bắt đầu lại từ trang thiết lập; trước đó sẽ yêu cầu bạn gõ `reset` để xác nhận |
| `coltex uninstall` | Gỡ ColTex khỏi máy này: container, cơ sở dữ liệu, dữ liệu, image, lệnh `coltex` và thư mục của nó (Docker được giữ lại); trước đó sẽ yêu cầu bạn gõ `uninstall` để xác nhận |

## Đăng nhập từ bất kỳ địa chỉ nào

Máy chủ chấp nhận đăng nhập gửi tới chính địa chỉ của nó: mở nó tại `localhost`, một IP LAN, một địa chỉ Tailscale hoặc một tên miền, mà không cần khai báo trước bất kỳ địa chỉ nào. Một trang trên trang web khác không thể đăng nhập cho ai cả.

## Liên kết dùng những địa chỉ nào

Liên kết mời và địa chỉ clone Git được đưa ra một lần cho mỗi địa chỉ mà ColTex có thể được truy cập, mỗi địa chỉ có nút sao chép riêng, để bạn chọn địa chỉ mà người nhận mở được:

- **Mạng LAN** hoặc **Tailscale**: địa chỉ bạn đã dùng để mở ColTex (được nhận diện theo địa chỉ);
- **Tailscale**, **Cloudflare**: địa chỉ của Tailscale hoặc Cloudflare Tunnel tích hợp sẵn khi đang kết nối. Chúng xuất hiện và biến mất theo kết nối; không cần thay đổi gì khi tắt một trong hai;
- **Địa chỉ công khai**: `COLTEX_URL` của máy chủ, khi được đặt.

Các liên kết của một lời mời đang chờ vẫn nằm trong danh sách lời mời cho đến khi được dùng hoặc hết hạn.

## Tailscale

ColTex có sẵn Tailscale: nó có thể tham gia tailnet của bạn như một thiết bị riêng (mặc định tên là `coltex`). Không cần cài gì trên máy chủ, và hoạt động được trên máy chủ không có giao diện đồ họa.

1. Trong **Cài đặt → Mạng**, bật Tailscale.
2. Quét mã QR bằng điện thoại, hoặc mở liên kết trên bất kỳ thiết bị nào, và đăng nhập vào tailnet của bạn. Trang sẽ tự chuyển sang Đã kết nối.
3. Bật **Cung cấp ColTex trên tailnet**. Khi tailnet đã bật MagicDNS và HTTPS, địa chỉ là `https://coltex.<your tailnet>.ts.net`, nếu không thì `http://coltex.<your tailnet>.ts.net`.

Khi chưa có trình duyệt nào vào được trang cài đặt, hãy chạy lệnh sau trên máy chủ:

```sh
coltex tailscale up
```

Lệnh này bật Tailscale, in liên kết đăng nhập và mã QR trong terminal, chờ đăng nhập, rồi cung cấp ColTex trên tailnet. `coltex tailscale status` hiển thị trạng thái, `coltex tailscale down` rời tailnet, `coltex tailscale off` tắt Tailscale.

`TS_HOSTNAME` thay đổi tên thiết bị. Máy chủ tự chạy Tailscale: không cần container hay đặc quyền bổ sung. Khóa thiết bị được giữ trong `data/tailscale` và không có trong bản sao lưu; sau khi khôi phục, hãy đăng nhập lại.

Nếu máy chủ đã tự chạy Tailscale, hai bản sẽ không ảnh hưởng lẫn nhau: bản tích hợp sẵn là một thiết bị riêng và dùng mạng userspace, nên không thay đổi bất kỳ cài đặt mạng nào của máy chủ. Bạn cũng không nhất thiết cần nó: hãy mở ColTex tại IP Tailscale hoặc tên MagicDNS của máy chủ kèm `:3690`.

## Cloudflare Tunnel

ColTex cũng có sẵn Cloudflare Tunnel, chỉ đóng vai trò đường hầm: mọi người vẫn đăng nhập bằng tài khoản ColTex của mình; không cần Cloudflare Access. Máy chủ không cần mở cổng nào.

- **Quick tunnel**: không cần tài khoản Cloudflare; bạn nhận được `https://<random>.trycloudflare.com`, địa chỉ này thay đổi mỗi lần khởi động. Dùng để thử nghiệm.
- **Tên miền của riêng tôi**: với tên miền của bạn trên Cloudflare, hãy tạo một tunnel trong Zero Trust → Networks → Tunnels, sao chép lệnh bên dưới “Run the following command” (cho bất kỳ hệ thống nào: Windows, macOS, Debian, Red Hat hoặc Docker); ColTex sẽ tự lấy token ra từ lệnh đó; thêm một public hostname cho tunnel (vd. `tex.example.org`) với service `http://localhost:3690`.

Bật nó bằng công tắc trên thẻ Cloudflare Tunnel trong **Cài đặt → Mạng**, rồi chọn liên kết tạm thời hoặc một tunnel (tunnel đã lưu, hoặc tunnel mới từ lệnh đã dán), hoặc trong terminal bằng `coltex cloudflare quick` / `coltex cloudflare token`. Khi đã kết nối, các địa chỉ của nó tự xuất hiện trong liên kết mời. Token được lưu mã hóa và không bao giờ hiển thị lại.

Nếu tunnel không kết nối được tới Cloudflare qua QUIC (do tường lửa, hoặc proxy chặn UDP), ColTex sẽ tự chuyển nó sang HTTP/2. Khi trycloudflare.com giới hạn liên kết tạm thời (429 Too Many Requests), ColTex sẽ thử lại ngày càng thưa hơn. Khi bạn đổi tunnel, hãy chuyển các public hostname của nó sang tunnel mới trong bảng điều khiển Cloudflare; cho đến lúc đó, chúng sẽ trả về Error 1033.

Nếu máy chủ đã chạy cloudflared cho một tunnel riêng của nó, hai bên không xung đột, nhưng đừng đưa token của tunnel đó cho ColTex: Cloudflare sẽ coi cả hai là connector của cùng một tunnel và chia các yêu cầu giữa chúng, nên các hostname khác của máy chủ đôi khi sẽ đi tới ColTex và lỗi (502). Hãy thêm một public hostname cho ColTex vào tunnel đó (service `http://localhost:3690`) và để bản tích hợp sẵn tắt, hoặc tạo một tunnel riêng cho ColTex.

## Cài đặt máy chủ

Đây là các biến môi trường của máy chủ. Với Docker, hãy đặt chúng trong tệp `.env` cạnh `docker-compose.yml` và chạy `docker compose up -d`.

| Biến | Chức năng |
| --- | --- |
| `COLTEX_PORT` | Cổng, mặc định 3690 |
| `COLTEX_URL` | Một địa chỉ công khai được đưa ra trong mọi liên kết, vd. `https://tex.example.org` |
| `TRUSTED_ORIGINS` | Các địa chỉ khác mà việc đăng nhập chấp nhận, phân tách bằng dấu phẩy. Chỉ cần khi các trang và API ở những địa chỉ khác nhau |
| `TRUST_PROXY` | Khi có reverse proxy phía trước (Caddy, Nginx): `uniquelocal` (proxy trong mạng riêng) hoặc `true`. Nếu không đặt, máy chủ coi proxy là người truy cập, và mọi người dùng chung một giới hạn tần suất đăng nhập |
| `TS_HOSTNAME` | Tên thiết bị của Tailscale tích hợp sẵn, mặc định `coltex` |

**Cách yêu cầu đi tới** ở cuối **Cài đặt → Mạng** hiển thị các cài đặt này và IP mà máy chủ thấy, đồng thời chỉ ra các vấn đề.

## Các cách triển khai thường gặp

| Cách triển khai | Thực hiện |
| --- | --- |
| Chỉ máy tính này | Mặc định: `http://localhost:3690` |
| Mạng LAN | Mở bằng địa chỉ LAN của máy chủ, vd. `http://192.168.1.20:3690`. Địa chỉ LAN có thể thay đổi; hãy đặt cố định một địa chỉ trong router để dùng lâu dài |
| Tailscale | Xem phần Tailscale ở trên |
| Cloudflare Tunnel | Xem phần Cloudflare Tunnel ở trên |
| Máy chủ đám mây | Có tên miền: cài đặt với `--domain tex.example.org` (trỏ DNS của tên miền về máy chủ và mở cổng 80 và 443). Caddy đi kèm sẽ lấy chứng chỉ HTTPS; khi đó cổng 3690 chỉ trả lời trên chính máy chủ. Không có tên miền: Cloudflare Tunnel hoặc Tailscale |

## Bảo mật

- Với một nhóm nhỏ, chỉ truy cập ColTex qua Tailscale hoặc VPN là đơn giản nhất: nó hoàn toàn không hiện ra trên internet. Với Cloudflare Tunnel, nó là công khai, được bảo vệ bằng đăng nhập của ColTex.
- Trên internet, hãy dùng HTTPS (Caddy, như ở cách triển khai trên máy chủ đám mây).
- Tường lửa trên máy chủ (ufw, firewalld) không đóng được các cổng mà Docker công bố. Với `--domain`, cổng 3690 chỉ trả lời trên chính máy chủ; nếu dùng Tailscale hoặc Cloudflare tunnel thay thế, hãy đóng cổng 3690 trong tường lửa của nhà cung cấp đám mây.
- Không có đăng ký công khai, chỉ có lời mời; mật khẩu có quy tắc về độ mạnh; đăng nhập cho phép 3 lần thử mỗi 10 giây trên mỗi IP.
- Một cổng lạ không ngăn được các công cụ quét; đừng trông cậy vào nó.
