<h1 align="center">ColTex</h1>
<p align="center">
  <strong>AI 에이전트를 내장한 자체 호스팅 협업 LaTeX 편집기.</strong><br>
  내 서버 · 내 계정 · 내 데이터 · 실시간 협업 · 오픈 소스(AGPL-3.0)
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd>简体中文</kbd></a>
  <a href="./zh-TW.md"><kbd>繁體中文</kbd></a>
  <a href="./ja.md"><kbd>日本語</kbd></a>
  <a href="./ko.md"><kbd><b>한국어</b></kbd></a>
  <a href="./es.md"><kbd>Español</kbd></a>
  <a href="./fr.md"><kbd>Français</kbd></a><br>
  <a href="./de.md"><kbd>Deutsch</kbd></a>
  <a href="./pt-BR.md"><kbd>Português (Brasil)</kbd></a>
  <a href="./it.md"><kbd>Italiano</kbd></a>
  <a href="./ru.md"><kbd>Русский</kbd></a>
  <a href="./tr.md"><kbd>Türkçe</kbd></a>
  <a href="./vi.md"><kbd>Tiếng Việt</kbd></a>
  <a href="./id.md"><kbd>Bahasa Indonesia</kbd></a>
</p>
<p align="center">
  <a href="#install">설치</a> · <a href="#configure">설정</a> · <a href="../CHANGELOG.md">변경 기록</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="최신 릴리스"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <img src="../docs/images/editor.png" alt="ColTex 편집기: 파일, LaTeX 소스, 컴파일된 PDF, AI 에이전트" width="900">
</p>

<a id="why"></a>
## 왜 ColTex인가요?

ColTex는 연구 그룹, 연구실 또는 개인을 위한 Overleaf 대안으로, 내가 관리하는 컴퓨터에서 실행됩니다. 연구실의 데스크톱, 집의 서버, 클라우드 머신 모두 가능합니다.

- **모든 것이 내 서버에 남습니다.** 프로젝트, 기록, 계정, 컴파일 작업이 서버 밖으로 나가지 않습니다. TeX는 인터넷 접근이 없는 샌드박스 컨테이너에서 실행됩니다.
- **함께 쓰기 위해 만들었습니다.** 여러 사람이 같은 파일을 동시에 편집하며, 댓글, 변경 내용 추적, 채팅, 버전 기록을 지원합니다.
- **프로젝트에서 직접 일하는 AI 에이전트.** 파일과 컴파일 로그를 읽고, 변경 내용 초안을 만들어 테스트 컴파일한 뒤 diff를 보여 줍니다. 내가 적용하기 전에는 아무것도 기록되지 않습니다.
- **명령 하나로 설치, 열어야 할 포트 없음.** 원격 접속을 위한 Tailscale과 Cloudflare Tunnel이 내장되어 있습니다.

<a id="features"></a>
## 기능

### 작성과 컴파일
- 소스 편집기(CodeMirror)와 비주얼 편집기. Overleaf의 표 편집기와 그림 대화 상자, 도구 모음, 기호 팔레트, 개요, 이동 경로를 갖추었습니다.
- LaTeX 자동 완성, 코드 검사, 수식 미리 보기, 여러 언어의 맞춤법 검사, 단어 수, 프로젝트 전체 검색 및 바꾸기, Vim 또는 Emacs 키.
- 전체 TeX Live에서 latexmk로 컴파일합니다. 엔진(pdfLaTeX, XeLaTeX 또는 LuaLaTeX)은 문서를 보고 고르며, 중국어(ctex, xeCJK)도 지원합니다.
- 양방향 SyncTeX를 지원하는 PDF 미리 보기(별도 창에서도 가능). 컴파일 오류는 소스에 밑줄로 표시되며 알기 쉬운 설명이 붙습니다.
- 참고문헌: `.bib` 파일에서 인용하고, Crossref와 arXiv를 검색하거나(DOI나 arXiv ID를 붙여넣어도 됨) 항목을 추가하고, Zotero 라이브러리나 컬렉션을 가져와 동기화할 수 있습니다.

### 협업
- 모든 사람의 커서가 보이는 실시간 편집, @멘션이 가능한 댓글, 변경 내용 추적(수락, 거부, 결정 실행 취소), 프로젝트 채팅, 앱 내 알림.
- 프로젝트별 역할: 소유자, 편집자, 검토자(제안만 가능), 뷰어.
- git 같은 버전 기록: 자동 버전, 메시지와 함께 저장한 버전, 한 버전의 변경 내용만 되돌리기.
- Git 접근: 프로젝트를 clone해 로컬에서 작업하고 다시 push합니다(개인 토큰 사용. 그사이 브라우저에서 한 편집은 병합됩니다).

### AI 에이전트
- LaTeX, 프로젝트, 글쓰기에 대해 묻거나 컴파일 오류를 고치게 할 수 있습니다. 비공개 사본에서 변경 내용 초안을 만들어 테스트 컴파일하고 diff를 보여 주며, 전부 또는 일부만 적용할 수 있습니다.
- 적용할 때는 먼저 버전을 저장하고 다시 컴파일합니다. 빌드 결과가 나빠지면 변경 내용이 자동으로 되돌려집니다.
- 제공업체: API 키(Anthropic, OpenAI, DeepSeek, Google, OpenRouter 등), 구독 계정 로그인(Claude Pro/Max, ChatGPT, GitHub Copilot 등), 또는 직접 운영하는 OpenAI 호환 서버(Ollama, vLLM, LM Studio).
- 자동 모델 선택(메시지마다 경량 모델 또는 고성능 모델), 그룹별 접근 권한, 개인별 사용량, 일·주·월 단위 사용량 한도.
- 프로젝트별로 저장되는 대화, 실시간으로 표시되는 컨텍스트 창 사용량, 긴 대화를 요약하는 `/compact`.
- Skill: 에이전트가 따르는 나만의 지침과 프로젝트 지침(Agent Skills 형식)으로, `/name`으로 사용합니다. 직접 작성하거나, 가져오거나, 설정에서 AI와 함께 만들 수 있습니다.
- Claude Code와 비슷한 권한: AI 에이전트의 변경 내용은 내 검토를 기다리거나(수동), 작업이 끝나면 적용되거나(자동), 파일 삭제와 이동까지 할 수 있습니다(전체 권한).
- MCP로 연결하는 내 에이전트(Claude Code, Codex, Cursor 등): 모든 프로젝트에 주소 하나, 같은 권한 적용(수동에서는 에이전트의 편집이 내 제안이 됩니다).

### 프로젝트와 관리
- IEEE, ACM, Springer LNCS, Elsevier, REVTeX, arXiv 템플릿과, 논문을 한 저널 템플릿에서 다른 템플릿으로 변환하는 기능.
- Overleaf zip 가져오기와 내보내기, URL이나 다른 프로젝트에서 연결한 파일, 태그, 보관, 휴지통.
- 공개 가입 없음: 계정은 초대 링크로만 만들어집니다. 시스템 관리자 한 명과, 각자 초대한 팀을 관리하는 관리자들.
- 모니터링, WebDAV 백업(선택적 암호화), 로컬 또는 S3 호환 저장소, 라이트 및 다크 테마, 14개 언어의 인터페이스(영어, 중국어, 일본어, 한국어, 스페인어, 프랑스어, 독일어, 포르투갈어, 이탈리아어, 러시아어, 터키어, 베트남어, 인도네시아어).

<a id="install"></a>
## 설치

Docker가 있는 Linux 또는 macOS 컴퓨터(Linux에서는 설치 프로그램이 Docker를 설치할 수 있음), CPU 2코어 이상, 메모리 4 GB 이상이 필요합니다. 이미지는 x86-64와 ARM64용으로 미리 빌드되어 있습니다.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

설치 프로그램은 언어, TeX Live 에디션, 사람들이 ColTex에 접속할 방법을 묻고(화살표 키로 선택), 최신 릴리스를 `~/coltex`에 내려받고, 진행 막대와 함께 미리 빌드된 이미지를 다운로드하고, ColTex를 시작한 뒤 열 주소를 출력합니다. 전체 출력은 `~/coltex/install.log`에 기록됩니다. 그다음 `http://<server>:3690`을 열고 관리자 계정을 만드세요.

처음 시작할 때 TeX Live를 다운로드합니다. 에디션을 고르세요.

| 에디션 | 다운로드 | 디스크 사용량(ColTex 전체) | 필요한 여유 공간 |
| --- | --- | --- | --- |
| **standard**(기본값) | 약 3 GB | 약 12 GB | 20 GB |
| **full**(`--edition full`) | 약 8 GB | 약 23 GB | 35 GB |

두 에디션 모두 같은 문서를 컴파일합니다. full 에디션에는 패키지 매뉴얼도 들어 있어 AI 에이전트가 읽을 수 있습니다.

옵션으로 질문에 답하거나, 터미널이 없는 환경에서는 질문 대신 옵션을 씁니다(`bash -s --` 뒤에 붙이세요).

| 옵션 | |
| --- | --- |
| `--domain tex.example.org` | 자체 도메인이 있는 서버에서 함께 제공되는 Caddy로 HTTPS 사용. 도메인이 서버를 가리키게 하고 포트 80과 443을 엽니다 |
| `--tailscale` | ColTex를 내 tailnet에 추가합니다. 로그인 링크와 QR 코드를 출력합니다 |
| `--cloudflare-token TOKEN` | 내 도메인용으로 만든 Cloudflare 터널에 연결합니다 |
| `--cloudflare-quick` | 시험용 임시 공개 `trycloudflare.com` 주소 |
| `--edition full` | full TeX Live 에디션 |
| `--local` | 이 컴퓨터와 그 네트워크에서만 접속 |
| `--lang LANG` | 설치 프로그램, `coltex`, 초기 설정 페이지의 언어: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, `it`, `ru`, `tr`, `vi` 또는 `id`(지정하지 않으면 물어봅니다) |
| `--port 3690` | 다른 포트 사용 |
| `--version v0.0.1` | 특정 릴리스(`main`은 개발 브랜치) |
| `--build` | 이미지를 다운로드하지 않고 이 컴퓨터에서 소스로 빌드 |
| `--images REGISTRY` | `ghcr.io/lewen-cai` 대신 `REGISTRY`에서 이미지를 다운로드합니다. 예: ghcr.io가 느릴 때 ghcr.io의 미러 사용(Docker의 `registry-mirrors`는 Docker Hub에만 적용되고 ghcr.io에는 적용되지 않습니다) |

인터넷에서 접속할 수 있는 서버에서는 암호화되지 않은 `http://`로 로그인하지 마세요. `--domain`, Tailscale 또는 Cloudflare 터널을 사용하세요.

### 관리와 업데이트

```sh
coltex status          # running? at which address
coltex logs            # the server's log (coltex logs compiler for the compiler)
coltex update          # to the latest release; your settings and data stay
coltex version
coltex edition full    # switch the TeX Live edition
coltex tailscale up    # or: coltex cloudflare quick | token
coltex stop | start
coltex reset           # delete all data and start again from the setup page (asks first)
coltex uninstall       # remove ColTex from this machine: containers, data, images, this folder (asks first)
```

<a id="configure"></a>
## 설정

모든 설정은 브라우저에서, 사용자 메뉴의 **설정**에서 합니다.

1. **사용자 관리**와 **초대**: 링크로 사람을 초대합니다(링크는 한 번만 쓸 수 있으며, 특정 이메일로 제한할 수도 있습니다).
2. **AI 서비스**: 제공업체를 연결합니다. 그다음 **AI 사용량 및 접근 권한**에서 사람들을 그 제공업체를 쓸 수 있는 그룹에 넣습니다. 그룹이 없으면 시스템 관리자 말고는 아무도 AI 에이전트를 쓸 수 없습니다.
3. **네트워크**: ColTex에 접속하는 주소와 Tailscale, Cloudflare Tunnel.
4. **저장소 및 백업**: WebDAV 폴더(Nextcloud, NAS 등)로 매일 또는 매주 백업합니다.

도움말 문서가 내장되어 있습니다. 사용자 메뉴의 **도움말 문서**를 여세요. 서버 운영(환경 변수, S3, 백업 복원)은 [docs/operations.md](../docs/operations.md)(영어)에 있습니다.

<a id="feedback"></a>
## 초기 단계: Issue를 열어 주세요

ColTex는 아직 초기 버전(0.0.x)입니다. 매일 사용하고 테스트하고 있지만 아직 발견하지 못한 문제가 있을 수 있습니다. 무언가 고장 나거나, 이상해 보이거나, 쓰기 어렵다면 [Issue를 열어 주세요](https://github.com/Lewen-Cai/coltex/issues). 모든 보고가 도움이 됩니다.

유용한 보고에는 버전(`coltex version`), 무엇을 했고 무슨 일이 일어났는지, 그리고 서버와 관련된 문제라면 `coltex logs`의 관련 줄이 들어 있습니다. 비밀번호, API 키, 비공개 문서 내용은 빼 주세요.

<a id="development"></a>
## 개발

Node 24 이상, pnpm 11, Docker가 필요합니다.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| 경로 | |
| --- | --- |
| `apps/web` | 웹 앱: React, CodeMirror 6, PDF.js |
| `apps/server` | API: Fastify, 계정, 프로젝트, 실시간 협업, AI 에이전트 |
| `services/compiler` | TeX Live 컨테이너에서 실행되는 컴파일 워커 |
| `packages/*` | 공유 스키마, 로그 파서, LaTeX 언어 지원, 검토 데이터, 템플릿 변환 |

설계는 [docs/architecture.md](../docs/architecture.md)(영어)에 설명되어 있습니다.

<a id="acknowledgements"></a>
## 감사의 말

- [Overleaf](https://github.com/overleaf/overleaf)(AGPL-3.0): ColTex는 Overleaf의 로그 파서와 설명, LaTeX 언어 지원, 비주얼 편집기, 표 편집기, 맞춤법 검사, 단어 수 기능을 이식했습니다. 이식한 모든 파일은 [NOTICE](../NOTICE)에 나열되어 있습니다.
- [Pi](https://github.com/earendil-works)(`pi-ai`, `pi-agent-core`): AI 에이전트를 뒷받침하는 모델 제공업체 연결과 에이전트 루프.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck)(AGPL-3.0): 제공업체 상태 추적과 자동 모델 선택은 이 프로젝트를 바탕으로 했습니다.
- [Yjs](https://github.com/yjs/yjs)와 [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons)(MIT): 제공업체 로고. 상표는 각 소유자에게 있으며 서비스를 식별하는 용도로만 사용합니다.

<a id="license"></a>
## 라이선스

[AGPL-3.0](../LICENSE). 수정한 ColTex를 네트워크로 다른 사람에게 제공한다면 그 소스 코드를 제공해야 합니다. 서드파티 코드는 각자의 라이선스를 따릅니다. [NOTICE](../NOTICE)를 참고하세요.
