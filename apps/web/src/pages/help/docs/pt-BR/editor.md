# Editor

## Modo código e modo visual

**Código / Visual**, na barra de ferramentas, alterna a forma de edição; os dois editam o mesmo código LaTeX.

- **Código**: o próprio código-fonte, com destaque de sintaxe, preenchimento automático e correspondência de parênteses. Com o cursor dentro da matemática, a equação renderizada aparece acima dele (`Esc` a oculta).
- **Visual**: títulos, negrito, listas, matemática, tabelas e figuras aparecem como no documento final; o código aparece onde está o cursor. Bom para ler e editar texto.

## Barra de ferramentas

Nível de título, negrito, itálico, matemática, símbolos, links, `\ref`, `\cite`, figuras, tabelas, listas e busca. Os botões que não cabem vão para o menu **⋯**.

- **Símbolos** (Σ): letras gregas, operadores, setas e mais, por categoria; clique para inserir.
- **Tabelas**: escolha o tamanho ao inserir. No modo visual, clique em uma tabela para editar as células (`Tab` passa de uma para outra); a barra de ferramentas dela adiciona e remove linhas e colunas, mescla células e define o alinhamento e as bordas.
- **Figuras**: envie uma imagem, escolha uma do projeto, ou cole ou solte uma imagem no editor. No modo visual, o botão de edição de uma figura altera a largura, a legenda e o rótulo.

## Preenchimento automático

Ao digitar `\`, comandos são sugeridos; `\ref{` e `\cite{` listam os rótulos e as chaves bibliográficas do projeto. `Ctrl+Space` abre as sugestões a qualquer momento.

## Erros

- **Erros de compilação**: os erros e avisos da última compilação no arquivo aberto ganham um ponto ao lado do número da linha, e os erros ficam sublinhados. Passe o mouse para ver a mensagem do LaTeX e uma explicação.
- **Verificação de código**: verifica enquanto você digita, sem compilar: ambientes não fechados ou trocados, um `}` ou `$` solto, comandos de matemática fora da matemática. O trecho onde você está digitando não é sinalizado. Coloque `%%begin novalidate` e `%%end novalidate` em volta de um trecho para ignorá-lo.

## Verificação ortográfica

Palavras com erro de ortografia ganham um sublinhado vermelho pontilhado (texto CJK não é verificado). Clique com o botão direito em uma delas para ver sugestões ou **Adicionar ao dicionário**. O idioma é uma configuração do projeto.

Seu dicionário fica em **Configurações → Dicionário**, embaixo da barra lateral do editor; as palavras dele contam como corretas em todos os seus projetos. Digite no campo para encontrar uma palavra e pressione Enter para adicioná-la, se ainda não estiver lá; as letras acima da lista saltam para aquela letra. O menu **⋯** importa um arquivo de texto (uma palavra por linha, ou separadas por espaços ou vírgulas; arquivos `.dic` do Hunspell também funcionam), exporta suas palavras como `dictionary.txt` e remove todas. Os editores abertos verificam as palavras de novo na hora.

## Menu do botão direito

Recortar, copiar, colar, selecionar tudo, excluir, ir para o PDF e adicionar um comentário. Em `\ref{…}` ele oferece **Ir para o rótulo**; em `\input{…}` ou `\include{…}`, **Abrir arquivo**.

## Estrutura e trilha de navegação

- **Estrutura do arquivo**, abaixo da árvore de arquivos, lista as seções do arquivo aberto; clique em uma para ir até ela. A seção em que você está fica destacada.
- A linha acima do editor mostra "arquivo › seção › subseção" para o cursor; clique em uma seção para ir até ela. Ela pode ser desativada nas configurações do editor.

## Busca

`Mod+F` (ou `Mod+Shift+F`, ou o botão de busca da barra de ferramentas) abre o painel **Buscar** à esquerda com o texto selecionado já preenchido. Ele busca no projeto inteiro, com as ocorrências do arquivo aberto primeiro, com expressões regulares, diferenciação de maiúsculas e palavra inteira, e substitui uma ocorrência ou todas. Uma versão é salva antes de substituir tudo.

## Configurações do editor

**Configurações**, embaixo da barra lateral esquerda, agrupa as configurações em categorias à esquerda:

- **Projeto**: compilador, documento principal, idioma da verificação ortográfica (os editores os alteram, para todos) e o endereço de clone do Git;
- **Aparência**: tamanho da fonte, fonte (monoespaçada ou sem serifa), altura da linha, **Cores do código** (GitHub, Solarized, Monokai, Dracula, Nord, One Dark e outras, só no modo código), trilha de navegação;
- **Edição**: atalhos de teclas (padrão, Vim ou Emacs) e chaves para a verificação de código, a pré-visualização de equações, o fechamento automático de parênteses e o preenchimento automático;
- **Atalhos de teclado**: veja abaixo;
- **Ações**: contagem de palavras, cópia, conversão de modelo, publicação como modelo.

Aparência, edição e atalhos são seus, guardados neste navegador, para todos os projetos.

## Atalhos de teclado

**Atalhos**, na barra lateral esquerda, lista todos. Os mais usados:

| Ação | Teclas |
| --- | --- |
| Compilar | `Mod+S` ou `Mod+Enter` |
| Desfazer / refazer | `Mod+Z` / `Mod+Shift+Z` |
| Buscar e substituir | `Mod+F` |
| Negrito / itálico | `Mod+B` / `Mod+I` |
| Comentar ou descomentar linhas | `Mod+/` |
| Ir para a linha | `Mod+Alt+G` |
| Comentar a seleção | `Mod+Alt+M` |
| Mostrar sugestões | `Ctrl+Space` |

As teclas aparecem conforme o seu sistema: ⌘, ⌥ e ⇧ no Mac, Ctrl, Alt e Shift no Windows e no Linux. Estas são as teclas padrão.

### Seus próprios atalhos

Em **Atalhos de teclado**, nas configurações, clique em **Alterar** ao lado de um comando e pressione as novas teclas. Elas precisam incluir Ctrl (⌘ no Mac) ou Alt; teclas que outro comando usa, ou que ficam reservadas para o navegador e a edição básica (desfazer, copiar, colar, selecionar tudo…), não podem ser usadas. Restaure um atalho ou todos. As dicas da barra de ferramentas e a lista de atalhos passam a mostrar as suas teclas.
