# Referências

**Referências**, na barra lateral esquerda, trabalha com os arquivos `.bib` do projeto.

## Citar

**Citar** lista todas as entradas `.bib` do projeto; busque por autor, título, ano ou chave. Clique em uma entrada para inserir `\cite{key}` no cursor. Ao digitar `\cite{` no editor, as chaves também são sugeridas.

## Buscar e adicionar

Na aba **Adicionar**, digite um título, autores ou palavras-chave e pressione Enter: o ColTex busca no Crossref (periódicos, anais, livros) e no arXiv (preprints) e lista o que encontrar, com as melhores correspondências de cada um primeiro. **+** adiciona um artigo ao arquivo `.bib` escolhido abaixo do campo. Um preprint cuja versão publicada o arXiv conhece é adicionado pelo DOI dessa versão.

Um DOI (ex.: `10.1145/3290605.3300857`), um link doi.org ou um ID do arXiv é adicionado diretamente, sem busca.

As entradas são obtidas do doi.org e adicionadas ao final do arquivo com uma chave única; uma que já está no arquivo (mesmo DOI) não é adicionada duas vezes. Confira o que foi obtido.

## Zotero

1. Em **Configurações → Serviços de sincronização**, informe uma chave de API do Zotero (criada nas configurações do zotero.org; acesso de leitura basta). Ela é guardada criptografada neste servidor e usada só para ler a sua biblioteca.
2. Na aba **Zotero** do painel Referências, escolha uma biblioteca ou coleção para importar como arquivo `.bib` no projeto.
3. **Atualizar do Zotero** substitui esse arquivo pelo que está no Zotero agora; por isso, edite as entradas no Zotero, e não no arquivo.

A atualização usa a conexão com o Zotero de quem importou o arquivo.
