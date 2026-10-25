# Compilação e PDF

## Compilador e documento principal

As configurações do projeto têm o **Compilador** e o **Documento principal**:

- **Automático** (o padrão para novos projetos): escolhido a cada compilação a partir do documento. XeLaTeX quando o preâmbulo (com os arquivos que ele carrega via `\input` e os `.sty`/`.cls` do próprio projeto) carrega `ctex`, `xeCJK`, `fontspec`, `unicode-math` e semelhantes, ou a classe é `ctexart`/`ctexbook` etc.; LuaLaTeX quando carrega `luacode` ou `luatexja`; pdfLaTeX nos demais casos. Uma primeira linha `% !TEX program = xelatex`, ou um `latexmkrc` no projeto, decide no lugar disso.
- **pdfLaTeX**: a escolha habitual para documentos em inglês.
- **XeLaTeX**: necessário para chinês (ctex) e fontes do sistema.
- **LuaLaTeX**: também aceita fontes do sistema.

Ao escolher um motor, ele é usado sempre, sem detecção.

> Para chinês, carregue `\usepackage[UTF8]{ctex}` (ou use a classe `ctexart`) e o Automático passa para XeLaTeX. Texto em chinês sem ctex falha no pdfLaTeX com “Unicode character … not set up for use with LaTeX”.

O documento principal é o arquivo a partir do qual a compilação começa; escolha-o em **Documento principal** nas configurações do projeto.

As compilações usam o TeX Live completo com latexmk, que executa o LaTeX, o BibTeX/Biber e os índices quantas vezes for preciso. Elas rodam isoladas, sem acesso à rede, e o shell escape é restrito.

## Opções de compilação

A seta ao lado de **Recompilar** tem:

- **Compilação automática**: compila quando você para de digitar (uma compilação por vez por projeto, não importa quantas pessoas estejam digitando).
- **Modo de compilação**: Normal ou Rápido [rascunho]. O modo rascunho deixa as imagens de fora e é mais rápido.
- **Tratamento de erros de compilação**: parar no primeiro erro ou tentar compilar apesar dos erros.
- **Limpar e recompilar**: quando uma compilação parece errada, remove os arquivos auxiliares e compila do zero.

Essas opções ficam guardadas por projeto neste navegador.

## Logs

O número em **Logs** é a contagem de erros. O log lista erros, avisos e problemas de diagramação:

- cada um com a mensagem do LaTeX e, para problemas comuns, uma explicação (um pacote faltando, por exemplo, indica o pacote a adicionar);
- clique em um para ir até o arquivo e a linha;
- o log bruto também está lá, e a IA pode explicar ou corrigir os erros.

> Quando uma compilação falha, o PDF da última compilação bem-sucedida continua na tela.

## Entre o código e o PDF

- **Código → PDF**: com o cursor no código, clique em **Localizar no PDF** na barra do PDF (ou "Ir para o PDF" no menu do botão direito); o PDF rola até lá e destaca o trecho.
- **PDF → código**: clique duas vezes no PDF; o editor abre o arquivo naquela linha.

## Layout: editor, PDF ou ambos

O seletor de visualização (quatro botões pequenos à direita da barra do PDF) mostra **Só o editor**, **Editor e PDF** lado a lado ou **Só o PDF**, como no Overleaf, e o quarto abre o PDF em uma nova janela; este navegador lembra a escolha. Arrastar o divisor até um dos lados também oculta aquele painel.

- Com só o editor, **Recompilar** e o mesmo seletor ficam no fim da barra de ferramentas do editor.
- **Ir para o PDF** a partir do editor mostra o PDF quando ele está oculto.
- Em uma janela estreita (tablet ou celular) há espaço para um de cada vez, e os painéis laterais (arquivos, busca…) cobrem o editor enquanto estão abertos.

## O PDF em uma janela própria

**Abrir o PDF em uma nova janela** (o último botão do seletor de visualização) abre o PDF em uma janela separada, que você pode mover para outra tela:

- A janela do editor deixa de ter o painel do PDF e o editor a ocupa inteira; **Recompilar** vai para o fim da barra de ferramentas do editor.
- A janela do PDF tem Recompilar, Logs, ir para o PDF e baixar. Clicar duas vezes no PDF dela leva ao código na janela do editor.
- **Mostrar o PDF aqui**, na barra de ferramentas do editor, ou fechar a janela traz o painel do PDF de volta.

## Downloads

- A barra do PDF baixa o PDF atual.
- O botão de download no topo da árvore de arquivos baixa os arquivos-fonte do projeto como .zip.
- Na lista de projetos, o menu de um projeto (⋯) tem **Baixar PDF**, que compila antes, e **Baixar .zip** com todos os arquivos-fonte.

## Exportar para o Word

Alguns periódicos só aceitam arquivos do Word. **Exportar para o Word…** no menu de um projeto (⋯) na lista de projetos, ou em **Ações** nas configurações do projeto, transforma o projeto em um .docx.

- A página de rosto vem do documento: título, autores, afiliações, autor correspondente, resumo e palavras-chave, para as classes que a conversão de modelo lê (Springer Nature `sn-jnl`, Elsevier, Elsevier CAS, OUP, BMC, IEEE, ACM, LNCS, REVTeX, `article`).
- As fórmulas viram equações do Word. O Word numera as figuras e tabelas, figuras em PDF e EPS viram imagens e as equações numeradas mantêm seus números, então `\eqref` continua apontando para elas.
- **Estilo de citação**: **Igual ao documento** segue o estilo bibliográfico do documento. Você também pode escolher APA, Vancouver, AMA, IEEE, Nature ou Chicago, ou um arquivo `.csl` enviado ao projeto.
- **Modelo do Word**: envie ao projeto o modelo do Word (`.docx`) de um periódico e escolha-o aqui; o documento passa a usar os estilos dele. O campo aparece quando o projeto tem um arquivo `.docx`.
- Confira o resultado antes de enviar: suas próprias macros e tabelas complexas podem precisar de ajustes no Word. Desenhos TikZ não são convertidos: compile-os como imagens e inclua essas imagens no lugar.
