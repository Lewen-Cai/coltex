# Primeiros passos

O ColTex é um editor de LaTeX colaborativo que roda no seu próprio servidor. Ele funciona de forma muito parecida com o Overleaf: o código à esquerda, o PDF à direita, e várias pessoas podem editar o mesmo projeto ao mesmo tempo.

## Novos projetos

Clique em **Novo projeto** no canto superior esquerdo, dê um nome e escolha um modelo:

| Área | Modelos |
| --- | --- |
| Geral | Artigo em branco, Preprint arXiv, Periódico Elsevier, Periódico da Elsevier (autor–ano), Periódico da Elsevier (duas colunas), Periódico CAS da Elsevier (duas colunas), Nature, Artigo de revisão, Comunicação breve |
| Computação e engenharia elétrica | Conferência IEEE, Periódico IEEE, Conferência da IEEE Computer Society, Periódico da IEEE Computer Society, Periódico da IEEE Communications Society, Conferência ACM, Periódico ACM, Submissão à ACM (anônima), Conferência ACM SIGPLAN, ACM Transactions on Graphics, Springer LNCS, Anais PMLR |
| Engenharia | Conferência da ASME, Periódico da ASCE, Artigo de conferência da AIAA, Anais da SPIE |
| Física | APS (REVTeX 4.2), Physical Review Letters, Periódico da AIP, Journal of the Physical Society of Japan, Artigo de conferência JACoW |
| Astronomia | Periódicos da AAS (AASTeX), Monthly Notices of the RAS |
| Química | Artigo de periódico da ACS, Letter da ACS |
| Ciências da vida | Artigo de pesquisa em ciências da vida, Nota de aplicação em bioinformática |
| Medicina | Relato de ensaio clínico, Protocolo de ensaio clínico, Estudo observacional, Estudo de acurácia diagnóstica, Revisão sistemática e metanálise, Relato de caso, Carta de pesquisa médica, Periódico Elsevier CAS, Periódico da Oxford University Press |
| Matemática e estatística | Artigo AMS, Anais da AMS, Annals of Mathematics, Artigo de métodos estatísticos |
| Economia | Artigo de economia (estilo AEA), Artigo de econometria |
| Ciências sociais e humanidades | Manuscrito APA 7, Layout de periódico APA 7, Trabalho acadêmico APA 7, Artigo de humanidades (notas Chicago), Ensaio literário (MLA), Artigo jurídico (OSCOLA) |
| Terra e meio ambiente | Artigo de geociências (estilo AGU), Estudo de campo em ecologia, Periódico da Canadian Science Publishing |

Com exceção do artigo em branco, todos vêm com resumo, seções de exemplo e um `references.bib`, e compilam como estão. As classes são as oficiais que acompanham o TeX Live. Muitos modelos conhecidos de periódicos e conferências não vêm embutidos; [Modelos](#/help/templates) explica por quê e como adicioná-los.

Os botões acima dos modelos mostram os de uma área. Os modelos compartilhados com você (o formato de tese de um grupo, por exemplo) estão na mesma lista, com uma etiqueta dizendo quem os compartilhou; veja [Modelos](#/help/templates).

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
