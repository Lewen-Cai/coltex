# 배포 및 네트워크

운영 환경에서 ColTex는 포트 하나(기본값 3690)를 씁니다. 페이지, API, 실시간 협업(WebSocket), 알림이 모두 이 포트를 거칩니다. HTTP와 WebSocket을 전달할 수 있으면 무엇이든 됩니다. 이 컴퓨터, LAN, Tailscale, Cloudflare Tunnel 또는 클라우드 서버 모두 가능합니다. (3000과 5173은 개발 서버의 포트입니다.)

## 설치

Docker가 있는 Linux나 macOS에서 명령 하나로 설치합니다.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

다운로드가 중간에 끊기면(`curl: (35) Recv failure: Connection reset by peer`, GitHub에 접속하기 어려울 때 자주 생깁니다) 명령을 다시 실행하세요.

설치 프로그램은 언어와 TeX Live 에디션을 묻고(화살표 키로 선택. `--edition`, `--lang` 옵션으로 대신 답할 수 있음), Docker를 확인하고(Linux에서는 설치도 가능), ColTex를 `~/coltex`에 내려받고, 설정을 쓰고, 미리 빌드된 이미지(x86-64와 ARM64)를 다운로드해 실행한 뒤, 이 컴퓨터와 네트워크에서 열 주소를 출력합니다. 처음 시작할 때 TeX Live를 다운로드합니다. 에디션은 두 가지입니다.

| 에디션 | 다운로드 | 디스크 사용량(ColTex 전체) | 필요한 여유 공간 |
| --- | --- | --- | --- |
| **standard**(기본값) | 약 3 GB | 약 12 GB | 20 GB |
| **full**(`--edition full`) | 약 8 GB | 약 23 GB | 35 GB |

두 에디션 모두 전체 TeX Live를 담고 있어 같은 방식으로 컴파일하며, AI 에이전트도 어느 쪽에서나 쓸 수 있습니다. standard 에디션에는 패키지 매뉴얼과 소스가 없고, full 에디션에는 이것들이 추가되어 AI 에이전트가 매뉴얼도 읽을 수 있습니다. standard 에디션에서는 AI 에이전트가 패키지 파일과 자체 지식으로 답합니다. 나중에 `coltex edition full`이나 `coltex edition standard`로 전환할 수 있습니다.

원격 접속(Tailscale, Cloudflare Tunnel)은 설치 후 **설정 → 네트워크**에서 켭니다(아래 참고). 스크립트로 설치할 때는 옵션으로 설치하면서 함께 켤 수도 있습니다.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

그다음 `coltex`로 관리합니다.

| 명령 | 하는 일 |
| --- | --- |
| `coltex status` / `logs` | 상태 / 로그 |
| `coltex edition [standard\|full]` | TeX Live 에디션 표시 또는 전환(다른 컴파일러 이미지를 다운로드) |
| `coltex update` | 최신 릴리스로 업데이트(새 이미지 다운로드). 데이터와 설정은 유지 |
| `coltex stop` / `start` | 중지 / 시작 |
| `coltex tailscale up` | tailnet에 참여(로그인 링크와 QR 코드 출력) |
| `coltex cloudflare quick` | 임시 공개 Cloudflare 주소 |
| `coltex cloudflare token` | 내 도메인을 쓰는 Cloudflare 터널(토큰을 물어봄) |
| `coltex reset` | 모든 것(계정, 프로젝트, 데이터베이스)을 삭제하고 초기 설정 페이지부터 다시 시작. 먼저 `reset`을 입력하라고 요청함 |
| `coltex uninstall` | 이 컴퓨터에서 ColTex 제거: 컨테이너, 데이터베이스, 데이터, 이미지, `coltex` 명령과 그 폴더(Docker는 유지). 먼저 `uninstall`을 입력하라고 요청함 |

## 어떤 주소로든 로그인

서버는 자신의 주소로 들어온 로그인을 받아들입니다. `localhost`, LAN IP, Tailscale 주소 또는 도메인 어느 것으로 열든 미리 등록할 필요가 없습니다. 다른 사이트의 페이지로는 누구도 로그인시킬 수 없습니다.

## 링크에 쓰이는 주소

초대 링크와 Git clone 주소는 ColTex에 접속할 수 있는 주소마다 하나씩, 각각 복사 버튼과 함께 제공되므로 받는 사람이 열 수 있는 주소를 고르면 됩니다.

- **LAN** 또는 **Tailscale**: ColTex를 연 주소(주소 형태로 판별).
- **Tailscale**, **Cloudflare**: 연결되어 있는 동안의 내장 Tailscale 또는 Cloudflare Tunnel 주소. 연결 상태에 따라 나타나고 사라지며, 하나를 꺼도 따로 바꿀 것이 없습니다.
- **공개 주소**: 설정되어 있을 때 서버의 `COLTEX_URL`.

대기 중인 초대의 링크는 사용되거나 만료될 때까지 초대 목록에 남습니다.

## Tailscale

ColTex에는 Tailscale이 내장되어 있어 독립된 기기(기본 이름 `coltex`)로 tailnet에 참여할 수 있습니다. 서버에 따로 설치할 것이 없으며 데스크톱이 없는 서버에서도 작동합니다.

1. **설정 → 네트워크**에서 Tailscale을 켭니다.
2. 휴대폰으로 QR 코드를 스캔하거나 아무 기기에서나 링크를 열어 tailnet에 로그인합니다. 페이지가 저절로 연결됨으로 바뀝니다.
3. **tailnet에서 ColTex 제공**을 켭니다. tailnet에 MagicDNS와 HTTPS가 켜져 있으면 주소는 `https://coltex.<your tailnet>.ts.net`, 그렇지 않으면 `http://coltex.<your tailnet>.ts.net`입니다.

아직 어떤 브라우저로도 설정 페이지에 접속할 수 없다면 서버에서 다음을 실행합니다.

```sh
coltex tailscale up
```

이 명령은 Tailscale을 켜고, 터미널에 로그인 링크와 QR 코드를 출력하고, 로그인을 기다린 뒤 tailnet에서 ColTex를 제공합니다. `coltex tailscale status`는 상태를 보여 주고, `coltex tailscale down`은 tailnet에서 나가며, `coltex tailscale off`는 Tailscale을 끕니다.

`TS_HOSTNAME`으로 기기 이름을 바꿉니다. 서버가 Tailscale을 직접 실행하므로 추가 컨테이너나 권한이 필요 없습니다. 기기 키는 `data/tailscale`에 보관되며 백업에는 포함되지 않습니다. 복원한 뒤에는 다시 로그인하세요.

서버에서 이미 Tailscale을 직접 실행하고 있어도 둘은 서로 방해하지 않습니다. 내장 Tailscale은 독립된 기기이며 userspace networking을 사용하므로 서버의 네트워크 설정을 전혀 바꾸지 않습니다. 또한 내장 Tailscale이 꼭 필요하지도 않습니다. 서버의 Tailscale IP나 MagicDNS 이름에 `:3690`을 붙여 ColTex를 여세요.

## Cloudflare Tunnel

ColTex에는 Cloudflare Tunnel도 터널 용도로만 내장되어 있습니다. 사람들은 여전히 ColTex 계정으로 로그인하며, Cloudflare Access는 필요 없습니다. 서버에 열린 포트가 없어도 됩니다.

- **빠른 터널**: Cloudflare 계정이 필요 없습니다. `https://<random>.trycloudflare.com` 주소를 받으며, 시작할 때마다 바뀝니다. 시험해 볼 때 적합합니다.
- **내 도메인**: Cloudflare에 내 도메인이 있으면 Zero Trust → Networks → Tunnels에서 터널을 만들고 “Run the following command” 아래의 명령(Windows, macOS, Debian, Red Hat, Docker 등 어느 시스템용이든 가능)을 복사합니다. ColTex가 그 안에서 토큰을 꺼냅니다. 터널에 서비스 `http://localhost:3690`을 가리키는 공개 호스트 이름(예: `tex.example.org`)을 추가합니다.

**설정 → 네트워크**의 Cloudflare Tunnel 카드 스위치로 켠 다음 임시 링크나 터널(저장된 터널 또는 붙여넣은 명령으로 만든 새 터널)을 고르거나, 터미널에서 `coltex cloudflare quick` / `coltex cloudflare token`을 실행합니다. 연결되면 그 주소가 초대 링크에 저절로 나타납니다. 토큰은 암호화되어 저장되며 다시 표시되지 않습니다.

터널이 QUIC로 Cloudflare에 연결할 수 없으면(방화벽 또는 UDP를 버리는 프록시 때문에) ColTex가 자동으로 HTTP/2로 전환합니다. trycloudflare.com이 임시 링크를 제한하면(429 Too Many Requests) ColTex는 점점 더 간격을 두고 다시 요청합니다. 터널을 변경할 때는 Cloudflare 대시보드에서 공개 호스트 이름을 새 터널로 옮기세요. 옮기기 전까지는 Error 1033으로 응답합니다.

서버에서 이미 자체 터널용 cloudflared를 실행하고 있어도 둘은 충돌하지 않지만, 그 터널의 토큰을 ColTex에 주지는 마세요. Cloudflare가 둘을 같은 터널의 커넥터로 취급해 요청을 나눠 보내므로, 서버의 다른 호스트 이름으로 가는 요청이 가끔 ColTex에 도달해 실패합니다(502). 그 터널에 ColTex용 공개 호스트 이름(서비스 `http://localhost:3690`)을 추가하고 내장 터널은 꺼 두거나, ColTex용 터널을 따로 만드세요.

## 서버 설정

서버의 환경 변수입니다. Docker를 쓴다면 `docker-compose.yml` 옆의 `.env` 파일에 넣고 `docker compose up -d`를 실행하세요.

| 변수 | 하는 일 |
| --- | --- |
| `COLTEX_PORT` | 포트. 기본값 3690 |
| `COLTEX_URL` | 모든 링크에 제공되는 공개 주소. 예: `https://tex.example.org` |
| `TRUSTED_ORIGINS` | 로그인이 허용하는 다른 주소(쉼표로 구분). 페이지와 API의 주소가 다를 때만 필요 |
| `TRUST_PROXY` | 앞단에 리버스 프록시(Caddy, Nginx)가 있을 때: `uniquelocal`(사설 네트워크의 프록시) 또는 `true`. 설정하지 않으면 서버가 프록시를 방문자로 여겨 모든 사람이 하나의 로그인 횟수 제한을 함께 씁니다 |
| `TS_HOSTNAME` | 내장 Tailscale의 기기 이름. 기본값 `coltex` |

**설정 → 네트워크** 아래쪽의 **요청 수신 방식**에서 이 설정들과 서버가 보는 IP를 확인할 수 있고, 문제가 있으면 알려 줍니다.

## 일반적인 구성

| 구성 | 방법 |
| --- | --- |
| 이 컴퓨터에서만 | 기본값: `http://localhost:3690` |
| LAN | 서버의 LAN 주소로 엽니다. 예: `http://192.168.1.20:3690`. LAN 주소는 바뀔 수 있으니 오래 쓰려면 공유기에서 주소를 예약하세요 |
| Tailscale | 위의 Tailscale 참고 |
| Cloudflare Tunnel | 위의 Cloudflare Tunnel 참고 |
| 클라우드 서버 | 도메인이 있으면 `--domain tex.example.org`로 설치합니다(DNS가 서버를 가리키게 하고 포트 80과 443을 엽니다). 함께 제공되는 Caddy가 HTTPS 인증서를 받으며, 그러면 포트 3690은 서버 자신에서만 응답합니다. 도메인이 없으면 Cloudflare Tunnel이나 Tailscale을 사용합니다 |

## 보안

- 작은 그룹이라면 Tailscale이나 VPN으로만 ColTex에 접속하게 하는 것이 가장 간단합니다. 인터넷에 전혀 보이지 않습니다. Cloudflare Tunnel을 쓰면 공개되며, ColTex의 로그인으로 보호됩니다.
- 인터넷에서는 HTTPS를 사용하세요(클라우드 구성처럼 Caddy 사용).
- 서버의 방화벽(ufw, firewalld)은 Docker가 공개한 포트를 막지 못합니다. `--domain`을 쓰면 포트 3690은 서버 자신에서만 응답합니다. 대신 Tailscale이나 Cloudflare 터널을 쓴다면 클라우드 제공업체의 방화벽에서 3690을 닫으세요.
- 공개 가입은 없고 초대만 있으며, 비밀번호에는 강도 규칙이 있고, 로그인은 IP당 10초에 3번까지 시도할 수 있습니다.
- 흔하지 않은 포트를 쓴다고 스캐너를 막을 수는 없으니 이에 의존하지 마세요.
