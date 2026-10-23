# Implantação e rede

Em produção, o ColTex usa uma única porta (3690 por padrão): as páginas, a API, a colaboração ao vivo (WebSocket) e as notificações passam todas por ela. Qualquer coisa que encaminhe HTTP e WebSocket funciona: este computador, uma rede local, Tailscale, Cloudflare Tunnel ou um servidor na nuvem. (3000 e 5173 são as portas do servidor de desenvolvimento.)

## Instalação

No Linux ou no macOS com Docker, um único comando:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Ele pergunta o idioma, a edição e como as pessoas vão acessar o ColTex (com as setas do teclado; opções como `--edition`, `--domain` ou `--lang` respondem no lugar), verifica o Docker (no Linux, pode instalá-lo), coloca o ColTex em `~/coltex`, grava as configurações, baixa as imagens pré-compiladas (x86-64 e ARM64), inicia o ColTex e mostra os endereços para abrir nesta máquina e na sua rede. A primeira inicialização baixa o TeX Live. Há duas edições:

| Edição | Download | Em disco (todo o ColTex) | Espaço livre recomendado |
| --- | --- | --- | --- |
| **standard** (padrão) | cerca de 3 GB | cerca de 12 GB | 20 GB |
| **full** (`--edition full`) | cerca de 8 GB | cerca de 23 GB | 35 GB |

As duas compilam da mesma forma (o TeX Live completo). A edição full acrescenta os manuais e os códigos-fonte dos pacotes, que o agente de IA passa a poder ler; com a standard, ele responde a partir dos arquivos dos pacotes e do próprio conhecimento. Troque depois com `coltex edition full` ou `coltex edition standard`.

O acesso remoto pode ser ativado ao mesmo tempo:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

Depois, gerencie-o com `coltex`:

| Comando | O que faz |
| --- | --- |
| `coltex status` / `logs` | Estado / logs |
| `coltex edition [standard\|full]` | Mostra ou troca a edição do TeX Live (baixa a outra imagem do compilador) |
| `coltex update` | Atualiza para a versão mais recente (baixa as novas imagens); os dados e as configurações são mantidos |
| `coltex stop` / `start` | Para / inicia |
| `coltex tailscale up` | Entra na sua tailnet (mostra um link de login e um QR code) |
| `coltex cloudflare quick` | Um endereço público temporário da Cloudflare |
| `coltex cloudflare token` | Um túnel da Cloudflare com o seu próprio domínio (pede o token) |
| `coltex reset` | Exclui tudo (contas, projetos, o banco de dados) e recomeça a partir da página de configuração inicial; antes, pede que você digite `reset` |
| `coltex uninstall` | Remove o ColTex desta máquina: contêineres, banco de dados, dados, imagens, o comando `coltex` e a pasta dele (o Docker permanece); antes, pede que você digite `uninstall` |

## Login a partir de qualquer endereço

O servidor aceita logins feitos no seu próprio endereço: abra-o em `localhost`, um IP da rede local, um endereço do Tailscale ou um domínio, sem precisar listá-los antes. Uma página de outro site não consegue fazer login de ninguém.

## Quais endereços os links usam

Os links de convite e os endereços de clone do Git são oferecidos uma vez para cada endereço pelo qual o ColTex pode ser acessado, cada um com seu próprio botão de copiar, para que você escolha o que o destinatário consegue abrir:

- **Rede local** ou **Tailscale**: o endereço pelo qual você abriu o ColTex (reconhecido pelo próprio endereço);
- **Tailscale**, **Cloudflare**: os endereços do Tailscale ou do Cloudflare Tunnel integrados enquanto estão conectados. Eles aparecem e desaparecem junto com eles; nada precisa ser alterado quando um deles é desativado;
- **Endereço público**: o `COLTEX_URL` do servidor, quando definido.

Os links de um convite pendente continuam na lista de convites até ele ser usado ou expirar.

## Tailscale

O ColTex tem o Tailscale integrado: ele pode entrar na sua tailnet como um dispositivo próprio (chamado `coltex` por padrão). Nada precisa ser instalado no servidor, e funciona em servidores sem interface gráfica.

1. Em **Configurações → Rede**, ative o Tailscale.
2. Escaneie o QR code com um celular, ou abra o link em qualquer dispositivo, e entre na sua tailnet. A página muda para Conectado sozinha.
3. Ative **Disponibilizar o ColTex na tailnet**. Com MagicDNS e HTTPS ativados na tailnet, o endereço é `https://coltex.<your tailnet>.ts.net`; caso contrário, `http://coltex.<your tailnet>.ts.net`.

Quando nenhum navegador ainda consegue acessar a página de configurações, execute isto no servidor:

```sh
coltex tailscale up
```

Ele ativa o Tailscale, mostra o link de login e um QR code no terminal, espera o login e então disponibiliza o ColTex na tailnet. `coltex tailscale status` mostra o estado, `coltex tailscale down` sai da tailnet e `coltex tailscale off` o desativa.

`TS_HOSTNAME` altera o nome do dispositivo. O próprio servidor executa o Tailscale: sem contêiner extra nem privilégios adicionais. As chaves do dispositivo ficam em `data/tailscale` e não entram nos backups; depois de uma restauração, entre de novo.

Se o servidor já executa o Tailscale por conta própria, você não precisa do integrado: abra o ColTex pelo IP do Tailscale ou pelo nome MagicDNS do servidor com `:3690`.

## Cloudflare Tunnel

O ColTex também tem o Cloudflare Tunnel integrado, apenas como túnel: as pessoas continuam entrando com suas contas do ColTex; não é preciso Cloudflare Access. O servidor não precisa de nenhuma porta aberta.

- **Link temporário**: sem conta na Cloudflare; você recebe `https://<random>.trycloudflare.com`, que muda toda vez que o túnel é iniciado. Para experimentar.
- **Túnel com meu domínio**: com o seu domínio na Cloudflare, crie um túnel em Zero Trust → Networks → Tunnels e copie o comando em “Run the following command” (de qualquer sistema: Windows, macOS, Debian, Red Hat ou Docker); o ColTex extrai o token dele; adicione um hostname público ao túnel (ex.: `tex.example.org`) com o serviço `http://localhost:3690`.

Ative-o com a chave do cartão do Cloudflare Tunnel em **Configurações → Rede** e escolha um link temporário ou um túnel (o salvo, ou um novo a partir do comando colado), ou no terminal com `coltex cloudflare quick` / `coltex cloudflare token`. Depois de conectado, os endereços dele aparecem sozinhos nos links de convite. O token é guardado criptografado e nunca mais é mostrado.

Se o túnel não consegue alcançar a Cloudflare via QUIC (um firewall, ou um proxy que descarta UDP), o ColTex passa sozinho para HTTP/2. Quando o trycloudflare.com limita os links temporários (429 Too Many Requests), o ColTex tenta de novo com intervalos cada vez maiores. Ao trocar o túnel, mova os hostnames públicos dele para o novo túnel no painel da Cloudflare; até lá, eles respondem com Error 1033.

## Configurações do servidor

Estas são variáveis de ambiente do servidor. Com Docker, coloque-as no arquivo `.env` ao lado do `docker-compose.yml` e execute `docker compose up -d`.

| Variável | O que faz |
| --- | --- |
| `COLTEX_PORT` | A porta, 3690 por padrão |
| `COLTEX_URL` | Um endereço público oferecido em todos os links, ex.: `https://tex.example.org` |
| `TRUSTED_ORIGINS` | Outros endereços que o login aceita, separados por vírgula. Necessário só quando as páginas e a API estão em endereços diferentes |
| `TRUST_PROXY` | Com um proxy reverso na frente (Caddy, Nginx): `uniquelocal` (proxy em uma rede privada) ou `true`. Sem ela, o servidor toma o proxy pelo visitante, e todos compartilham um único limite de tentativas de login |
| `TS_HOSTNAME` | O nome do dispositivo do Tailscale integrado, `coltex` por padrão |

**Como as requisições chegam**, no fim de **Configurações → Rede**, mostra essas configurações e o IP que o servidor vê, e aponta problemas.

## Configurações comuns

| Cenário | Como |
| --- | --- |
| Só este computador | Os padrões: `http://localhost:3690` |
| Rede local | Abra pelo endereço do servidor na rede local, ex.: `http://192.168.1.20:3690`. Os endereços da rede local podem mudar; reserve um no roteador para uso prolongado |
| Tailscale | Veja Tailscale acima |
| Cloudflare Tunnel | Veja Cloudflare Tunnel acima |
| Servidor na nuvem | Com um domínio: instale com `--domain tex.example.org` (aponte o DNS dele para o servidor e abra as portas 80 e 443). O Caddy incluído obtém o certificado HTTPS; a porta 3690 passa a responder só no próprio servidor. Sem domínio: Cloudflare Tunnel ou Tailscale |

## Segurança

- Para um grupo pequeno, acessar o ColTex só pelo Tailscale ou por uma VPN é o mais simples: ele não fica visível na internet. Com o Cloudflare Tunnel ele é público, protegido pelo login do ColTex.
- Na internet, use HTTPS (Caddy, como na configuração em nuvem).
- Um firewall no servidor (ufw, firewalld) não fecha as portas que o Docker publica. Com `--domain`, a porta 3690 só responde no próprio servidor; usando Tailscale ou um túnel da Cloudflare, feche a 3690 no firewall do seu provedor de nuvem.
- Não há cadastro público, só convites; as senhas têm regras de força; o login permite 3 tentativas a cada 10 segundos por IP.
- Uma porta incomum não impede os scanners; não conte com ela.
