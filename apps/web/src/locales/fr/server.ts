// French messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'Lien symbolique {name} ignoré',
  'Duplicate entry {path}; kept the last one': 'Entrée {path} en double ; la dernière a été conservée',

  // History
  'Initial version': 'Version initiale',
  'Created the project': 'A créé le projet',
  'Imported the project': 'A importé le projet',
  'Converted to a journal template': 'Converti vers un modèle de revue',
  'Copied from another project': 'Copié depuis un autre projet',
  'Applied changes from the AI agent': 'A appliqué les modifications de l’agent IA',
  'Edited by an AI agent over MCP': 'Modifié par un agent IA via MCP',
  'Accepted or rejected tracked changes': 'A accepté ou refusé des modifications suivies',
  'Restored an earlier version': 'A restauré une version antérieure',
  'Deleted user': 'Utilisateur supprimé',

  // AI assistant: availability
  'The AI agent is unavailable': 'L’agent IA est indisponible',
  'The AI agent is turned off': 'L’agent IA est désactivé',
  "You don't have access to the AI agent": 'Vous n’avez pas accès à l’agent IA',
  'No AI model is available to you': 'Aucun modèle d’IA ne vous est accessible',
  'No AI provider is connected yet': 'Aucun fournisseur d’IA n’est encore connecté',
  'Auto: {model} for a quick answer': 'Auto : {model} pour une réponse rapide',
  'Auto: {model} for this task': 'Auto : {model} pour cette tâche',
  '{provider} keeps failing; {model} answers this message instead': '{provider} échoue sans cesse ; {model} répond à ce message à sa place',
  '{provider} is not signed in': '{provider} n’est pas connecté',

  // AI assistant: session, apply and undo
  'Draft changes discarded': 'Modifications du brouillon abandonnées',
  'Stopped; the draft was not applied': 'Arrêté ; le brouillon n’a pas été appliqué',
  'Applied changes to {files}; stopped before the build finished.': 'Modifications appliquées à {files} ; arrêté avant la fin de la compilation.',
  'Applied changes to {files}. Build: {before} → {after} errors.': 'Modifications appliquées à {files}. Compilation : {before} → {after} erreurs.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'Modifications de l’agent IA annulées, sauf dans {files}, où les mêmes lignes ont été modifiées depuis.',
  "Undid the AI agent's changes.": 'Modifications de l’agent IA annulées.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'Lister les fichiers du projet',
  'Read compile log': 'Lire le journal de compilation',
  'Compile with proposed changes': 'Compiler avec les modifications proposées',
  'Read the {name} manual': 'Lire le manuel de {name}',
  'Read {name} from TeX Live': 'Lire {name} dans TeX Live',
  'Read {path} (lines {start}–end)': 'Lire {path} (lignes {start} à la fin)',
  'Read {path} (lines {start}–{end})': 'Lire {path} (lignes {start}–{end})',
  'Read {path}': 'Lire {path}',
  'Search compile log for “{query}”': 'Rechercher « {query} » dans le journal de compilation',
  'Search the {name} manual for “{query}”': 'Rechercher « {query} » dans le manuel de {name}',
  'Search for “{query}”': 'Rechercher « {query} »',
  'Look up “{query}” in {name}': 'Chercher « {query} » dans {name}',
  'Undo draft changes to {path}': 'Annuler les modifications du brouillon dans {path}',
  'Edit {path}': 'Modifier {path}',
  'Create {path}': 'Créer {path}',
  'Delete {path}': 'Supprimer {path}',
  'Move {from} to {to}': 'Déplacer {from} vers {to}',
  'Use skill “{name}”': 'Utiliser le skill « {name} »',
  'Read {path} of skill “{name}”': 'Lire {path} du skill « {name} »',
  'Draft skill “{name}”': 'Rédiger le skill « {name} »',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '« {from} » renommé en {name}',
  '{name} has no description; used its first line': '{name} n’a pas de description ; sa première ligne a été utilisée',
  '{name}: skipped {path} (not a text file)': '{name} : {path} ignoré (pas un fichier texte)',
  '{name}: skipped {path} (too large)': '{name} : {path} ignoré (trop volumineux)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': 'Clé API pour {name} (laissez vide si le serveur n’en demande pas)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'Terminez la connexion dans votre navigateur, ou collez ici le code d’autorisation ou l’URL de redirection :',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'Terminez la connexion dans votre navigateur, ou collez ici le code d’autorisation ou l’URL de redirection :',
  'Complete login in your browser, or paste the final redirect URL here:': 'Terminez la connexion dans votre navigateur, ou collez ici l’URL de redirection finale :',
  'Paste the code Anthropic shows after you sign in:': 'Collez le code qu’Anthropic affiche après la connexion :',
  'Exchanging authorization code for tokens...': 'Échange du code d’autorisation contre des jetons…',
  'Exchanging authorization code for an API key...': 'Échange du code d’autorisation contre une clé API…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'URL ou domaine GitHub Enterprise (vide pour github.com)',
  'Select {name} login method:': 'Choisissez la méthode de connexion à {name} :',
  'Select {name} authentication method:': 'Choisissez la méthode d’authentification de {name} :',
  'Listening for OAuth callback on {url}': 'En attente du rappel OAuth sur {url}',
  'Sign in to {name}:': 'Connexion à {name} :',
  'Enter {name}': 'Saisissez {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    'Vous avez placé un caractère d’alignement « & » au mauvais endroit. Pour aligner quelque chose, écrivez-le dans un environnement d’alignement comme \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. Pour écrire une esperluette « & » dans le texte, écrivez plutôt \\&.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    'Vous avez écrit trop de caractères d’alignement dans une ligne de tableau, et l’un d’eux a été transformé en saut de ligne. Vérifiez que le nombre de colonnes déclaré pour le tableau est correct.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'Vous avez oublié un signe $ à la fin d’une formule centrée. Les formules centrées doivent toujours être écrites entre $$ … $$. Vérifiez que le nombre de $ correspond autour de chaque expression mathématique.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    'Toutes les expressions et tous les symboles mathématiques doivent être encadrés par des délimiteurs spéciaux, qui créent un « mode mathématique ». Utilisez $...$ pour les maths en ligne, et \\[...\\] ou l’un des environnements mathématiques (p. ex. equation) pour les maths centrées. Cela vaut pour les indices ( _ ), les intégrales ( \\int ), les lettres grecques ( \\alpha, \\beta, \\delta ) et les modificateurs (\\vec{x}, \\tilde{x}).',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'Vous faites référence à un élément qui n’a pas encore d’étiquette. S’il en a déjà une, vérifiez que le contenu de \\ref{...} est identique à celui de \\label{...}.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    'Vous citez une référence absente de votre bibliographie. Vérifiez que la citation (\\cite{...}) a une clé correspondante dans votre bibliographie, orthographiée de la même façon.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    'Vous avez utilisé la même étiquette plusieurs fois. Vérifiez que chaque \\label{...} n’étiquette qu’un seul élément.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    'Le spécificateur de flottant « h » est trop strict pour que LaTeX puisse placer correctement votre flottant ici. Assouplissez-le avec « ht », voire « htbp » si nécessaire. Pour garder malgré tout le flottant à cet endroit, voyez le package float.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'Vous avez oublié le spécificateur de flottant, qui indique à LaTeX où placer votre figure. Pour corriger, insérez un spécificateur entre les crochets (p. ex. \\begin{figure}[h]) ou supprimez les crochets (p. ex. \\begin{figure} ). En savoir plus sur les spécificateurs de flottants ici.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    'Le compilateur ne comprend pas une commande que vous avez utilisée. Vérifiez son orthographe. Si la commande fait partie d’un package, vérifiez que vous l’avez chargé dans le préambule avec \\usepackage{...}.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'Il semble manquer un package ! La commande {command} ne fonctionnera que si vous ajoutez {usage} au préambule de votre document.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    'Vous avez créé un environnement (avec \\begin{…} et \\end{…}) qui n’est pas reconnu. Vérifiez que le package requis par cet environnement est chargé dans le préambule et que le nom de l’environnement est bien orthographié.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'Il semble manquer un package ! L’environnement {environment} ne fonctionnera que si vous ajoutez {usage} au préambule de votre document.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    'Le compilateur ne trouve pas le fichier que vous voulez inclure. Vérifiez que vous l’avez bien téléversé et que son chemin est correct.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    'Le compilateur ne reconnaît pas le type de fichier de l’une de vos images. Vérifiez que le format d’image est pris en charge par le compilateur choisi et que le nom de l’image ne contient pas de point (.) superflu.',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'Le compilateur ne reconnaît pas l’option de flottant « H ». Ajoutez \\usepackage{float} au préambule pour corriger cela.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'Vous avez utilisé un spécificateur de flottant que le compilateur ne comprend pas. Vous pouvez en savoir plus ici sur les options disponibles pour placer les figures.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    'Vous avez utilisé une commande de police disponible uniquement en mode mathématique. Pour l’utiliser, vous devez être en mode mathématique (p. ex. $ … $ ou \\begin{math} … \\end{math} ). Hors du mode mathématique, utilisez plutôt la version texte : \\textrm, \\textit, etc.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    'Vous avez utilisé \\begin{...} sans \\end{...} correspondant.',
  'You have used an open bracket without a corresponding close bracket.':
    'Vous avez ouvert une accolade ou une parenthèse sans la refermer.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'Vous avez utilisé dans le corps du document une commande qui doit figurer dans le préambule. Vérifiez que \\documentclass[…]{…} et toutes les commandes \\usepackage{…} sont écrites avant \\begin{document}.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    'Vous avez commencé une expression par \\left sans \\right correspondant. Vérifiez que vos commandes \\left et \\right sont partout appariées, ou utilisez plutôt \\Biggl et \\Biggr, comme indiqué ici.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    'Vous avez écrit un double exposant de façon incorrecte (a^b^c), ou un prime suivi d’un exposant. Pensez à utiliser { et } pour les exposants multiples. Essayez plutôt a^{b^c}.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    'Vous avez écrit un double indice de façon incorrecte (a_b_c). Pensez à utiliser { et } pour les indices multiples. Essayez plutôt a_{b_c}.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    'Vous avez utilisé \\maketitle sans définir de \\author. Pour corriger, indiquez un auteur dans le préambule avec la commande \\author{…}.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    'Une liste que vous avez créée ne contient aucun élément. Vérifiez que chaque élément commence par \\item et que la liste n’est pas placée dans un tableau.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    'Vous avez placé une commande \\hline au mauvais endroit, probablement hors d’un tableau. Si \\hline est bien dans un tableau, essayez d’ajouter \\\\ avant.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'Vous avez utilisé \\\\ ou \\newline là où LaTeX ne l’attendait pas. N’utilisez les sauts de ligne qu’après un bloc de texte, et soyez prudent avec les sauts de ligne dans les listes et les autres environnements.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    'Vous avez mal utilisé la commande \\verb. Essayez de la remplacer par \\begin{verbatim} … \\end{verbatim}.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    'Vous avez écrit une longueur sans préciser d’unité (pt, mm, cm, etc.). Si vous n’avez pas écrit de longueur, vérifiez que vous n’avez écrit nulle part un saut de ligne \\\\ suivi de crochets […].',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    'Vous avez écrit une commande \\right sans \\left correspondant. Vérifiez que toutes les commandes \\left et \\right sont partout appariées.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    'Aucune commande \\begin{document} n’a été trouvée. Vérifiez que vous avez bien écrit \\begin{document} et que le document principal est correctement défini.',
  'You have used \\begin{} without a corresponding \\end{}.':
    'Vous avez utilisé \\begin{} sans \\end{} correspondant.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} erreur de compilation',
  'Compile log': 'Journal de compilation',
  'Search the web for “{query}”': 'Rechercher « {query} » sur le web',
  'Read web page {url}': 'Lire la page web {url}',
  'Look at page {page} of the PDF': 'Regarder la page {page} du PDF',
}

export default messages
