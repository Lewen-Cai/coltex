<h1 align="center">ColTex</h1>
<p align="center">
  <strong>Um editor de LaTeX colaborativo e auto-hospedado, com agente de IA integrado.</strong><br>
  Seu servidor · Suas contas · Seus dados · Colaboração em tempo real · Código aberto (AGPL-3.0)
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd>简体中文</kbd></a>
  <a href="./zh-TW.md"><kbd>繁體中文</kbd></a>
  <a href="./ja.md"><kbd>日本語</kbd></a>
  <a href="./ko.md"><kbd>한국어</kbd></a>
  <a href="./es.md"><kbd>Español</kbd></a>
  <a href="./fr.md"><kbd>Français</kbd></a><br>
  <a href="./de.md"><kbd>Deutsch</kbd></a>
  <a href="./pt-BR.md"><kbd><b>Português (Brasil)</b></kbd></a>
  <a href="./it.md"><kbd>Italiano</kbd></a>
  <a href="./ru.md"><kbd>Русский</kbd></a>
  <a href="./tr.md"><kbd>Türkçe</kbd></a>
  <a href="./vi.md"><kbd>Tiếng Việt</kbd></a>
  <a href="./id.md"><kbd>Bahasa Indonesia</kbd></a>
</p>
<p align="center">
  <a href="#install">Instalação</a> · <a href="#configure">Configuração</a> · <a href="../CHANGELOG.md">Histórico de versões</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="Versão mais recente"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <img src="../docs/images/editor.png" alt="O editor do ColTex: arquivos, o código LaTeX, o PDF compilado e o agente de IA" width="900">
</p>

<a id="why"></a>
## Por que o ColTex?

O ColTex é uma alternativa ao Overleaf para um grupo de pesquisa, um laboratório ou só para você, rodando em um computador que você controla: um desktop no laboratório, um servidor em casa ou uma máquina na nuvem.

- **Tudo fica no seu servidor.** Projetos, histórico, contas e compilações nunca saem dele. O TeX roda em um contêiner isolado, sem acesso à internet.
- **Feito para escrever em conjunto.** Várias pessoas editam o mesmo arquivo ao mesmo tempo, com comentários, controle de alterações, chat e histórico de versões.
- **Um agente de IA que trabalha no seu projeto.** Ele lê os arquivos e o log de compilação, rascunha alterações, faz uma compilação de teste e mostra um diff. Nada é gravado até você aplicar.
- **Um comando para instalar, nenhuma porta para abrir.** Tailscale e Cloudflare Tunnel vêm integrados para acesso remoto.

<a id="features"></a>
## Recursos

### Escrita e compilação
- Editor de código (CodeMirror) e editor visual com o editor de tabelas e a janela de figuras do Overleaf, barra de ferramentas, paleta de símbolos, estrutura do documento e trilha de navegação.
- Preenchimento automático de LaTeX, verificação de código, pré-visualização de equações, verificação ortográfica em muitos idiomas, contagem de palavras, busca e substituição em todo o projeto e atalhos de Vim ou Emacs.
- Compila com latexmk em um TeX Live completo. O motor (pdfLaTeX, XeLaTeX ou LuaLaTeX) é escolhido a partir do documento, inclusive para chinês (ctex, xeCJK).
- Pré-visualização do PDF com SyncTeX nos dois sentidos, também em uma janela separada. Os erros de compilação ficam sublinhados no código, com dicas em linguagem simples.
- Referências: cite a partir dos seus arquivos `.bib`, busque no Crossref e no arXiv (ou cole um DOI ou um ID do arXiv) para adicionar entradas, ou importe uma biblioteca ou coleção do Zotero e mantenha-a sincronizada.

### Colaboração
- Edição em tempo real com os cursores de todos, comentários com @menções, controle de alterações (aceitar, rejeitar e desfazer uma decisão), chat do projeto e notificações no app.
- Funções por projeto: proprietário, editor, revisor (só sugestões) e leitor.
- Histórico de versões como no git: versões automáticas, versões salvas com uma mensagem e reversão das alterações de uma versão.
- Acesso via Git: clone um projeto, trabalhe nele localmente e envie de volta com push (tokens pessoais; as edições feitas no navegador nesse meio-tempo são mescladas).

### Agente de IA
- Pergunte sobre LaTeX, seu projeto ou sua escrita, ou deixe que ele corrija os erros de compilação. Ele rascunha as alterações em uma cópia privada, faz uma compilação de teste e mostra um diff; você aplica tudo ou só uma parte.
- Aplicar salva uma versão antes e recompila; se a compilação piorar, a alteração é revertida automaticamente.
- Provedores: chaves de API (Anthropic, OpenAI, DeepSeek, Google, OpenRouter e outros), login de assinatura (Claude Pro/Max, ChatGPT, GitHub Copilot e outros) ou seu próprio servidor compatível com OpenAI (Ollama, vLLM, LM Studio).
- Escolha automática de modelo (um modelo leve ou forte por mensagem), acesso por grupo de pessoas, uso por pessoa e limites de uso por dia, semana ou mês.
- Conversas salvas por projeto, a janela de contexto exibida à medida que você avança e `/compact` para resumir uma conversa longa.
- Skills: instruções suas e do projeto (formato Agent Skills) que o agente segue, usadas com `/name`; escreva-as você mesmo, importe-as ou crie-as com a IA nas Configurações.
- Permissões como as do Claude Code: as alterações do agente de IA esperam a sua revisão (Manual), são aplicadas quando ele termina (Automático), ou ele também pode excluir e mover arquivos (Acesso total).
- Seu próprio agente (Claude Code, Codex, Cursor…) via MCP: um único endereço para todos os seus projetos, com as mesmas permissões (no Manual, as edições dele viram sugestões suas).

### Projetos e administração
- Modelos para IEEE, ACM, Springer LNCS, Elsevier, REVTeX e arXiv, e conversão de um artigo de um modelo de periódico para outro.
- Importação e exportação de zip do Overleaf, arquivos vinculados de uma URL ou de outro projeto, etiquetas, arquivo e lixeira.
- Sem cadastro público: as contas vêm de links de convite. Um administrador do sistema e administradores que gerenciam, cada um, a equipe que convidaram.
- Monitoramento, backups via WebDAV (com criptografia opcional), armazenamento local ou compatível com S3, temas claro e escuro, e interface em 14 idiomas (inglês, chinês, japonês, coreano, espanhol, francês, alemão, português, italiano, russo, turco, vietnamita e indonésio).

<a id="install"></a>
## Instalação

Você precisa de uma máquina Linux ou macOS com Docker (no Linux, o instalador pode configurá-lo), pelo menos 2 núcleos de CPU e 4 GB de memória. As imagens vêm pré-compiladas para x86-64 e ARM64.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Se o download for interrompido (`curl: (35) Recv failure: Connection reset by peer`, comum quando o GitHub está difícil de acessar), execute o comando de novo.

Ele pergunta o idioma e a edição do TeX Live (com as setas do teclado), coloca a versão mais recente em `~/coltex`, baixa as imagens pré-compiladas com uma barra de progresso, inicia o ColTex e mostra os endereços para abrir. A saída completa vai para `~/coltex/install.log`. Depois, abra `http://<server>:3690` e crie a conta de administrador. O acesso remoto pelo Tailscale ou pelo Cloudflare Tunnel é ativado depois em **Configurações → Rede**.

A primeira inicialização baixa o TeX Live. Escolha uma edição:

| Edição | Download | Disco (todo o ColTex) | Espaço livre recomendado |
| --- | --- | --- | --- |
| **standard** (padrão) | cerca de 3 GB | cerca de 12 GB | 20 GB |
| **full** (`--edition full`) | cerca de 8 GB | cerca de 23 GB | 35 GB |

As duas têm todos os pacotes do TeX Live e compilam os mesmos documentos, e o agente de IA funciona com qualquer uma. A standard não traz os manuais dos pacotes; a full acrescenta os manuais e os códigos-fonte, que o agente de IA também pode ler.

`--edition` e `--lang` respondem às perguntas, ou as substituem quando não há terminal. `--domain`, `--tailscale` e as opções da Cloudflare configuram o acesso remoto já na instalação, para instalações automatizadas. Coloque as opções depois de `bash -s --`:

| Opção | |
| --- | --- |
| `--domain tex.example.org` | HTTPS para um servidor com domínio próprio, pelo Caddy incluído. Aponte o domínio para o servidor e abra as portas 80 e 443 |
| `--tailscale` | Coloca o ColTex na sua tailnet: mostra um link de login e um QR code |
| `--cloudflare-token TOKEN` | Conecta um túnel da Cloudflare que você criou para o seu próprio domínio |
| `--cloudflare-quick` | Um endereço público temporário `trycloudflare.com`, para experimentar |
| `--edition full` | A edição full do TeX Live |
| `--lang LANG` | O idioma do instalador, do `coltex` e da página de configuração inicial: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, `it`, `ru`, `tr`, `vi` ou `id` (perguntado quando não informado) |
| `--port 3690` | Outra porta |
| `--version v0.0.1` | Uma versão específica (`main` para o branch de desenvolvimento) |
| `--build` | Compila as imagens a partir do código-fonte nesta máquina em vez de baixá-las |
| `--images REGISTRY` | De onde baixar as imagens: `aliyun` (as mesmas imagens no Alibaba Cloud), `ghcr` (`ghcr.io/lewen-cai`) ou outro espelho do ghcr.io. Sem a opção, o instalador usa o Alibaba Cloud na China continental e o ghcr.io no resto (o `registry-mirrors` do Docker só vale para o Docker Hub, não para o ghcr.io) |

Em um servidor acessível pela internet, não faça login por `http://` simples: use `--domain`, Tailscale ou um túnel da Cloudflare.

### Gerenciar e atualizar

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
## Configuração

Tudo é configurado no navegador, em **Configurações**, no menu do usuário:

1. **Gerenciar usuários** e **Convites**: convide pessoas com links (cada um funciona uma vez, opcionalmente para um único e-mail).
2. **Serviços de IA**: conecte um provedor. Depois, em **Uso e acesso à IA**, coloque as pessoas em um grupo que possa usá-lo. Sem grupo, ninguém além do administrador do sistema tem o agente de IA.
3. **Rede**: os endereços pelos quais o ColTex é acessado, além do Tailscale e do Cloudflare Tunnel.
4. **Armazenamento e backups**: backups diários ou semanais para uma pasta WebDAV (Nextcloud, um NAS…).

A documentação de ajuda vem integrada: **Documentação de ajuda** no menu do usuário. As operações de servidor (variáveis de ambiente, S3, restauração de um backup) estão em [docs/operations.md](../docs/operations.md) (em inglês).

<a id="feedback"></a>
## Primeiras versões: abra issues

O ColTex é jovem (0.0.x). Ele é usado e testado todos os dias, mas ainda não foi tudo descoberto. Se algo quebrar, parecer errado ou for difícil de usar, [abra uma issue](https://github.com/Lewen-Cai/coltex/issues): todo relato ajuda.

Um relato útil traz a versão (`coltex version`), o que você fez e o que aconteceu e, se o servidor estiver envolvido, as linhas relevantes de `coltex logs`. Não inclua senhas, chaves de API nem conteúdo privado de documentos.

<a id="development"></a>
## Desenvolvimento

Node 24 ou mais recente, pnpm 11 e Docker.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| Caminho | |
| --- | --- |
| `apps/web` | O app web: React, CodeMirror 6, PDF.js |
| `apps/server` | A API: Fastify, contas, projetos, colaboração em tempo real, o agente de IA |
| `services/compiler` | O worker de compilação em um contêiner TeX Live |
| `packages/*` | Schemas compartilhados, o analisador de logs, suporte à linguagem LaTeX, dados de revisão e conversão de modelos |

A arquitetura está descrita em [docs/architecture.md](../docs/architecture.md) (em inglês).

<a id="acknowledgements"></a>
## Agradecimentos

- [Overleaf](https://github.com/overleaf/overleaf) (AGPL-3.0): o ColTex porta dele o analisador de logs e as dicas, o suporte à linguagem LaTeX, o editor visual, o editor de tabelas, a verificação ortográfica e a contagem de palavras. Todo arquivo portado está listado em [NOTICE](../NOTICE).
- [Pi](https://github.com/earendil-works) (`pi-ai`, `pi-agent-core`): os provedores de modelos e o loop do agente por trás do agente de IA.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck) (AGPL-3.0): o monitoramento da saúde dos provedores e a escolha automática de modelo foram adaptados dele.
- [Yjs](https://github.com/yjs/yjs) e [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT): logotipos dos provedores. As marcas pertencem aos seus donos e servem só para identificar o serviço.

<a id="license"></a>
## Licença

[AGPL-3.0](../LICENSE). Se você disponibilizar um ColTex modificado para outras pessoas por uma rede, precisa oferecer a elas o código-fonte dele. O código de terceiros mantém a própria licença; veja [NOTICE](../NOTICE).
