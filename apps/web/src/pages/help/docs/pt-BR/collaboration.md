# Colaboração

## Convidar pessoas

Clique em **Compartilhar** no canto superior direito do editor:

- Os projetos só são compartilhados com pessoas que têm conta neste servidor. Digite parte de um nome ou e-mail, escolha a conta na lista, escolha uma função e clique em **+**.
- Quem não tem conta precisa primeiro de um link de convite de um administrador ou do administrador do sistema; veja [Administração](#/help/admin).
- Altere funções, transfira a propriedade ou remova pessoas na lista de membros. Só o proprietário gerencia os membros.

### Compartilhar com um grupo

O proprietário pode compartilhar um projeto com um grupo de que participa: em **Compartilhar**, digite parte do nome do grupo, escolha-o (os grupos aparecem antes das pessoas), escolha uma função e clique em **+**.

- Todos que entraram no grupo recebem essa função. Quem entrar depois também recebe; quem sair perde.
- O grupo aparece com o número de membros e a função, que é alterada ali; o menu ⋯ dele tem **Parar de compartilhar**.
- Os membros aparecem na lista "por meio de" o grupo. A função vem do grupo; para dar outra função a um deles, adicione-o individualmente, e as mudanças do grupo deixam de afetá-lo.

### Funções

| Função | Pode |
| --- | --- |
| Proprietário | Tudo, incluindo os membros e excluir o projeto; administradores também podem publicá-lo como modelo |
| Editor | Editar e gerenciar arquivos, aceitar ou rejeitar sugestões |
| Revisor | Alterar o texto só por meio de sugestões controladas; comentar |
| Leitor | Ler, compilar, baixar, comentar |

## Editar em conjunto

Várias pessoas podem editar o mesmo arquivo ao mesmo tempo; cada cursor tem sua própria cor, e o cabeçalho mostra quem está presente. As alterações são sincronizadas ao vivo; não há nada para salvar.

## Comentários

Selecione um texto e clique no botão de comentário na barra de ferramentas (ou pressione `Mod+Alt+M`). Os comentários ficam no painel **Revisão** à esquerda, onde você pode respondê-los, editá-los e resolvê-los. Digite `@` para mencionar alguém; a pessoa recebe uma notificação.

## Controle de alterações

No painel Revisão, ative o controle de alterações para todos ou para algumas pessoas. As edições passam a ser sugestões:

- o texto excluído aparece riscado e o texto novo, destacado;
- os editores as **aceitam** ou **rejeitam**, uma a uma ou todas de uma vez; uma decisão tomada por engano pode ser revertida com **Desfazer** na mensagem que aparece em seguida (por 15 minutos);
- as edições dos revisores são sempre controladas; eles podem **retirar** as próprias sugestões no painel;
- seus próprios enganos: `Ctrl/Cmd+Z` desfaz suas edições controladas, e digitar de volta, no mesmo lugar, um texto que você excluiu o restaura em vez de criar uma nova sugestão;
- o PDF mostra o texto com as sugestões incorporadas.

## Chat

**Chat**, na barra lateral esquerda, é o chat do projeto:

- `Enter` envia, `Shift+Enter` começa uma nova linha.
- `@` menciona um membro.
- A matemática entre `$…$` é renderizada, ex.: `$x^2$`.

## Notificações

Menções no chat ou em comentários, respostas aos seus comentários, ser adicionado a um projeto e convites para grupos aparecem em **Notificações**, com o número de não lidas na barra lateral. Ficam só no ColTex; nada de e-mail.
