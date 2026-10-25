// Italian messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'Link simbolico {name} ignorato',
  'Duplicate entry {path}; kept the last one': 'Voce {path} duplicata; è stata tenuta l’ultima',

  // History
  'Initial version': 'Versione iniziale',
  'Created the project': 'Ha creato il progetto',
  'Imported the project': 'Ha importato il progetto',
  'Converted to a journal template': 'Convertito in un modello di rivista',
  'Copied from another project': 'Copiato da un altro progetto',
  'Applied changes from the AI agent': 'Ha applicato le modifiche dell’agente IA',
  'Edited by an AI agent over MCP': 'Modificato da un agente IA tramite MCP',
  'Accepted or rejected tracked changes': 'Ha accettato o rifiutato modifiche registrate',
  'Restored an earlier version': 'Ha ripristinato una versione precedente',
  'Deleted user': 'Utente eliminato',

  // AI assistant: availability
  'The AI agent is unavailable': 'L’agente IA non è disponibile',
  'The AI agent is turned off': 'L’agente IA è disattivato',
  "You don't have access to the AI agent": 'Non hai accesso all’agente IA',
  'No AI model is available to you': 'Nessun modello IA è disponibile per te',
  'No AI provider is connected yet': 'Nessun fornitore IA è ancora collegato',
  'Auto: {model} for a quick answer': 'Automatico: {model} per una risposta rapida',
  'Auto: {model} for this task': 'Automatico: {model} per questa attività',
  '{provider} keeps failing; {model} answers this message instead': '{provider} continua a non funzionare; risponde {model} a questo messaggio',
  '{provider} is not signed in': '{provider} non ha effettuato l’accesso',

  // AI assistant: session, apply and undo
  'Draft changes discarded': 'Modifiche della bozza scartate',
  'Stopped; the draft was not applied': 'Interrotto; la bozza non è stata applicata',
  'Applied changes to {files}; stopped before the build finished.': 'Modifiche applicate a {files}; interrotto prima della fine della compilazione.',
  'Applied changes to {files}. Build: {before} → {after} errors.': 'Modifiche applicate a {files}. Compilazione: {before} → {after} errori.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'Modifiche dell’agente IA annullate, tranne in {files}, dove le stesse righe sono state modificate nel frattempo.',
  "Undid the AI agent's changes.": 'Modifiche dell’agente IA annullate.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'Elenca i file del progetto',
  'Read compile log': 'Legge il log di compilazione',
  'Compile with proposed changes': 'Compila con le modifiche proposte',
  'Read the {name} manual': 'Legge il manuale di {name}',
  'Read {name} from TeX Live': 'Legge {name} da TeX Live',
  'Read {path} (lines {start}–end)': 'Legge {path} (righe {start}–fine)',
  'Read {path} (lines {start}–{end})': 'Legge {path} (righe {start}–{end})',
  'Read {path}': 'Legge {path}',
  'Search compile log for “{query}”': 'Cerca “{query}” nel log di compilazione',
  'Search the {name} manual for “{query}”': 'Cerca “{query}” nel manuale di {name}',
  'Search for “{query}”': 'Cerca “{query}”',
  'Look up “{query}” in {name}': 'Cerca “{query}” in {name}',
  'Undo draft changes to {path}': 'Annulla le modifiche della bozza a {path}',
  'Edit {path}': 'Modifica {path}',
  'Create {path}': 'Crea {path}',
  'Delete {path}': 'Elimina {path}',
  'Move {from} to {to}': 'Sposta {from} in {to}',
  'Use skill “{name}”': 'Usa la skill “{name}”',
  'Read {path} of skill “{name}”': 'Legge {path} della skill “{name}”',
  'Draft skill “{name}”': 'Abbozza la skill “{name}”',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '“{from}” rinominata in {name}',
  '{name} has no description; used its first line': '{name} non ha una descrizione; è stata usata la sua prima riga',
  '{name}: skipped {path} (not a text file)': '{name}: {path} ignorato (non è un file di testo)',
  '{name}: skipped {path} (too large)': '{name}: {path} ignorato (troppo grande)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': 'Chiave API per {name} (lascia vuoto se il server non ne richiede)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'Completa l’accesso nel browser oppure incolla qui il codice di autorizzazione / l’URL di reindirizzamento:',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'Completa l’accesso nel browser oppure incolla qui il codice di autorizzazione / l’URL di reindirizzamento:',
  'Complete login in your browser, or paste the final redirect URL here:': 'Completa l’accesso nel browser oppure incolla qui l’URL di reindirizzamento finale:',
  'Paste the code Anthropic shows after you sign in:': 'Incolla il codice che Anthropic mostra dopo l’accesso:',
  'Exchanging authorization code for tokens...': 'Scambio del codice di autorizzazione con i token…',
  'Exchanging authorization code for an API key...': 'Scambio del codice di autorizzazione con una chiave API…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'URL/dominio di GitHub Enterprise (vuoto per github.com)',
  'Select {name} login method:': 'Scegli il metodo di accesso a {name}:',
  'Select {name} authentication method:': 'Scegli il metodo di autenticazione di {name}:',
  'Listening for OAuth callback on {url}': 'In attesa del callback OAuth su {url}',
  'Sign in to {name}:': 'Accedi a {name}:',
  'Enter {name}': 'Inserisci {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    'Hai messo un carattere di allineamento ‘&’ nel posto sbagliato. Per allineare qualcosa devi scriverlo dentro un ambiente di allineamento come \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, ecc. Per scrivere una “e commerciale” ‘&’ nel testo, scrivi invece \\&.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    'Hai scritto troppi caratteri di allineamento in una tabella, e uno di essi è stato trasformato in un a capo. Controlla di aver indicato il numero corretto di colonne nella tabella.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'Hai dimenticato un simbolo $ alla fine di una formula in evidenza. In modalità matematica in evidenza devi sempre scrivere la formula dentro $$ … $$. Controlla che il numero di $ intorno a ogni espressione matematica corrisponda.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    'Devi racchiudere tutte le espressioni e i simboli matematici tra delimitatori speciali, che attivano la ‘modalità matematica’. Usa $...$ per le formule nel testo e \\[...\\] o uno degli ambienti matematici (ad es. equation) per le formule in evidenza. Questo vale per simboli come i pedici ( _ ), gli integrali ( \\int ), le lettere greche ( \\alpha, \\beta, \\delta ) e i modificatori (\\vec{x}, \\tilde{x}).',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'Hai fatto riferimento a qualcosa che non ha ancora un’etichetta. Se l’hai già etichettato, controlla che ciò che è scritto dentro \\ref{...} sia uguale a ciò che è scritto dentro \\label{...}.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    'Hai citato qualcosa che non è nella tua bibliografia. Controlla che la citazione (\\cite{...}) abbia una chiave corrispondente nella bibliografia e che entrambe siano scritte allo stesso modo.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    'Hai usato la stessa etichetta più di una volta. Controlla che ogni \\label{...} etichetti un solo elemento.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    'Lo specificatore di posizione ‘h’ è troppo restrittivo perché LaTeX possa collocare bene qui il tuo oggetto flottante. Prova ad allentarlo usando ‘ht’, o anche ‘htbp’ se necessario. Se vuoi comunque tenere l’oggetto qui, guarda il pacchetto float.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'Hai dimenticato lo specificatore di posizione, che dice a LaTeX dove collocare la figura. Per risolvere, inserisci uno specificatore tra le parentesi quadre (ad es. \\begin{figure}[h]) oppure togli le parentesi quadre (ad es. \\begin{figure} ). Scopri di più sugli specificatori di posizione qui.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    'Il compilatore non riesce a interpretare un comando che hai usato. Controlla che il comando sia scritto correttamente. Se il comando fa parte di un pacchetto, assicurati di aver incluso il pacchetto nel preambolo con \\usepackage{...}.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'Sembra che manchi un pacchetto! Il comando {command} non funzionerà finché non includi {usage} nel preambolo del documento.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    'Hai creato un ambiente (con i comandi \\begin{…} e \\end{…}) che non viene riconosciuto. Assicurati di aver incluso nel preambolo il pacchetto richiesto da quell’ambiente e che il nome dell’ambiente sia scritto correttamente.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'Sembra che manchi un pacchetto! L’ambiente {environment} non funzionerà finché non includi {usage} nel preambolo del documento.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    'Il compilatore non trova il file che vuoi includere. Assicurati di aver caricato il file e di averne indicato correttamente il percorso.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    'Il compilatore non riconosce il tipo di file di una delle tue immagini. Assicurati di usare un formato di immagine supportato dal compilatore scelto e controlla che nel nome dell’immagine non ci siano punti (.).',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'Il compilatore non riconosce l’opzione di posizione ‘H’. Per risolvere, includi \\usepackage{float} nel preambolo.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'Hai usato uno specificatore di posizione che il compilatore non capisce. Qui puoi scoprire di più sulle diverse opzioni disponibili per collocare le figure.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    'Hai usato un comando di font disponibile solo in modalità matematica. Per usarlo devi essere in modalità matematica (ad es. $ … $ o \\begin{math} … \\end{math} ). Se vuoi usarlo fuori dalla modalità matematica, usa invece la versione testuale: \\textrm, \\textit, ecc.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    'Hai usato \\begin{...} senza un \\end{...} corrispondente.',
  'You have used an open bracket without a corresponding close bracket.':
    'Hai aperto una parentesi senza la parentesi di chiusura corrispondente.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'Hai usato nel corpo del documento un comando che va usato nel preambolo. Assicurati che \\documentclass[…]{…} e tutti i comandi \\usepackage{…} siano scritti prima di \\begin{document}.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    'Hai iniziato un’espressione con un comando \\left, ma non hai incluso il comando \\right corrispondente. Assicurati che i comandi \\left e \\right siano sempre bilanciati, oppure prova a usare invece i comandi \\Biggl e \\Biggr, come mostrato qui.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    'Hai scritto un doppio apice in modo errato come a^b^c, oppure hai scritto un primo seguito da un apice. Ricorda di usare { e } con più apici. Prova invece a^{b^c}.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    'Hai scritto un doppio pedice in modo errato come a_b_c. Ricorda di usare { e } con più pedici. Prova invece a_{b_c}.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    'Hai usato il comando \\maketitle, ma non hai indicato alcun \\author. Per risolvere, inserisci un autore nel preambolo con il comando \\author{…}.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    'Un elenco che hai creato non contiene voci. Assicurati di introdurre le voci dell’elenco con il comando \\item e di non aver usato un elenco dentro una tabella.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    'Hai usato un comando \\hline nel posto sbagliato, probabilmente fuori da una tabella. Se il comando \\hline è dentro una tabella, prova a mettere \\\\ prima di esso.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'Hai usato un comando \\\\ o \\newline dove LaTeX non se lo aspettava. Usa gli a capo solo dopo blocchi di testo e fai attenzione agli a capo dentro elenchi e altri ambienti.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    'Hai usato un comando \\verb in modo errato. Prova a sostituire il comando \\verb con \\begin{verbatim} … \\end{verbatim}.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    'Hai scritto una lunghezza senza indicare l’unità di misura (pt, mm, cm ecc.). Se non hai scritto una lunghezza, controlla di non aver scritto da qualche parte un a capo \\\\ seguito da parentesi quadre […].',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    'Hai scritto un comando \\right senza il comando \\left corrispondente. Controlla che i comandi \\left e \\right siano sempre bilanciati.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    'Non è stato trovato alcun comando \\begin{document}. Assicurati di aver incluso \\begin{document} e che il documento principale sia impostato correttamente.',
  'You have used \\begin{} without a corresponding \\end{}.':
    'Hai usato \\begin{} senza un \\end{} corrispondente.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} errore di compilazione',
  'Compile log': 'Log di compilazione',
}

export default messages
