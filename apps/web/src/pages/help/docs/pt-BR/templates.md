# Modelos

## Novos projetos a partir de modelos

**Novo projeto** mostra uma única lista: os modelos integrados e os compartilhados com você. Uma etiqueta em cada um diz de onde ele vem:

- **Integradas**: vem com o ColTex.
- **Compartilhado pelo administrador do sistema**: para todos neste servidor.
- **Compartilhado em** o nome de um grupo: compartilhado com um grupo de que você participa.
- **Compartilhado por** um nome: compartilhado com você pessoalmente.
- **Só você**: um modelo que você importou para si.

Os botões acima da lista (**Todos** e depois as áreas) mostram os modelos de uma área. Você só vê os modelos compartilhados com você. Veja também [Primeiros passos](#/help/getting-started).

O campo de busca abaixo deles encontra modelos pelo nome ou pela descrição.

## Publicar um projeto como modelo

Os administradores podem publicar como modelo um projeto próprio, como o formato de tese de um grupo:

1. No menu do projeto (⋯) na lista de projetos, ou nas configurações do projeto, escolha **Publicar como modelo…**.
2. Dê um nome, uma descrição e uma **Área** (onde ele aparece), escolha quem recebe em **Compartilhado com** e clique em **Publicar**.

Para quem pode ser:

- Um administrador: os grupos de que participa e as pessoas que escolher pelo nome ou e-mail.
- O administrador do sistema: também **Todos neste servidor**.
- Membros não podem publicar modelos; peça a um administrador.

Bom saber:

- Novos projetos recebem os arquivos do projeto como estão **naquele momento**, o compilador e o idioma do corretor; não os membros, o histórico nem os comentários.
- O modelo acompanha o projeto: altere o projeto e os novos projetos seguintes recebem as mudanças.
- Abra **Publicar como modelo…** de novo para mudar o nome, a área ou para quem ele é, ou para **Despublicar**. O administrador do sistema também pode remover qualquer modelo na caixa de novo projeto.
- Ele some quando o projeto é excluído.

## Importar o modelo de um periódico

Muitos periódicos e conferências publicam modelos LaTeX que não vêm embutidos no ColTex: suas licenças não permitem redistribuí-los, ou eles não fazem parte do TeX Live. Entre eles estão NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, ICCV, AAAI, IJCAI, USENIX, IEEE Access, Springer Nature (`sn-jnl`), PNAS, Science, Cell, eLife, PLOS, Frontiers, MDPI, BMC, Wiley, Taylor & Francis, SAGE, IOP, SIAM, Copernicus, AGU, Astronomy & Astrophysics. Baixe o modelo oficial no site da conferência ou da editora e importe-o como modelo:

1. Clique em **Novo projeto** e depois em **Importar modelo**.
2. Escolha o zip, dê um nome, uma descrição e uma **Área**, e clique em **Importar**. Ele é só seu, a menos que você ative **Compartilhar com outras pessoas** (administradores) e escolha com quem.

Bom saber:

- O compartilhamento segue as regras de publicação (acima): administradores compartilham com seus grupos e com pessoas escolhidas, e o administrador do sistema também com todos. Um modelo só seu tem a etiqueta **Só você**.
- Importar não cria projeto no seu espaço de trabalho: o modelo guarda os próprios arquivos. O documento principal é encontrado como ao importar um projeto; arquivos de compilação e lixo do sistema ficam de fora.
- O menu ⋯ do modelo tem **Editar arquivos**, **Editar modelo…** (para renomear, mudar com quem é compartilhado ou despublicar; ao despublicar, os arquivos viram um projeto seu) e **Remover modelo**, que apaga os arquivos.

## Converter para um modelo de periódico

**Converter para modelo…** no menu de um projeto (nas configurações do projeto: "Converter para um modelo de periódico") reescreve um artigo para outro periódico ou conferência: IEEE Transactions, Conferência IEEE, Conferência ACM, Periódico ACM, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS ou um artigo simples. Qualquer modelo embutido pode ser convertido para qualquer um deles.

A lista é a mesma de **Novo projeto**. Um modelo integrado é escrito pelas regras que o ColTex tem para ele; qualquer outro modelo (um compartilhado, um dos seus projetos com **Um dos meus projetos**, ou o zip que um periódico oferece com **Enviar um modelo (.zip)**) é preenchido do jeito dele: o título, os autores, as afiliações, o resumo e as palavras-chave do artigo vão para onde o modelo tem os de exemplo, e o texto de exemplo que vem depois é trocado pelo seu artigo. Os arquivos de classe e de estilo do modelo vêm junto, e o arquivo principal de exemplo fica no projeto como referência.

- O título, os autores, as afiliações, o resumo, os pacotes e a bibliografia são reconstruídos em um **novo projeto**, que é então compilado. O original continua como está.
- Artigos escritos no modelo `sn-jnl` da Springer Nature também são lidos, assim como os da BMC, OUP e Elsevier CAS: autores com nome e sobrenome, afiliações, `\abstract{}` e resumos estruturados, palavras-chave e a parte final com as declarações.
- Um relatório lista o que foi alterado e o que conferir. Se a compilação tiver erros ou o relatório avisos, **Abrir e corrigir com IA** abre o novo projeto com o agente de IA seguindo o Skill integrado **template-conversion**: primeiro ele pergunta a qual revista ou conferência você vai submeter, consulta as normas atuais para autores, faz o artigo compilar e o ajusta às normas sem mudar o que ele diz. As alterações aguardam sua revisão.
