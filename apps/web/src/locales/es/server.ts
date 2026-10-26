// Spanish messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'Se omitió el enlace simbólico {name}',
  'Duplicate entry {path}; kept the last one': 'Entrada duplicada {path}; se conservó la última',

  // History
  'Initial version': 'Versión inicial',
  'Created the project': 'Creó el proyecto',
  'Imported the project': 'Importó el proyecto',
  'Converted to a journal template': 'Convertido a una plantilla de revista',
  'Copied from another project': 'Copiado de otro proyecto',
  'Applied changes from the AI agent': 'Aplicó cambios del agente de IA',
  'Edited by an AI agent over MCP': 'Editado por un agente de IA a través de MCP',
  'Accepted or rejected tracked changes': 'Aceptó o rechazó cambios registrados',
  'Restored an earlier version': 'Restauró una versión anterior',
  'Deleted user': 'Usuario eliminado',

  // AI assistant: availability
  'The AI agent is unavailable': 'El agente de IA no está disponible',
  'The AI agent is turned off': 'El agente de IA está desactivado',
  "You don't have access to the AI agent": 'No tienes acceso al agente de IA',
  'No AI model is available to you': 'No tienes ningún modelo de IA disponible',
  'No AI provider is connected yet': 'Aún no hay ningún proveedor de IA conectado',
  'Auto: {model} for a quick answer': 'Automático: {model} para una respuesta rápida',
  'Auto: {model} for this task': 'Automático: {model} para esta tarea',
  '{provider} keeps failing; {model} answers this message instead': '{provider} sigue fallando; {model} responde a este mensaje en su lugar',
  '{provider} is not signed in': 'No se ha iniciado sesión en {provider}',

  // AI assistant: session, apply and undo
  'Draft changes discarded': 'Se descartaron los cambios del borrador',
  'Stopped; the draft was not applied': 'Detenido; el borrador no se aplicó',
  'Applied changes to {files}; stopped before the build finished.': 'Se aplicaron los cambios en {files}; se detuvo antes de que terminara la compilación.',
  'Applied changes to {files}. Build: {before} → {after} errors.': 'Se aplicaron los cambios a {files}. Compilación: {before} → {after} errores.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'Se deshicieron los cambios del agente de IA, excepto en {files}, donde las mismas líneas se editaron después.',
  "Undid the AI agent's changes.": 'Se deshicieron los cambios del agente de IA.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'Listar los archivos del proyecto',
  'Read compile log': 'Leer el registro de compilación',
  'Compile with proposed changes': 'Compilar con los cambios propuestos',
  'Read the {name} manual': 'Leer el manual de {name}',
  'Read {name} from TeX Live': 'Leer {name} de TeX Live',
  'Read {path} (lines {start}–end)': 'Leer {path} (líneas {start}–final)',
  'Read {path} (lines {start}–{end})': 'Leer {path} (líneas {start}–{end})',
  'Read {path}': 'Leer {path}',
  'Search compile log for “{query}”': 'Buscar «{query}» en el registro de compilación',
  'Search the {name} manual for “{query}”': 'Buscar «{query}» en el manual de {name}',
  'Search for “{query}”': 'Buscar «{query}»',
  'Look up “{query}” in {name}': 'Consultar «{query}» en {name}',
  'Undo draft changes to {path}': 'Deshacer los cambios del borrador en {path}',
  'Edit {path}': 'Editar {path}',
  'Create {path}': 'Crear {path}',
  'Delete {path}': 'Eliminar {path}',
  'Move {from} to {to}': 'Mover {from} a {to}',
  'Use skill “{name}”': 'Usar la skill «{name}»',
  'Read {path} of skill “{name}”': 'Leer {path} de la skill «{name}»',
  'Draft skill “{name}”': 'Redactar la skill «{name}»',
  // Notes from importing skills
  'Renamed “{from}” to {name}': 'Se cambió el nombre de «{from}» a {name}',
  '{name} has no description; used its first line': '{name} no tiene descripción; se usó su primera línea',
  '{name}: skipped {path} (not a text file)': '{name}: se omitió {path} (no es un archivo de texto)',
  '{name}: skipped {path} (too large)': '{name}: se omitió {path} (demasiado grande)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': 'Clave de API de {name} (déjala vacía si el servidor no la necesita)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'Completa el inicio de sesión en tu navegador o pega aquí el código de autorización o la URL de redirección:',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'Completa el inicio de sesión en tu navegador o pega aquí el código de autorización o la URL de redirección:',
  'Complete login in your browser, or paste the final redirect URL here:': 'Completa el inicio de sesión en tu navegador o pega aquí la URL de redirección final:',
  'Paste the code Anthropic shows after you sign in:': 'Pega el código que muestra Anthropic después de iniciar sesión:',
  'Exchanging authorization code for tokens...': 'Intercambiando el código de autorización por tokens…',
  'Exchanging authorization code for an API key...': 'Intercambiando el código de autorización por una clave de API…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'URL o dominio de GitHub Enterprise (vacío para github.com)',
  'Select {name} login method:': 'Elige el método de inicio de sesión de {name}:',
  'Select {name} authentication method:': 'Elige el método de autenticación de {name}:',
  'Listening for OAuth callback on {url}': 'Esperando la respuesta de OAuth en {url}',
  'Sign in to {name}:': 'Inicia sesión en {name}:',
  'Enter {name}': 'Introduce {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    'Has puesto un carácter de alineación \'&\' en un lugar incorrecto. Si quieres alinear algo, debes escribirlo dentro de un entorno de alineación como \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. Si quieres escribir un signo \'&\' en el texto, escribe \\& en su lugar.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    'Has escrito demasiados caracteres de alineación en una tabla, y uno de ellos se ha convertido en un salto de línea. Comprueba que has indicado el número correcto de columnas en la tabla.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'Falta un signo $ al final del modo de matemáticas destacadas. En ese modo, las matemáticas siempre deben escribirse dentro de $$ … $$. Comprueba que el número de $ coincide alrededor de cada expresión matemática.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    'Debes encerrar todas las expresiones y símbolos matemáticos entre marcadores especiales, que crean un «modo matemático». Usa $...$ para matemáticas en línea y \\[...\\] o uno de los entornos matemáticos (p. ej., equation) para matemáticas destacadas. Esto se aplica a símbolos como subíndices ( _ ), integrales ( \\int ), letras griegas ( \\alpha, \\beta, \\delta ) y modificadores (\\vec{x}, \\tilde{x}).',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'Has hecho referencia a algo que aún no tiene etiqueta. Si ya lo has etiquetado, comprueba que lo que está escrito dentro de \\ref{...} es igual a lo que está escrito dentro de \\label{...}.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    'Has citado algo que no está en tu bibliografía. Comprueba que la cita (\\cite{...}) tiene una clave correspondiente en la bibliografía y que ambas se escriben igual.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    'Has usado la misma etiqueta más de una vez. Comprueba que cada \\label{...} etiqueta un solo elemento.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    'El especificador de flotante \'h\' es demasiado estricto para que LaTeX coloque bien el flotante aquí. Prueba a relajarlo con \'ht\', o incluso \'htbp\' si hace falta. Si aun así quieres mantener el flotante aquí, consulta el paquete float.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'Te falta un especificador de flotante, que indica a LaTeX dónde colocar la figura. Para corregirlo, escribe un especificador dentro de los corchetes (p. ej., \\begin{figure}[h]) o quita los corchetes (p. ej., \\begin{figure} ). Aquí encontrarás más información sobre los especificadores de flotante.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    'El compilador no entiende un comando que has usado. Comprueba que el comando está bien escrito. Si el comando forma parte de un paquete, asegúrate de haber cargado el paquete en el preámbulo con \\usepackage{...}.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'Parece que falta un paquete. El comando {command} no funcionará a menos que incluyas {usage} en el preámbulo del documento.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    'Has creado un entorno (con los comandos \\begin{…} y \\end{…}) que no se reconoce. Asegúrate de haber cargado en el preámbulo el paquete que necesita ese entorno y de que su nombre está bien escrito.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'Parece que falta un paquete. El entorno {environment} no funcionará a menos que incluyas {usage} en el preámbulo del documento.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    'El compilador no encuentra el archivo que quieres incluir. Comprueba que has subido el archivo y que su ruta es correcta.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    'El compilador no reconoce el tipo de archivo de una de tus imágenes. Asegúrate de usar un formato de imagen compatible con el compilador elegido y de que el nombre de la imagen no contiene puntos (.).',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'El compilador no reconoce la opción de flotante \'H\'. Para corregirlo, incluye \\usepackage{float} en el preámbulo.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'Has usado un especificador de flotante que el compilador no entiende. Aquí puedes obtener más información sobre las opciones disponibles para colocar figuras.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    'Has usado un comando de fuente que solo está disponible en modo matemático. Para usarlo debes estar en modo matemático (p. ej., $ … $ o \\begin{math} … \\end{math} ). Si quieres usarlo fuera del modo matemático, usa la versión de texto: \\textrm, \\textit, etc.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    'Has usado \\begin{...} sin el \\end{...} correspondiente.',
  'You have used an open bracket without a corresponding close bracket.':
    'Has abierto un paréntesis o una llave sin cerrarlo.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'Has usado en el cuerpo del documento un comando que debe ir en el preámbulo. Asegúrate de que \\documentclass[…]{…} y todos los comandos \\usepackage{…} están antes de \\begin{document}.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    'Has empezado una expresión con un comando \\left, pero no has incluido el \\right correspondiente. Comprueba que los comandos \\left y \\right están equilibrados en todas partes, o bien prueba a usar \\Biggl y \\Biggr como se muestra aquí.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    'Has escrito incorrectamente un superíndice doble como a^b^c, o has escrito una prima con un superíndice. Recuerda usar { y } con varios superíndices. Prueba a^{b^c} en su lugar.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    'Has escrito incorrectamente un subíndice doble como a_b_c. Recuerda usar { y } con varios subíndices. Prueba a_{b_c} en su lugar.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    'Has usado el comando \\maketitle, pero no has indicado ningún \\author. Para corregirlo, añade un autor en el preámbulo con el comando \\author{…}.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    'Una lista que has creado no tiene elementos. Asegúrate de marcar cada elemento con el comando \\item y de no haber usado una lista dentro de una tabla.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    'Has usado un comando \\hline en un lugar incorrecto, probablemente fuera de una tabla. Si el comando \\hline está dentro de una tabla, prueba a poner \\\\ antes.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'Has usado un comando \\\\ o \\newline donde LaTeX no lo esperaba. Usa saltos de línea solo después de bloques de texto y ten cuidado con ellos dentro de listas y otros entornos.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    'Has usado incorrectamente el comando \\verb. Prueba a reemplazarlo por \\begin{verbatim} … \\end{verbatim}.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    'Has escrito una longitud sin indicar las unidades (pt, mm, cm, etc.). Si no has escrito ninguna longitud, comprueba que no hay en ninguna parte un salto de línea \\\\ seguido de corchetes […].',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    'Has escrito un comando \\right sin el \\left correspondiente. Comprueba que los comandos \\left y \\right están equilibrados en todas partes.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    'No se encontró ningún comando \\begin{document}. Asegúrate de haber incluido \\begin{document} y de que el documento principal está bien configurado.',
  'You have used \\begin{} without a corresponding \\end{}.':
    'Has usado \\begin{} sin el \\end{} correspondiente.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} error de compilación',
  'Compile log': 'Registro de compilación',
  'Search the web for “{query}”': 'Buscar «{query}» en la web',
  'Read web page {url}': 'Leer la página web {url}',
}

export default messages
