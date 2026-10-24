# Primeiros passos

O ColTex é um editor de LaTeX colaborativo que roda no seu próprio servidor. Ele funciona de forma muito parecida com o Overleaf: o código à esquerda, o PDF à direita, e várias pessoas podem editar o mesmo projeto ao mesmo tempo.

## Novos projetos

Clique em **Novo projeto** no canto superior esquerdo, dê um nome e escolha um modelo:

| Modelo | Classe |
| --- | --- |
| Artigo em branco | A `article` padrão, o começo mais simples |
| Preprint arXiv | `article`, uma coluna, autores com afiliações (authblk), referências natbib |
| Conferência IEEE / Periódico IEEE | `IEEEtran` no modo conferência / periódico |
| Conferência ACM / Periódico ACM | `acmart` sigconf / acmsmall |
| Springer LNCS | `llncs`, para LNCS e outros anais da Springer |
| Periódico Elsevier | `elsarticle`, preprint em uma coluna |
| APS (REVTeX 4.2) | `revtex4-2`, para periódicos Physical Review e AIP |

Exceto o artigo em branco, cada um vem com resumo, palavras-chave, uma equação, uma figura, uma tabela e um `references.bib`, e compila do jeito que está. As classes são as oficiais distribuídas com o TeX Live. Conferências que publicam novos arquivos de estilo todo ano (NeurIPS, ICML) não estão no TeX Live: envie os arquivos do ano para um projeto e publique-o como modelo.

Os projetos que as pessoas publicaram como modelos (o formato de tese de um grupo, por exemplo) aparecem em "Compartilhados neste servidor".

Novos projetos compilam no modo **Automático**: o motor é escolhido a cada compilação a partir do documento; veja [Compilação e PDF](#/help/compiling).

Para trazer um projeto do Overleaf, escolha **Download Source** lá e use **Importar** aqui com o zip (até 200 MB). O documento principal é detectado, e o compilador também fica em Automático. Arquivos de compilação deixados por outros editores (`.aux`, `.log`, `.synctex.gz` e semelhantes) e pastas como `.vscode` são ignorados, como no Overleaf; arquivos `latexmkrc` e `.bbl` são mantidos.

## O editor

- **Em cima**: o nome do projeto, quem está presente, **Histórico** e **Compartilhar**.
- **Barra lateral esquerda**: alterna o painel esquerdo entre arquivos, busca, referências, revisão, chat e IA; os atalhos de teclado e as configurações do projeto ficam embaixo.
- **No meio**: o editor, com **Código / Visual** na barra de ferramentas.
- **À direita**: o PDF, com **Recompilar**, **Logs**, o botão de ir para o PDF, abrir em uma nova janela e baixar.

## Compilação e PDF

- Clique em **Recompilar** ou pressione `Mod+S` / `Mod+Enter`. A compilação automática vem ativada e compila quando você para de digitar.
- **Logs** mostra o número de erros; abra para ver cada um com uma explicação e clique em um deles para ir até a linha. Os erros também são marcados ao lado dos números de linha no editor.
- **Código ↔ PDF**: com o cursor no código, clique na mira na barra do PDF e o PDF rola até aquele ponto; clique duas vezes no PDF para voltar ao código.
- **PDF em uma janela própria**: "Abrir o PDF em uma nova janela" na barra do PDF permite colocar o PDF em outra tela enquanto o editor ocupa a janela inteira. Veja [Compilação e PDF](#/help/compiling).

## Próximos passos

- [Editor](#/help/editor): os dois modos, tabelas e figuras, pré-visualização de equações, verificação ortográfica, o menu do botão direito.
- [Colaboração](#/help/collaboration): convidar pessoas, comentários, controle de alterações, chat.
- [Agente de IA](#/help/ai): explicações e edições, aplicadas só depois que você as revisa.
