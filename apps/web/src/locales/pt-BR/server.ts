// Portuguese (Brazil) messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'Link simbólico {name} ignorado',
  'Duplicate entry {path}; kept the last one': 'Entrada duplicada {path}; a última foi mantida',

  // History
  'Initial version': 'Versão inicial',
  'Created the project': 'Criou o projeto',
  'Imported the project': 'Importou o projeto',
  'Converted to a journal template': 'Convertido para um modelo de periódico',
  'Copied from another project': 'Copiado de outro projeto',
  'Applied changes from the AI agent': 'Aplicou alterações do agente de IA',
  'Edited by an AI agent over MCP': 'Editado por um agente de IA via MCP',
  'Accepted or rejected tracked changes': 'Aceitou ou rejeitou alterações controladas',
  'Restored an earlier version': 'Restaurou uma versão anterior',
  'Deleted user': 'Usuário excluído',

  // AI assistant: availability
  'The AI agent is unavailable': 'O agente de IA não está disponível',
  'The AI agent is turned off': 'O agente de IA está desativado',
  "You don't have access to the AI agent": 'Você não tem acesso ao agente de IA',
  'No AI model is available to you': 'Nenhum modelo de IA está disponível para você',
  'No AI provider is connected yet': 'Nenhum provedor de IA foi conectado ainda',
  'Auto: {model} for a quick answer': 'Automático: {model} para uma resposta rápida',
  'Auto: {model} for this task': 'Automático: {model} para esta tarefa',
  '{provider} keeps failing; {model} answers this message instead': '{provider} continua falhando; {model} responde a esta mensagem no lugar dele',
  '{provider} is not signed in': '{provider} não está conectado',

  // AI assistant: session, apply and undo
  'Draft changes discarded': 'Alterações do rascunho descartadas',
  'Applied changes to {files}. Build: {before} → {after} errors.': 'Alterações aplicadas em {files}. Compilação: {before} → {after} erros.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'As alterações do agente de IA foram desfeitas, exceto em {files}, onde as mesmas linhas foram editadas depois.',
  "Undid the AI agent's changes.": 'As alterações do agente de IA foram desfeitas.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'Listar arquivos do projeto',
  'Read compile log': 'Ler o log de compilação',
  'Compile with proposed changes': 'Compilar com as alterações propostas',
  'Read the {name} manual': 'Ler o manual de {name}',
  'Read {name} from TeX Live': 'Ler {name} do TeX Live',
  'Read {path} (lines {start}–end)': 'Ler {path} (linhas {start}–fim)',
  'Read {path} (lines {start}–{end})': 'Ler {path} (linhas {start}–{end})',
  'Read {path}': 'Ler {path}',
  'Search compile log for “{query}”': 'Buscar “{query}” no log de compilação',
  'Search the {name} manual for “{query}”': 'Buscar “{query}” no manual de {name}',
  'Search for “{query}”': 'Buscar “{query}”',
  'Look up “{query}” in {name}': 'Consultar “{query}” em {name}',
  'Undo draft changes to {path}': 'Desfazer as alterações do rascunho em {path}',
  'Edit {path}': 'Editar {path}',
  'Create {path}': 'Criar {path}',
  'Delete {path}': 'Excluir {path}',
  'Move {from} to {to}': 'Mover {from} para {to}',
  'Use skill “{name}”': 'Usar a skill “{name}”',
  'Read {path} of skill “{name}”': 'Ler {path} da skill “{name}”',
  'Draft skill “{name}”': 'Rascunhar a skill “{name}”',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '“{from}” renomeada para {name}',
  '{name} has no description; used its first line': '{name} não tem descrição; foi usada a primeira linha',
  '{name}: skipped {path} (not a text file)': '{name}: {path} ignorado (não é um arquivo de texto)',
  '{name}: skipped {path} (too large)': '{name}: {path} ignorado (grande demais)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': 'Chave de API de {name} (deixe em branco se o servidor não exigir)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'Conclua o login no navegador ou cole aqui o código de autorização / a URL de redirecionamento:',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'Conclua o login no navegador ou cole aqui o código de autorização / a URL de redirecionamento:',
  'Complete login in your browser, or paste the final redirect URL here:': 'Conclua o login no navegador ou cole aqui a URL de redirecionamento final:',
  'Paste the code Anthropic shows after you sign in:': 'Cole o código que a Anthropic mostra depois que você entra:',
  'Exchanging authorization code for tokens...': 'Trocando o código de autorização por tokens…',
  'Exchanging authorization code for an API key...': 'Trocando o código de autorização por uma chave de API…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'URL/domínio do GitHub Enterprise (em branco para github.com)',
  'Select {name} login method:': 'Escolha o método de login de {name}:',
  'Select {name} authentication method:': 'Escolha o método de autenticação de {name}:',
  'Listening for OAuth callback on {url}': 'Aguardando o retorno OAuth em {url}',
  'Sign in to {name}:': 'Entrar em {name}:',
  'Enter {name}': 'Informe {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    'Você colocou um caractere de alinhamento \'&\' no lugar errado. Para alinhar algo, escreva-o dentro de um ambiente de alinhamento como \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular} etc. Para escrever um e comercial \'&\' no texto, escreva \\&.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    'Você escreveu caracteres de alinhamento demais em uma tabela, e um deles virou uma quebra de linha. Verifique se o número de colunas da tabela está correto.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'Faltou um sinal $ no final do modo de matemática em destaque. Nesse modo, a matemática deve sempre ser escrita dentro de $$ … $$. Verifique se a quantidade de $ confere em volta de cada expressão matemática.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    'Todas as expressões e símbolos matemáticos devem ficar entre marcadores especiais, que criam o ‘modo matemático’. Use $...$ para matemática em linha e \\[...\\] ou um dos ambientes matemáticos (por exemplo, equation) para matemática em destaque. Isso vale para símbolos como subscritos ( _ ), integrais ( \\int ), letras gregas ( \\alpha, \\beta, \\delta ) e modificadores (\\vec{x}, \\tilde{x}).',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'Você fez referência a algo que ainda não tem rótulo. Se já o rotulou, verifique se o que está em \\ref{...} é igual ao que está em \\label{...}.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    'Você citou algo que não está na sua bibliografia. Verifique se a citação (\\cite{...}) tem uma chave correspondente na bibliografia e se ambas estão escritas da mesma forma.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    'Você usou o mesmo rótulo mais de uma vez. Verifique se cada \\label{...} rotula apenas um item.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    'O especificador de posição \'h\' é restritivo demais para o LaTeX posicionar bem o seu flutuante aqui. Tente flexibilizá-lo com \'ht\' ou até \'htbp\', se necessário. Se quiser manter o flutuante aqui mesmo assim, veja o pacote float.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'Faltou um especificador de posição, que diz ao LaTeX onde posicionar a sua figura. Para corrigir, coloque um especificador dentro dos colchetes (por exemplo, \\begin{figure}[h]) ou remova os colchetes (por exemplo, \\begin{figure} ). Saiba mais sobre especificadores de posição aqui.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    'O compilador não está conseguindo entender um comando que você usou. Verifique se o comando está escrito corretamente. Se ele fizer parte de um pacote, verifique se você incluiu o pacote no preâmbulo com \\usepackage{...}.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'Parece que está faltando um pacote! O comando {command} só funciona se você incluir {usage} no preâmbulo do documento.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    'Você criou um ambiente (com os comandos \\begin{…} e \\end{…}) que não é reconhecido. Verifique se incluiu no preâmbulo o pacote necessário para esse ambiente e se o nome do ambiente está escrito corretamente.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'Parece que está faltando um pacote! O ambiente {environment} só funciona se você incluir {usage} no preâmbulo do documento.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    'O compilador não encontra o arquivo que você quer incluir. Verifique se você enviou o arquivo e se informou o caminho corretamente.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    'O compilador não reconhece o tipo de arquivo de uma das suas imagens. Verifique se o formato da imagem é compatível com o compilador escolhido e se não há pontos (.) no nome da imagem.',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'O compilador não está reconhecendo a opção de posição \'H\'. Inclua \\usepackage{float} no preâmbulo para corrigir isso.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'Você usou um especificador de posição que o compilador não entende. Saiba mais aqui sobre as opções disponíveis para posicionar figuras.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    'Você usou um comando de fonte que só está disponível no modo matemático. Para usá-lo, você precisa estar no modo matemático (por exemplo, $ … $ ou \\begin{math} … \\end{math} ). Para usá-lo fora do modo matemático, use a versão de texto: \\textrm, \\textit etc.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    'Você usou \\begin{...} sem um \\end{...} correspondente.',
  'You have used an open bracket without a corresponding close bracket.':
    'Você abriu um colchete ou chave sem fechá-lo.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'Você usou no corpo do documento um comando que deve ficar no preâmbulo. Verifique se \\documentclass[…]{…} e todos os comandos \\usepackage{…} estão escritos antes de \\begin{document}.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    'Você começou uma expressão com \\left, mas não incluiu o \\right correspondente. Verifique se os comandos \\left e \\right estão sempre em pares ou, então, use \\Biggl e \\Biggr, como mostrado aqui.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    'Você escreveu um sobrescrito duplo de forma incorreta, como a^b^c, ou escreveu uma linha (prime) seguida de sobrescrito. Use { e } com vários sobrescritos. Tente a^{b^c}.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    'Você escreveu um subscrito duplo de forma incorreta, como a_b_c. Use { e } com vários subscritos. Tente a_{b_c}.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    'Você usou o comando \\maketitle, mas não definiu nenhum \\author. Para corrigir, inclua um autor no preâmbulo com o comando \\author{…}.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    'Uma lista que você criou não tem nenhum item. Verifique se os itens começam com o comando \\item e se você não colocou a lista dentro de uma tabela.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    'Você usou um comando \\hline no lugar errado, provavelmente fora de uma tabela. Se o \\hline estiver dentro de uma tabela, tente colocar \\\\ antes dele.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'Você usou um comando \\\\ ou \\newline onde o LaTeX não esperava. Use quebras de linha só depois de blocos de texto e tenha cuidado com quebras de linha dentro de listas e outros ambientes.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    'Você usou o comando \\verb de forma incorreta. Tente substituir o \\verb por \\begin{verbatim} … \\end{verbatim}.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    'Você escreveu um comprimento sem indicar a unidade adequada (pt, mm, cm etc.). Se você não escreveu nenhum comprimento, verifique se não há uma quebra de linha \\\\ seguida de colchetes […] em algum lugar.',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    'Você escreveu um comando \\right sem o \\left correspondente. Verifique se os comandos \\left e \\right estão sempre em pares.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    'Nenhum comando \\begin{document} foi encontrado. Verifique se você incluiu \\begin{document} e se o documento principal está definido corretamente.',
  'You have used \\begin{} without a corresponding \\end{}.':
    'Você usou \\begin{} sem um \\end{} correspondente.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} erro de compilação',
  'Compile log': 'Log de compilação',
}

export default messages
