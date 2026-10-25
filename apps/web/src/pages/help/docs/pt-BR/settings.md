# Configurações

Clique no seu avatar no canto inferior esquerdo e escolha **Configurações**.

- **Conta**: seu nome de exibição (mostrado aos colaboradores, nos comentários e no histórico), a cor do seu avatar (também o seu cursor no editor; **Automático** é a que o ColTex escolheu) e sua senha. Ao alterar a senha, você pode desconectar seus outros dispositivos. As senhas precisam ter 8 ou mais caracteres, com uma letra maiúscula, uma letra minúscula e um número; símbolos são opcionais. A avaliação mostrada enquanto você digita (fraca, razoável, boa, forte) sobe com o comprimento e os símbolos. O cadastro e as redefinições feitas por administradores seguem as mesmas regras. O e-mail de login só pode ser alterado por um administrador. A verificação em duas etapas e a sua atividade de login também ficam nesta página (veja abaixo).
- **Aparência**: o tema (Claro e Escuro em azul, Floresta e Musgo em verde, Lavanda e Ameixa em violeta; Claro por padrão) e o idioma da interface (14 idiomas, entre eles English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français e Deutsch; começa no idioma do seu navegador). Os temas escuros valem também para o editor; as páginas do PDF continuam brancas. O tema fica guardado na sua conta, então acompanha você em outros navegadores (a página de login sempre usa o Claro); o idioma fica guardado neste navegador.
- **Serviços de sincronização**: conecte sua conta do Zotero (veja [Referências](#/help/references)) e crie e revogue tokens do Git (veja [Arquivos](#/help/files)): cada um para Git, MCP ou ambos, leitura e escrita ou somente leitura, para todos os seus projetos ou alguns, com uma data de expiração. Use um token por computador, para poder revogá-lo separadamente.
- **Agente de IA**: seu uso de IA nos últimos 7, 30 ou 90 dias (solicitações, tokens, custo, por dia e por modelo) e o que resta do seu limite (quando você tem o agente de IA), o que os agentes de IA podem alterar por você (**Permissões**) e a conexão dos seus próprios agentes de IA via **MCP**, com os tokens deles; veja [Agente de IA](#/help/ai).
- **Skills de IA** (quando você tem o agente de IA): suas próprias skills, as integradas e uma conversa com o agente de IA para escrever skills; veja [Agente de IA](#/help/ai).

## Verificação em duas etapas

Com a verificação em duas etapas ativada, o login pede, depois da senha, um código de um aplicativo autenticador no seu celular (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…). A escolha é só sua; ninguém mais pode ativá-la por você.

1. Em **Configurações → Conta**, em **Verificação em duas etapas**, clique em **Ativar** e digite sua senha.
2. Escaneie o QR code com o aplicativo (ou digite nele a chave de configuração) e depois informe o código de 6 dígitos que ele mostra.
3. Guarde os 10 **códigos de recuperação** (copie-os ou baixe-os como arquivo). Cada um permite entrar uma vez no lugar de um código, caso você perca o celular. Eles só são mostrados agora.

No login, depois da senha, informe o código do aplicativo ou clique em **Usar um código de recuperação**. **Não perguntar de novo neste dispositivo por 30 dias** dispensa o código naquele navegador. **Novos códigos de recuperação** substitui os antigos (guarde os novos); **Desativar** volta a usar só a senha. Os tokens de Git e MCP funcionam como antes.

> Perdeu o celular e também os códigos de recuperação? O administrador do sistema pode desativar a verificação em duas etapas da sua conta no servidor (`coltex reset-2fa <email>`); depois você entra com a senha e pode ativá-la de novo.

## Atividade de login

**Atividade de login**, no fim de **Configurações → Conta**, lista os logins na sua conta, dos mais recentes para os mais antigos: quando, o resultado (login feito, senha errada, código errado, recusado), o navegador e o sistema, e o endereço com a localização: a rede local, o Tailscale ou, para um endereço na internet, o país, a região, a cidade e a operadora da rede. As localizações vêm de um banco de dados no servidor; os endereços nunca são enviados para fora para consulta. Os registros são mantidos por 90 dias.

As configurações do editor (tamanho da fonte, cores, Vim…) ficam em **Configurações**, embaixo da barra lateral esquerda do editor; veja [Editor](#/help/editor).
