// German messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'Symbolischer Link {name} übersprungen',
  'Duplicate entry {path}; kept the last one': 'Doppelter Eintrag {path}; der letzte wurde behalten',

  // History
  'Initial version': 'Erste Version',
  'Created the project': 'Projekt erstellt',
  'Imported the project': 'Projekt importiert',
  'Converted to a journal template': 'In eine Zeitschriftenvorlage umgewandelt',
  'Copied from another project': 'Aus einem anderen Projekt kopiert',
  'Applied changes from the AI agent': 'Änderungen des KI-Agenten übernommen',
  'Edited by an AI agent over MCP': 'Von einem KI-Agenten über MCP bearbeitet',
  'Accepted or rejected tracked changes': 'Nachverfolgte Änderungen angenommen oder abgelehnt',
  'Restored an earlier version': 'Eine frühere Version wiederhergestellt',
  'Deleted user': 'Gelöschter Benutzer',

  // AI assistant: availability
  'The AI agent is unavailable': 'Der KI-Agent ist nicht verfügbar',
  'The AI agent is turned off': 'Der KI-Agent ist ausgeschaltet',
  "You don't have access to the AI agent": 'Sie haben keinen Zugriff auf den KI-Agenten',
  'No AI model is available to you': 'Ihnen steht kein KI-Modell zur Verfügung',
  'No AI provider is connected yet': 'Es ist noch kein KI-Anbieter verbunden',
  'Auto: {model} for a quick answer': 'Auto: {model} für eine schnelle Antwort',
  'Auto: {model} for this task': 'Auto: {model} für diese Aufgabe',
  '{provider} keeps failing; {model} answers this message instead': '{provider} schlägt wiederholt fehl; stattdessen beantwortet {model} diese Nachricht',
  '{provider} is not signed in': 'Bei {provider} ist niemand angemeldet',

  // AI assistant: session, apply and undo
  'Draft changes discarded': 'Entwurfsänderungen verworfen',
  'Applied changes to {files}. Build: {before} → {after} errors.': 'Änderungen auf {files} angewendet. Build: {before} → {after} Fehler.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'Änderungen des KI-Agenten rückgängig gemacht, außer in {files}, wo dieselben Zeilen inzwischen bearbeitet wurden.',
  "Undid the AI agent's changes.": 'Änderungen des KI-Agenten rückgängig gemacht.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'Projektdateien auflisten',
  'Read compile log': 'Kompilierprotokoll lesen',
  'Compile with proposed changes': 'Mit vorgeschlagenen Änderungen kompilieren',
  'Read the {name} manual': 'Handbuch zu {name} lesen',
  'Read {name} from TeX Live': '{name} aus TeX Live lesen',
  'Read {path} (lines {start}–end)': '{path} lesen (Zeilen {start}–Ende)',
  'Read {path} (lines {start}–{end})': '{path} lesen (Zeilen {start}–{end})',
  'Read {path}': '{path} lesen',
  'Search compile log for “{query}”': 'Kompilierprotokoll nach „{query}“ durchsuchen',
  'Search the {name} manual for “{query}”': 'Handbuch zu {name} nach „{query}“ durchsuchen',
  'Search for “{query}”': 'Nach „{query}“ suchen',
  'Look up “{query}” in {name}': '„{query}“ in {name} nachschlagen',
  'Undo draft changes to {path}': 'Entwurfsänderungen an {path} rückgängig machen',
  'Edit {path}': '{path} bearbeiten',
  'Create {path}': '{path} erstellen',
  'Delete {path}': '{path} löschen',
  'Move {from} to {to}': '{from} nach {to} verschieben',
  'Use skill “{name}”': 'Skill „{name}“ verwenden',
  'Read {path} of skill “{name}”': '{path} aus Skill „{name}“ lesen',
  'Draft skill “{name}”': 'Skill „{name}“ entwerfen',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '„{from}“ in {name} umbenannt',
  '{name} has no description; used its first line': '{name} hat keine Beschreibung; die erste Zeile wurde verwendet',
  '{name}: skipped {path} (not a text file)': '{name}: {path} übersprungen (keine Textdatei)',
  '{name}: skipped {path} (too large)': '{name}: {path} übersprungen (zu groß)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': 'API-Schlüssel für {name} (leer lassen, wenn der Server keinen braucht)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'Schließen Sie die Anmeldung im Browser ab oder fügen Sie hier den Autorisierungscode bzw. die Weiterleitungs-URL ein:',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'Schließen Sie die Anmeldung im Browser ab oder fügen Sie hier den Autorisierungscode bzw. die Weiterleitungs-URL ein:',
  'Complete login in your browser, or paste the final redirect URL here:': 'Schließen Sie die Anmeldung im Browser ab oder fügen Sie hier die endgültige Weiterleitungs-URL ein:',
  'Paste the code Anthropic shows after you sign in:': 'Fügen Sie den Code ein, den Anthropic nach der Anmeldung anzeigt:',
  'Exchanging authorization code for tokens...': 'Autorisierungscode wird gegen Tokens getauscht…',
  'Exchanging authorization code for an API key...': 'Autorisierungscode wird gegen einen API-Schlüssel getauscht…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'GitHub-Enterprise-URL/-Domain (leer für github.com)',
  'Select {name} login method:': 'Anmeldemethode für {name} wählen:',
  'Select {name} authentication method:': 'Authentifizierungsmethode für {name} wählen:',
  'Listening for OAuth callback on {url}': 'Warte auf OAuth-Callback unter {url}',
  'Sign in to {name}:': 'Bei {name} anmelden:',
  'Enter {name}': '{name} eingeben',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    'Sie haben ein Ausrichtungszeichen \'&\' an der falschen Stelle gesetzt. Wenn Sie etwas ausrichten möchten, müssen Sie es in eine Ausrichtungsumgebung wie \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular} usw. schreiben. Für ein kaufmännisches Und \'&\' im Text schreiben Sie stattdessen \\&.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    'Sie haben in einer Tabelle zu viele Ausrichtungszeichen geschrieben, sodass eines davon als Zeilenumbruch behandelt wird. Prüfen Sie, ob Sie die richtige Spaltenanzahl für Ihre Tabelle angegeben haben.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'Am Ende des abgesetzten Mathematikmodus fehlt ein $-Zeichen. Im abgesetzten Mathematikmodus muss die Formel immer zwischen $$ … $$ stehen. Prüfen Sie, ob die Anzahl der $ um jeden mathematischen Ausdruck übereinstimmt.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    'Alle mathematischen Ausdrücke und Symbole müssen von speziellen Markierungen umschlossen sein, die einen „Mathematikmodus“ erzeugen. Verwenden Sie $...$ für Formeln im Text und \\[...\\] oder eine mathematische Umgebung (z. B. equation) für abgesetzte Formeln. Das gilt für Symbole wie Indizes ( _ ), Integrale ( \\int ), griechische Buchstaben ( \\alpha, \\beta, \\delta ) und Akzente (\\vec{x}, \\tilde{x}).',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'Sie verweisen auf etwas, das noch kein Label hat. Falls Sie es bereits mit einem Label versehen haben, prüfen Sie, ob der Inhalt von \\ref{...} genau mit dem von \\label{...} übereinstimmt.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    'Sie zitieren etwas, das nicht in Ihrem Literaturverzeichnis enthalten ist. Prüfen Sie, ob es für das Zitat (\\cite{...}) einen passenden Schlüssel im Literaturverzeichnis gibt und beide gleich geschrieben sind.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    'Sie haben dasselbe Label mehrfach verwendet. Prüfen Sie, ob jedes \\label{...} nur ein Element kennzeichnet.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    'Die Positionsangabe \'h\' ist zu streng, als dass LaTeX Ihr Gleitobjekt hier gut platzieren könnte. Lockern Sie sie mit \'ht\' oder notfalls \'htbp\'. Wenn das Gleitobjekt trotzdem genau hier stehen soll, sehen Sie sich das Paket float an.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'Sie haben die Positionsangabe vergessen, die LaTeX sagt, wo Ihre Abbildung stehen soll. Fügen Sie entweder eine Positionsangabe in die eckigen Klammern ein (z. B. \\begin{figure}[h]) oder entfernen Sie die eckigen Klammern (z. B. \\begin{figure} ). Mehr zu Positionsangaben finden Sie hier.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    'Der Compiler versteht einen von Ihnen verwendeten Befehl nicht. Prüfen Sie, ob der Befehl richtig geschrieben ist. Gehört der Befehl zu einem Paket, stellen Sie sicher, dass Sie das Paket in der Präambel mit \\usepackage{...} eingebunden haben.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'Vermutlich fehlt ein Paket! Der Befehl {command} funktioniert nur, wenn Sie {usage} in die Präambel Ihres Dokuments aufnehmen.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    'Sie haben eine Umgebung (mit \\begin{…} und \\end{…}) angelegt, die nicht erkannt wird. Stellen Sie sicher, dass Sie das dafür nötige Paket in der Präambel eingebunden haben und die Umgebung richtig geschrieben ist.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'Vermutlich fehlt ein Paket! Die Umgebung {environment} funktioniert nur, wenn Sie {usage} in die Präambel Ihres Dokuments aufnehmen.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    'Der Compiler findet die Datei nicht, die Sie einbinden möchten. Stellen Sie sicher, dass Sie die Datei hochgeladen und ihren Pfad richtig angegeben haben.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    'Der Compiler erkennt den Dateityp eines Ihrer Bilder nicht. Verwenden Sie ein Bildformat, das Ihr gewählter Compiler unterstützt, und prüfen Sie, dass der Bildname keine Punkte (.) enthält.',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'Der Compiler erkennt die Gleitoption \'H\' nicht. Fügen Sie \\usepackage{float} in Ihre Präambel ein, um das zu beheben.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'Sie haben eine Positionsangabe verwendet, die der Compiler nicht versteht. Mehr über die verfügbaren Optionen zur Platzierung von Abbildungen erfahren Sie hier.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    'Sie haben einen Schriftbefehl verwendet, der nur im Mathematikmodus verfügbar ist. Dafür müssen Sie im Mathematikmodus sein (z. B. $ … $ oder \\begin{math} … \\end{math} ). Außerhalb des Mathematikmodus verwenden Sie stattdessen die Textvariante: \\textrm, \\textit usw.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    'Sie haben \\begin{...} ohne zugehöriges \\end{...} verwendet.',
  'You have used an open bracket without a corresponding close bracket.':
    'Sie haben eine öffnende Klammer ohne zugehörige schließende Klammer verwendet.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'Sie haben im Hauptteil Ihres Dokuments einen Befehl verwendet, der in die Präambel gehört. Stellen Sie sicher, dass \\documentclass[…]{…} und alle \\usepackage{…}-Befehle vor \\begin{document} stehen.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    'Sie haben einen Ausdruck mit \\left begonnen, aber kein zugehöriges \\right gesetzt. Achten Sie darauf, dass \\left und \\right überall paarweise auftreten, oder verwenden Sie stattdessen \\Biggl und \\Biggr wie hier gezeigt.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    'Sie haben einen doppelten Exponenten fälschlich als a^b^c geschrieben oder einen Strich (′) mit einem Exponenten versehen. Denken Sie bei mehrfachen Exponenten an { und }. Versuchen Sie stattdessen a^{b^c}.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    'Sie haben einen doppelten Index fälschlich als a_b_c geschrieben. Denken Sie bei mehrfachen Indizes an { und }. Versuchen Sie stattdessen a_{b_c}.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    'Sie haben \\maketitle verwendet, aber kein \\author angegeben. Geben Sie in der Präambel mit \\author{…} einen Autor an.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    'Eine von Ihnen angelegte Liste enthält keine Einträge. Stellen Sie sicher, dass Sie Listeneinträge mit \\item kennzeichnen und keine Liste innerhalb einer Tabelle verwendet haben.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    'Sie haben \\hline an der falschen Stelle verwendet, wahrscheinlich außerhalb einer Tabelle. Steht \\hline innerhalb einer Tabelle, setzen Sie davor ein \\\\.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'Sie haben \\\\ oder \\newline an einer Stelle verwendet, an der LaTeX keinen Zeilenumbruch erwartet. Setzen Sie Zeilenumbrüche nur nach Textblöcken und seien Sie in Listen und anderen Umgebungen vorsichtig damit.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    'Sie haben \\verb falsch verwendet. Ersetzen Sie \\verb durch \\begin{verbatim} … \\end{verbatim}.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    'Sie haben eine Länge ohne passende Einheit (pt, mm, cm usw.) angegeben. Falls Sie gar keine Länge geschrieben haben, prüfen Sie, ob irgendwo auf einen Zeilenumbruch \\\\ eckige Klammern […] folgen.',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    'Sie haben \\right ohne zugehöriges \\left verwendet. Prüfen Sie, ob \\left und \\right überall paarweise auftreten.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    'Kein \\begin{document} gefunden. Stellen Sie sicher, dass Ihr Dokument \\begin{document} enthält und das Hauptdokument richtig eingestellt ist.',
  'You have used \\begin{} without a corresponding \\end{}.':
    'Sie haben \\begin{} ohne zugehöriges \\end{} verwendet.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} Kompilierfehler',
  'Compile log': 'Kompilierprotokoll',
}

export default messages
