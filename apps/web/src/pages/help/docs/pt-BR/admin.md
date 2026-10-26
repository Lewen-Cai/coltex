# Administração

O administrador do sistema vê as páginas de Administração em **Configurações**, no menu do avatar; os administradores veem ali **Gerenciar usuários** e **Convites**, para a própria equipe.

## Usuários e convites

- Não há cadastro público: as contas vêm só de links de convite, e os projetos só são compartilhados com pessoas que têm conta.
- As contas têm uma de três funções:
  - **Membro**.
  - **Administrador**: lidera uma **equipe**, por exemplo um orientador e seus alunos. Os membros que um administrador convida entram na equipe dele, e o administrador gerencia só esses membros.
  - **Administrador do sistema**: existe exatamente um, a conta criada na configuração inicial. Ele administra a instância inteira (serviços de IA, backups, rede) e vê todos. Ninguém pode se tornar um segundo, para que uma conta de administrador não consiga tomar conta da instância.
- **Convites**: links de uso único, para um e-mail ou (com o e-mail em branco) para qualquer pessoa com o link, com data de expiração. Os links de um convite pendente continuam na lista (**Link**), um para cada endereço pelo qual o ColTex pode ser acessado (rede local, Tailscale, Cloudflare). O administrador do sistema convida membros ou administradores e escolhe o **Grupo de IA** da nova conta. Os administradores convidam só membros, para a própria equipe; esses membros recebem o grupo de IA do administrador. Os administradores veem e revogam só os próprios convites.
- **Gerenciar usuários**: o administrador do sistema vê todas as contas, torna pessoas membros ou administradores, move membros entre equipes (**Equipe** no menu da linha), redefine senhas, abre **Logins e dispositivos** e suspende ou exclui contas. A lista marca com **Bloqueada** as contas bloqueadas e com **Duas etapas** as que têm a verificação em duas etapas ativada. Um administrador vê a si mesmo e à sua equipe, e redefine senhas, suspende ou exclui só os membros da própria equipe. Excluir uma conta exclui os projetos dela.
- Para passar a função de administrador do sistema para outra pessoa (ou recuperá-la quando essa conta for perdida), execute `coltex cli system-admin <email>` no servidor; o administrador do sistema anterior passa a ser administrador.
- Esqueceu uma senha, inclusive a do administrador do sistema? Execute `coltex cli reset-password <email>` no servidor: ele pede a nova senha duas vezes e desconecta essa conta em todos os lugares. O dono da conta recebe uma notificação de que isso aconteceu, e o log do servidor (`coltex logs`) registra o ocorrido.
- Perdeu o celular da verificação em duas etapas e os códigos de recuperação? `coltex reset-2fa <email>` a desativa para essa conta (com uma notificação ao dono e uma linha no log do servidor).

## Logins

Só o administrador do sistema vê **Logins**: todos os logins na instância (inclusive tentativas com e-mails que não têm conta), com o resultado, o navegador e o sistema, e o endereço com a localização. Clique em uma pessoa (ou use **Logins e dispositivos** em Gerenciar usuários) para ver os logins dela e os dispositivos em que ela está conectada; **Sair** encerra a sessão de um dispositivo, **Sair de todos os lugares**, a de todos. Todos os demais veem só os próprios, em **Configurações → Conta**.

O ColTex protege o login por conta própria, sem serviços externos. Um endereço conta como conhecido para uma conta quando ela entrou a partir dele nos últimos 90 dias.

- A partir de endereços desconhecidos, as falhas contam para a conta, qualquer que seja o endereço: a partir da terceira tentativa, o navegador primeiro resolve um pequeno desafio (prova de trabalho, cerca de um segundo, automático); depois de 5 falhas, 15 minutos de espera; depois de 10, a conta fica **bloqueada** para endereços desconhecidos. O administrador do sistema recebe uma notificação e a desbloqueia aqui ou em Gerenciar usuários (**Desbloquear**).
- A partir de endereços conhecidos, cada 5 falhas significam 15 minutos de espera, e eles nunca são bloqueados: o dono ainda consegue entrar de onde costuma trabalhar enquanto a conta está bloqueada.
- Um endereço na internet que falha 20 vezes em uma hora, com quaisquer contas, fica bloqueado por um dia; os endereços bloqueados aparecem no topo de **Logins** com **Desbloquear**. Endereços da rede local ou da tailnet nunca são bloqueados: várias pessoas podem compartilhar um.

Ficou sem acesso você mesmo? Execute `coltex unlock <email>` (ou `coltex unlock <address>` para um endereço bloqueado) no servidor.

## Serviços de IA

- **Serviços de IA**: conecte provedores com chaves de API ou login de assinatura (Claude Pro/Max, ChatGPT, Copilot…), ou seus próprios servidores compatíveis com OpenAI (Ollama, vLLM, LM Studio…). As chaves são guardadas criptografadas, os membros nunca as veem, e as solicitações passam por este servidor.
- Se um login de assinatura terminar em um endereço localhost que não carrega, copie o endereço completo da barra de endereços de volta para o ColTex.
- Defina os três modelos do **Automático** e todos começam na escolha automática: o **avaliador** (um modelo barato e rápido) lê cada mensagem e a passa para o modelo **leve** (perguntas rápidas, pequenas correções) ou para o **forte** (vários erros, alterações em vários arquivos, escrita cuidadosa). Até que os três estejam definidos, as pessoas começam no primeiro modelo que podem usar.
- **Pesquisa na web**: os modelos da Anthropic, da OpenAI e do ChatGPT pesquisam com a própria pesquisa integrada, sem nada a configurar. Para os demais modelos, **conecte** um serviço de pesquisa (DeepSeek, Tavily, Exa ou Brave Search) e cole a chave de API; o DeepSeek também pode usar a chave de um provedor DeepSeek conectado. **Testar**, no menu dele, faz uma pesquisa. Algumas contas precisam antes permitir a pesquisa integrada no provedor: se as solicitações falharem, desligue-a no menu desse provedor, e os modelos dele passam a usar o serviço de pesquisa. Todos que têm o agente de IA podem usar a web e, enquanto puderem, as alterações do agente de IA sempre aguardam revisão.
- **Uso e acesso à IA**: solicitações e tokens do grupo e por pessoa. Quem pode usar quais modelos é definido com **Grupos de IA**: cada grupo permite provedores (inclusive modelos adicionados depois) ou modelos específicos, ex.: "Doutorandos" com o modelo forte e "Graduandos" com o leve. Cada pessoa está em no máximo um grupo, escolhido no convite ou depois, abrindo a pessoa na lista. Pessoas sem grupo não podem usar o agente de IA, então as novas pessoas ficam sem IA até o administrador do sistema adicioná-las (membros convidados por um administrador recebem o grupo do administrador). O administrador do sistema sempre pode usar todos os modelos. Excluir um grupo deixa as pessoas dele sem IA até entrarem em outro.

  Um grupo também pode limitar quanto cada membro usa por dia, semana ou mês: tokens, custo (a preços de tabela) ou ambos. Uma mensagem é recusada quando um membro atinge o limite, até o próximo período começar (dias corridos, semanas a partir de segunda-feira, meses, no fuso horário do servidor); a mensagem que ultrapassa o limite ainda é concluída. Os membros veem o que já usaram abaixo da caixa de mensagem do agente de IA. O administrador do sistema não tem limites.

  Para ajustar uma pessoa, abra-a na lista: em **Personalizar**, **Acesso próprio a modelos** e **Limite de uso próprio** substituem os do grupo enquanto estiverem ativados (o acesso próprio funciona também sem grupo). A lista as marca como **Personalizado**.

## Armazenamento e backups

- Os arquivos dos projetos ficam no disco local ou em um armazenamento compatível com S3, definido quando o servidor inicia (`STORAGE` e `S3_*`). O histórico, os resultados das compilações e as cópias de trabalho do compilador ficam no diretório de dados.
- Os **backups via WebDAV** vão para uma pasta no Nextcloud, ownCloud, um NAS ou qualquer servidor WebDAV. Cada backup é um único arquivo com o banco de dados, os arquivos de todos os projetos e o histórico deles. Agende-os diariamente ou semanalmente e escolha quantos manter. Use uma senha de app quando o servidor oferecer.
> **Criptografia**: backups criptografados (AES-256) também contêm o segredo da instância, então os serviços de IA conectados e a verificação em duas etapas continuam funcionando após uma restauração. **Guarde a senha em outro lugar: sem ela, não é possível abrir um backup.** Se você restaurar um backup sem criptografia em um servidor novo (com um novo segredo da instância), as pessoas com verificação em duas etapas não conseguem entrar até você executar `coltex reset-2fa <email>` para elas.
- A restauração é feita no servidor com o comando `restore`, com o servidor parado; veja o guia de operações.

## Monitoramento

**Visão geral** mostra o estado ao vivo do servidor, do compilador e do banco de dados, com gráficos de histórico de CPU, memória e compilações. O servidor coleta amostras a cada 10 segundos e guarda 30 dias, mesmo quando ninguém está com a página aberta.

## Rede

**Rede** lista os endereços pelos quais o ColTex é acessado (os convites e os endereços do Git os usam), ativa o Tailscale e o Cloudflare Tunnel integrados e mostra como as requisições chegam ao servidor. Veja [Implantação e rede](#/help/deployment).
