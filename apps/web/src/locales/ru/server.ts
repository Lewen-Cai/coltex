// Russian messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'Пропущена символическая ссылка {name}',
  'Duplicate entry {path}; kept the last one': 'Повторяющаяся запись {path}; сохранена последняя',

  // History
  'Initial version': 'Начальная версия',
  'Created the project': 'Проект создан',
  'Imported the project': 'Проект импортирован',
  'Converted to a journal template': 'Преобразовано в шаблон журнала',
  'Copied from another project': 'Скопировано из другого проекта',
  'Applied changes from the AI agent': 'Применены изменения ИИ-агента',
  'Edited by an AI agent over MCP': 'Изменено ИИ-агентом через MCP',
  'Accepted or rejected tracked changes': 'Приняты или отклонены отслеживаемые изменения',
  'Restored an earlier version': 'Восстановлена более ранняя версия',
  'Deleted user': 'Удалённый пользователь',

  // AI assistant: availability
  'The AI agent is unavailable': 'ИИ-агент недоступен',
  'The AI agent is turned off': 'ИИ-агент отключён',
  "You don't have access to the AI agent": 'У вас нет доступа к ИИ-агенту',
  'No AI model is available to you': 'Вам не доступна ни одна модель ИИ',
  'No AI provider is connected yet': 'Ни один провайдер ИИ пока не подключён',
  'Auto: {model} for a quick answer': 'Авто: {model} для быстрого ответа',
  'Auto: {model} for this task': 'Авто: {model} для этой задачи',
  '{provider} keeps failing; {model} answers this message instead': '{provider} продолжает выдавать ошибки; на это сообщение ответит {model}',
  '{provider} is not signed in': 'Вход в {provider} не выполнен',

  // AI assistant: session, apply and undo
  'Draft changes discarded': 'Изменения черновика отброшены',
  'Stopped; the draft was not applied': 'Остановлено; черновик не применён',
  'Applied changes to {files}; stopped before the build finished.': 'Изменения применены к {files}; остановлено до окончания сборки.',
  'Applied changes to {files}. Build: {before} → {after} errors.': 'Изменения применены к {files}. Ошибок сборки: {before} → {after}.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'Изменения ИИ-агента отменены, кроме {files}, где те же строки с тех пор были изменены.',
  "Undid the AI agent's changes.": 'Изменения ИИ-агента отменены.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'Просмотр списка файлов проекта',
  'Read compile log': 'Чтение журнала компиляции',
  'Compile with proposed changes': 'Компиляция с предложенными изменениями',
  'Read the {name} manual': 'Чтение руководства {name}',
  'Read {name} from TeX Live': 'Чтение {name} из TeX Live',
  'Read {path} (lines {start}–end)': 'Чтение {path} (строки {start}–конец)',
  'Read {path} (lines {start}–{end})': 'Чтение {path} (строки {start}–{end})',
  'Read {path}': 'Чтение {path}',
  'Search compile log for “{query}”': 'Поиск «{query}» в журнале компиляции',
  'Search the {name} manual for “{query}”': 'Поиск «{query}» в руководстве {name}',
  'Search for “{query}”': 'Поиск «{query}»',
  'Look up “{query}” in {name}': 'Поиск «{query}» в {name}',
  'Undo draft changes to {path}': 'Отмена изменений черновика в {path}',
  'Edit {path}': 'Правка {path}',
  'Create {path}': 'Создание {path}',
  'Delete {path}': 'Удаление {path}',
  'Move {from} to {to}': 'Перемещение {from} в {to}',
  'Use skill “{name}”': 'Использование skill «{name}»',
  'Read {path} of skill “{name}”': 'Чтение {path} из skill «{name}»',
  'Draft skill “{name}”': 'Черновик skill «{name}»',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '«{from}» переименован в {name}',
  '{name} has no description; used its first line': 'У {name} нет описания; использована его первая строка',
  '{name}: skipped {path} (not a text file)': '{name}: пропущен {path} (не текстовый файл)',
  '{name}: skipped {path} (too large)': '{name}: пропущен {path} (слишком большой)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': 'Ключ API для {name} (оставьте пустым, если серверу он не нужен)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'Завершите вход в браузере или вставьте сюда код авторизации либо URL перенаправления:',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'Завершите вход в браузере или вставьте сюда код авторизации либо URL перенаправления:',
  'Complete login in your browser, or paste the final redirect URL here:': 'Завершите вход в браузере или вставьте сюда итоговый URL перенаправления:',
  'Paste the code Anthropic shows after you sign in:': 'Вставьте код, который Anthropic покажет после входа:',
  'Exchanging authorization code for tokens...': 'Обмен кода авторизации на токены…',
  'Exchanging authorization code for an API key...': 'Обмен кода авторизации на ключ API…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'URL или домен GitHub Enterprise (оставьте пустым для github.com)',
  'Select {name} login method:': 'Выберите способ входа в {name}:',
  'Select {name} authentication method:': 'Выберите способ аутентификации в {name}:',
  'Listening for OAuth callback on {url}': 'Ожидание обратного вызова OAuth на {url}',
  'Sign in to {name}:': 'Вход в {name}:',
  'Enter {name}': 'Введите {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    'Символ табуляции выравнивания «&» стоит не на своём месте. Выравниваемое содержимое нужно писать внутри окружения выравнивания, например \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular} и т. п. Чтобы вывести амперсанд «&» в тексте, пишите \\&.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    'В строке таблицы слишком много символов табуляции выравнивания, и один из них превратился в разрыв строки. Проверьте, что в таблице указано правильное число столбцов.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'В конце выносной формулы не хватает знака $. В режиме выносных формул формулу всегда нужно писать внутри $$ … $$. Проверьте, что число знаков $ вокруг каждой формулы совпадает.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    'Все математические выражения и символы нужно заключать в специальные маркеры, которые включают «математический режим». Используйте $...$ для формул в тексте и \\[...\\] или одно из математических окружений (например, equation) для выносных формул. Это относится к таким символам, как нижние индексы ( _ ), интегралы ( \\int ), греческие буквы ( \\alpha, \\beta, \\delta ) и модификаторы (\\vec{x}, \\tilde{x}).',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'Вы ссылаетесь на объект, у которого ещё нет метки. Если метка уже есть, проверьте, что текст внутри \\ref{...} совпадает с текстом внутри \\label{...}.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    'Вы цитируете источник, которого нет в библиографии. Проверьте, что для ссылки (\\cite{...}) в библиографии есть соответствующий ключ и что оба написаны одинаково.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    'Одна и та же метка использована несколько раз. Проверьте, что каждая \\label{...} помечает только один объект.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    'Спецификатор размещения «h» слишком строг: LaTeX не может аккуратно разместить здесь плавающий объект. Ослабьте его до «ht» или при необходимости до «htbp». Если объект всё же нужно оставить именно здесь, воспользуйтесь пакетом float.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'Не указан спецификатор размещения, который сообщает LaTeX, где расположить рисунок. Либо укажите спецификатор в квадратных скобках (например, \\begin{figure}[h]), либо уберите квадратные скобки (например, \\begin{figure} ). Подробнее о спецификаторах размещения — по ссылке.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    'Компилятор не может распознать одну из использованных команд. Проверьте написание команды. Если она входит в пакет, убедитесь, что пакет подключён в преамбуле с помощью \\usepackage{...}.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'Похоже, не хватает пакета! Команда {command} не будет работать, пока вы не добавите {usage} в преамбулу документа.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    'Использованное окружение (команды \\begin{…} и \\end{…}) не распознано. Убедитесь, что нужный для него пакет подключён в преамбуле и что имя окружения написано правильно.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'Похоже, не хватает пакета! Окружение {environment} не будет работать, пока вы не добавите {usage} в преамбулу документа.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    'Компилятор не может найти подключаемый файл. Убедитесь, что файл загружен и путь к нему указан правильно.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    'Компилятор не распознаёт тип файла одного из изображений. Убедитесь, что формат изображения поддерживается выбранным компилятором, и что в имени файла нет лишних точек (.).',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'Компилятор не распознаёт параметр размещения «H». Чтобы исправить это, добавьте \\usepackage{float} в преамбулу.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'Использован спецификатор размещения, который компилятор не понимает. Подробнее о доступных параметрах размещения рисунков — по ссылке.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    'Использована команда шрифта, доступная только в математическом режиме. Её можно использовать только в математическом режиме (например, $ … $ или \\begin{math} … \\end{math} ). Вне математического режима используйте текстовый вариант: \\textrm, \\textit и т. п.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    'Использована команда \\begin{...} без соответствующей \\end{...}.',
  'You have used an open bracket without a corresponding close bracket.':
    'Открывающая скобка не имеет соответствующей закрывающей.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'В теле документа использована команда, которая должна стоять в преамбуле. Убедитесь, что \\documentclass[…]{…} и все команды \\usepackage{…} написаны до \\begin{document}.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    'Выражение начато командой \\left, но соответствующей команды \\right нет. Убедитесь, что команды \\left и \\right везде парные, или используйте вместо них \\Biggl и \\Biggr, как показано по ссылке.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    'Двойной верхний индекс записан неправильно как a^b^c, либо после штриха стоит верхний индекс. При нескольких верхних индексах используйте { и }. Попробуйте a^{b^c}.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    'Двойной нижний индекс записан неправильно как a_b_c. При нескольких нижних индексах используйте { и }. Попробуйте a_{b_c}.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    'Использована команда \\maketitle, но \\author не указан. Чтобы исправить это, укажите автора в преамбуле с помощью команды \\author{…}.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    'В созданном списке нет элементов. Убедитесь, что элементы списка начинаются с команды \\item и что список не находится внутри таблицы.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    'Команда \\hline стоит не на своём месте — вероятно, вне таблицы. Если \\hline находится внутри таблицы, попробуйте поставить перед ней \\\\.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'Команда \\\\ или \\newline использована там, где LaTeX её не ожидает. Ставьте разрывы строк только после блоков текста и будьте осторожны с ними внутри списков и других окружений.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    'Команда \\verb использована неправильно. Попробуйте заменить \\verb на \\begin{verbatim} … \\end{verbatim}.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    'Указана длина без единиц измерения (pt, mm, cm и т. п.). Если вы не указывали длину, проверьте, нет ли где-нибудь разрыва строки \\\\, за которым следуют квадратные скобки […].',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    'Команда \\right использована без соответствующей \\left. Проверьте, что команды \\left и \\right везде парные.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    'Команда \\begin{document} не найдена. Убедитесь, что в документе есть \\begin{document} и что главный документ указан правильно.',
  'You have used \\begin{} without a corresponding \\end{}.':
    'Использована команда \\begin{} без соответствующей \\end{}.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': 'Ошибок компиляции: {n}',
  'Compile log': 'Журнал компиляции',
}

export default messages
