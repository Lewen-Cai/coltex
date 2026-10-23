# Histórico

**Histórico**, no topo do editor, abre a visualização do histórico. Ela funciona como um git log: cada versão tem um ID curto (como `a1b2c3d`), uma descrição, quando foi criada e por quem.

- As versões são registradas automaticamente depois de uma pausa na edição, com quem fez as alterações.
- **Salvar versão** registra o estado atual agora, com a sua descrição (como uma mensagem de commit). Se nada mudou desde a última versão, a descrição vira um rótulo nela.
- Selecione uma versão para ver quais arquivos ela alterou e como, ou compare-a com o projeto atual.
- **Reverter estas alterações** desfaz só o que aquela versão alterou e mantém tudo o que mudou depois (como `git revert`). Se um arquivo foi alterado de novo depois de um jeito que entra em conflito, nada é alterado e o arquivo é indicado.
- **Restaurar projeto** devolve cada arquivo ao estado daquela versão; os arquivos adicionados depois são removidos. **Restaurar este arquivo** faz isso para um único arquivo.
- Reversões e restaurações são versões próprias ("Reverte a1b2c3d", "Volta para a1b2c3d"; clique no ID para ir àquela versão), então também podem ser desfeitas.
- **Adicionar rótulo** dá um nome a uma versão (ex.: "Submetido") para você encontrá-la depois.
- Os arquivos de qualquer versão podem ser baixados como .zip.

> Uma versão também é salva antes de aplicar alterações da IA, antes de uma substituição em todo o projeto, de um git push, de uma reversão e de uma restauração.
