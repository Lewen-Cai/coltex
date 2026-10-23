# Arquivos

## A árvore de arquivos

- Os botões no cabeçalho dela: novo arquivo, nova pasta, enviar e adicionar um arquivo vinculado.
- Arraste um arquivo para uma pasta para movê-lo; clique duas vezes em um nome para renomeá-lo. Arquivos soltos a partir do seu computador são enviados.
- Clique com o botão direito em um arquivo ou pasta para criar, enviar, renomear ou excluir.
- Um ponto colorido ao lado de um arquivo indica que outra pessoa está com ele aberto.

Arquivos excluídos podem ser recuperados pelo histórico.

## Arquivos vinculados

Um arquivo vinculado vem de outro lugar e pode ser atualizado a partir da origem a qualquer momento:

- **De outro projeto**: qualquer arquivo de outro projeto, ou o PDF compilado dele (compilado antes). Útil para figuras ou um `.bib` compartilhados, ou para usar o PDF de um projeto como figura em outro.
- **De uma URL**: baixado de um endereço público (até 50 MB). Endereços da rede local ou privada não podem ser usados.

> Os arquivos vinculados têm uma marca de link na árvore; passe o mouse para ver de onde vêm. Clique com o botão direito e **Atualizar arquivo vinculado** busca o arquivo de novo e o substitui. Para adicionar ou atualizar, você precisa ter acesso ao projeto de origem.

## Git

Todo projeto pode ser clonado, puxado (pull) e enviado (push) com o git:

1. Crie um token para Git em **Configurações → Serviços de sincronização** (ele é mostrado uma única vez; guarde-o). Um token **Somente leitura** pode clonar e puxar, mas não enviar.
2. Copie o endereço de clone nas configurações do projeto e execute `git clone <address>`. Quando o git pedir, use qualquer nome de usuário e o token como senha.
3. Faça commits localmente e `git push`: as alterações entram no projeto na hora, e os colaboradores as veem.

Bom saber:

- Cada projeto tem um único branch, `main`.
- Se alguém alterou o projeto desde o seu último pull, o git recusa o push: faça `git pull` primeiro e depois envie de novo.
- Antes de um push ser aplicado, o estado do projeto é salvo como uma versão.
- Revisores e leitores não podem fazer push.
- Para não digitar o token toda vez: `git config --global credential.helper store` (ou `osxkeychain` no Mac).
