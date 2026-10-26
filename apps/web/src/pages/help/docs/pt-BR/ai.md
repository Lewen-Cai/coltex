# Agente de IA

**IA**, na barra lateral esquerda, abre o agente de IA. Ele fica disponível assim que um administrador conecta um serviço de modelos e adiciona você a um grupo de IA; o grupo decide quais modelos você pode usar.

## O que ele faz

- Responde a perguntas sobre LaTeX e explica o código selecionado.
- Explica ou corrige erros de compilação (o log também tem um botão "Corrigir com IA").
- Reescreve, aprimora ou traduz a seleção.
- Dá uma visão geral do projeto, encontra rótulos sem referência e assim por diante.

O arquivo aberto, a seleção e os erros de compilação recentes são anexados à sua mensagem; clique em um anexo para deixá-lo de fora.

## Permissões

O que o agente de IA pode alterar é você quem decide: escolha em **Configurações → Agente de IA** ou no seletor de modelo embaixo do painel (abaixo do nível de raciocínio); a linha abaixo da caixa de mensagem mostra a escolha. A mesma escolha vale para os seus próprios agentes conectados via MCP (veja abaixo).

- **Manual** (o padrão): as alterações do agente de IA vão para um rascunho, e nada muda até você aplicá-lo.
  1. Quando ele termina, o rascunho passa por uma compilação de teste e você fica sabendo se ele acrescenta erros.
  2. **Revisar alterações** mostra o diff por arquivo; você pode aplicar só uma parte.
  3. **Aplicar** grava as alterações no projeto e compila; se a compilação piorar, tudo é revertido. Uma versão é salva antes de aplicar.
  4. Depois de aplicar, **Desfazer** reverte as alterações e mantém as edições que outras pessoas fizeram nesse meio-tempo.
- **Automático**: o rascunho é aplicado assim que o agente de IA termina a resposta, com as mesmas salvaguardas: uma versão é salva antes, o projeto é compilado, uma compilação pior é revertida e **Desfazer** fica disponível depois. Se alguém alterou as mesmas linhas nesse meio-tempo, nada é aplicado e o rascunho espera por você. Quando você interrompe o agente de IA, o rascunho dele também espera por você.
- **Acesso total**: como no Automático, e o agente de IA também pode excluir, mover e renomear arquivos. Isso acontece na hora, fora do rascunho; uma versão é salva antes da primeira dessas operações em cada resposta. A resposta as lista junto com os arquivos que alterou.

Leitores e revisores podem fazer perguntas ao agente de IA, mas ele não pode alterar nada por eles.

## A web

Depois que a pesquisa na web estiver configurada, o agente de IA pode pesquisar na web e ler páginas: as normas atuais para autores de uma revista, as notas de versão de um pacote, uma fonte para conferir uma afirmação. Os modelos da Anthropic, da OpenAI e do ChatGPT usam a própria pesquisa integrada; os demais, o serviço de pesquisa que o administrador conectou. As pesquisas e as páginas lidas aparecem como etapas na conversa, e ele diz de quais páginas vem cada resposta.

Para que nada do seu projeto saia por esse caminho:
- As pesquisas vão só para o serviço de pesquisa escolhido pelo administrador (ou para a pesquisa do próprio modelo) e têm no máximo 128 caracteres.
- Ele só lê endereços que você escreveu na conversa ou que as pesquisas retornaram, exatamente como estão; não pode inventar um endereço.
- Ele só lê: nada é enviado.

Qualquer pessoa pode escrever uma página web, e ela pode conter instruções feitas para enganar o agente de IA. Por isso, enquanto você tiver a web, as alterações do agente de IA sempre aguardam sua revisão, mesmo com **Automático** ou **Acesso total**, e ele não exclui nem move arquivos. Suas ferramentas de IA (MCP) seguem sua permissão.

## Modelos e raciocínio

- Escolha o modelo embaixo do painel. Com **Automático**, o ColTex escolhe um modelo leve ou forte conforme a pergunta.
- Para modelos que raciocinam, o nível é definido no mesmo seletor; a linha abaixo da caixa de mensagem o mostra.

## Conversas e contexto

- As conversas ficam salvas para você, por projeto (os outros nunca as veem). **Nova conversa** inicia outra; **Conversas** lista as anteriores: abra, renomeie ou exclua. Reabrir uma conversa a continua de onde parou; um rascunho que não foi aplicado não é mantido, por isso sair de uma conversa com rascunho pede confirmação.
- O anel abaixo da caixa de mensagem mostra quanto da janela de contexto do modelo a conversa usa (ex.: `12k / 200k`). Ele fica âmbar em 70% e vermelho em 90%.
- Se o seu grupo de IA tem um limite de uso, uma barra ao lado mostra o que você já usou neste dia, semana ou mês (passe o mouse para ver detalhes). Quando você o atinge, as mensagens esperam até o próximo período. **Configurações → Agente de IA** mostra seu uso nos últimos 30 dias e o que resta.
- Digite `/` na caixa de mensagem para ver os comandos:
  - `/compact`: resume a conversa até aqui e continua a partir do resumo, liberando o contexto. As mensagens continuam visíveis; o agente de IA se lembra delas pelo resumo.
  - `/new`: inicia uma nova conversa.
  - `/chats`: as conversas anteriores.
- A caixa de mensagem cresce conforme você digita. Arraste a borda de cima para deixá-la mais alta (fica assim neste navegador, também no chat do projeto); clique duas vezes na borda para voltar.

## Skills

Uma skill é um conjunto de instruções para uma tarefa que você faz repetidamente, por exemplo "encurtar um resumo até o limite do periódico" ou "verificar se toda figura é referenciada". As skills usam o formato Agent Skills (um `SKILL.md` com nome, descrição e instruções), então skills escritas para outros agentes de IA também funcionam aqui.

- **Suas skills** ficam em **Configurações → Skills de IA**; só você as vê, e você pode usá-las em todos os projetos.
- Para adicionar skills que você já tem, use **Importar**: **Enviar arquivos** aceita um `SKILL.md` com seus arquivos de referência, ou um `.zip` de pastas de skills; **Enviar pasta** aceita a pasta de uma skill, ou uma pasta com várias. Scripts em uma skill são guardados como texto que o agente de IA pode ler; nada em uma skill é executado.
- Para usar uma, digite `/` e escolha-a, depois acrescente sua mensagem (`/polish-abstract keep it under 200 words`). O agente de IA também lê as descrições e carrega uma skill por conta própria quando o seu pedido se encaixa nela.
- Peça ao agente de IA para transformar algo em uma skill ("salve como skill o jeito como acabamos de corrigir a bibliografia"): ele rascunha uma na conversa, e você a edita ou salva nas suas skills.
- Em **Configurações → Skills de IA**, suas skills aparecem à esquerda; escolha uma para ler as instruções e os arquivos de referência, ou **Criar com IA** para abrir uma conversa com o agente de IA para escrever skills (**Melhorar na conversa**, em uma das suas skills, inicia uma mensagem sobre ela). A conversa segue a skill integrada **skill-creator**: ela pergunta como você usaria a skill, rascunha-a (com arquivos de referência quando ajudam) e pode testar um rascunho em um texto que você colar. Os rascunhos só são salvos quando você os salva; salvar um com um nome que você já usa pede confirmação antes de substituir. A conversa é mantida até você iniciar uma nova.
- O ColTex vem com skills integradas (listadas em **Integradas**). Você pode lê-las e baixá-las, mas não alterá-las; uma skill sua com o mesmo nome é usada no lugar.
  - **skill-creator**: escrever skills (a conversa de skills segue esta).

## Suas próprias ferramentas de IA (MCP)

Ferramentas de IA como Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, Gemini CLI, Cline ou OpenCode podem trabalhar diretamente nos seus projetos: listá-los, ler e buscar nos arquivos, editá-los, compilar e ler o log, ver o histórico e ler, adicionar e responder comentários. O ColTex é um servidor MCP para elas, com um único endereço para todos os seus projetos; a ferramenta informa em qual projeto trabalha.

Em **Configurações → Agente de IA**, em **Suas ferramentas de IA (MCP)**, escolha sua ferramenta à esquerda e siga os três passos: o endereço, um token (**Criar token**; ele é mostrado uma única vez) e a configuração para copiar, com os dois já preenchidos. Qualquer outra ferramenta que se conecte a servidores MCP via HTTP com um cabeçalho para o token também funciona (**Outros**). Apps que só aceitam servidores com login via OAuth (como os conectores personalizados do Claude ou do ChatGPT) ainda não podem se conectar.

O que suas ferramentas podem alterar segue a sua permissão em **Configurações → Agente de IA**:

- **Manual** (o padrão): as edições delas viram sugestões suas, que você e seus colaboradores aceitam ou rejeitam em **Revisão**. Novos arquivos são criados diretamente.
- **Automático**: as edições delas são aplicadas diretamente, como se fossem suas. Se o controle de alterações estiver ativado para você, elas viram sugestões mesmo assim.
- **Acesso total**: como no Automático, e elas também podem excluir, mover e renomear arquivos.

Antes da primeira alteração de uma ferramenta depois de um tempo, o estado do projeto é salvo como uma versão, para que você possa voltar atrás. As ferramentas de revisores só podem sugerir alterações; as de leitores só podem ler e comentar.

### Segurança

- Qualquer pessoa com o seu token age como você: guarde-o como uma senha e revogue-o na lista de tokens quando não precisar mais dele (um token por ferramenta ou computador facilita isso). Ao criar cada token, dê a ele só o que ele precisa:
  - **Usado para**: Git, MCP ou ambos. Um token criado só para MCP não pode clonar nem fazer push, e vice-versa.
  - **Acesso**: **Somente leitura** permite que uma ferramenta liste, leia, busque e compile, mas não altere arquivos ou comentários (e permite que o git clone e faça pull, mas não push), qualquer que seja a sua permissão.
  - **Projetos**: todos os seus projetos ou só os que você escolher; os outros não existem para o token.
  - **Expira**: depois de 30 dias, 90 dias, um ano, ou nunca. Um token expirado deixa de funcionar; revogue-o e crie um novo.
- O ColTex só responde à sua ferramenta; ele nunca se conecta a outros servidores MCP. O que mais a sua ferramenta pode fazer (um navegador via Playwright MCP, um terminal, outros serviços) depende da ferramenta e das configurações dela. O texto, os comentários e os logs de um projeto podem ser escritos pelos seus colaboradores, então uma ferramenta que os lê pode receber, nesse texto, o pedido de fazer algo com suas outras capacidades. O ColTex orienta as ferramentas a tratar o conteúdo do projeto como conteúdo, não como instruções, mas só a sua ferramenta pode garantir isso: mantenha as confirmações dela ativadas para ações fora do ColTex e use **Manual** quando uma ferramenta também tiver um navegador ou um terminal.
- Uma ferramenta com um navegador conectado ao ColTex age com todos os seus direitos pelas páginas web, e não pelo MCP, então a permissão acima não a limita ali. Deixe essas ferramentas usarem um perfil de navegador que não esteja conectado.
