// Chinese (Traditional) messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': '已略過符號連結 {name}',
  'Duplicate entry {path}; kept the last one': '項目 {path} 重複，已保留最後一個',

  // History
  'Initial version': '初始版本',
  'Created the project': '建立了專案',
  'Imported the project': '匯入了專案',
  'Converted to a journal template': '轉換為期刊範本',
  'Copied from another project': '從其他專案複製而來',
  'Applied changes from the AI agent': '套用了 AI 代理的修改',
  'Edited by an AI agent over MCP': 'AI 代理透過 MCP 修改',
  'Accepted or rejected tracked changes': '接受或拒絕了追蹤修訂',
  'Restored an earlier version': '還原了較早的版本',
  'Deleted user': '已刪除的使用者',

  // AI assistant: availability
  'The AI agent is unavailable': 'AI 代理無法使用',
  'The AI agent is turned off': 'AI 代理已停用',
  "You don't have access to the AI agent": '你沒有使用 AI 代理的權限',
  'No AI model is available to you': '沒有你可以使用的 AI 模型',
  'No AI provider is connected yet': '尚未連接任何 AI 供應商',
  'Auto: {model} for a quick answer': '自動：這則訊息使用 {model} 快速回答',
  'Auto: {model} for this task': '自動：這則訊息使用 {model} 處理',
  '{provider} keeps failing; {model} answers this message instead': '{provider} 持續出錯，這則訊息改由 {model} 回答',
  '{provider} is not signed in': '{provider} 尚未登入',

  // AI assistant: session, apply and undo
  'Draft changes discarded': '已捨棄草稿修改',
  'Applied changes to {files}. Build: {before} → {after} errors.': '已將修改套用到 {files}。編譯錯誤：{before} → {after} 個。',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    '已復原 AI 代理的修改，但 {files} 中的相同行之後已被修改，因此未復原。',
  "Undid the AI agent's changes.": '已復原 AI 代理的修改。',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': '列出專案檔案',
  'Read compile log': '讀取編譯記錄檔',
  'Compile with proposed changes': '以建議的修改進行編譯',
  'Read the {name} manual': '閱讀 {name} 手冊',
  'Read {name} from TeX Live': '從 TeX Live 讀取 {name}',
  'Read {path} (lines {start}–end)': '讀取 {path}（第 {start} 行至結尾）',
  'Read {path} (lines {start}–{end})': '讀取 {path}（第 {start}–{end} 行）',
  'Read {path}': '讀取 {path}',
  'Search compile log for “{query}”': '在編譯記錄檔中搜尋「{query}」',
  'Search the {name} manual for “{query}”': '在 {name} 手冊中搜尋「{query}」',
  'Search for “{query}”': '搜尋「{query}」',
  'Look up “{query}” in {name}': '在 {name} 中查詢「{query}」',
  'Undo draft changes to {path}': '復原對 {path} 的草稿修改',
  'Edit {path}': '編輯 {path}',
  'Create {path}': '建立 {path}',
  'Delete {path}': '刪除 {path}',
  'Move {from} to {to}': '將 {from} 移動到 {to}',
  'Use skill “{name}”': '使用 Skill「{name}」',
  'Read {path} of skill “{name}”': '讀取 Skill「{name}」的 {path}',
  'Draft skill “{name}”': '起草 Skill「{name}」',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '已將「{from}」重新命名為 {name}',
  '{name} has no description; used its first line': '{name} 沒有說明，已改用它的第一行',
  '{name}: skipped {path} (not a text file)': '{name}：已略過 {path}（不是文字檔）',
  '{name}: skipped {path} (too large)': '{name}：已略過 {path}（檔案太大）',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': '{name} 的 API 金鑰（如果伺服器不需要，可留空）',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    '請在瀏覽器中完成登入，或在此貼上授權碼或重新導向 URL：',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    '請在瀏覽器中完成登入，或在此貼上授權碼或重新導向 URL：',
  'Complete login in your browser, or paste the final redirect URL here:': '請在瀏覽器中完成登入，或在此貼上最終的重新導向 URL：',
  'Paste the code Anthropic shows after you sign in:': '貼上登入後 Anthropic 顯示的代碼：',
  'Exchanging authorization code for tokens...': '正在以授權碼換取權杖…',
  'Exchanging authorization code for an API key...': '正在以授權碼換取 API 金鑰…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'GitHub Enterprise 的 URL 或網域（使用 github.com 請留空）',
  'Select {name} login method:': '選擇 {name} 的登入方式：',
  'Select {name} authentication method:': '選擇 {name} 的驗證方式：',
  'Listening for OAuth callback on {url}': '正在 {url} 等待 OAuth 回呼',
  'Sign in to {name}:': '登入 {name}：',
  'Enter {name}': '輸入 {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    '對齊符號 \'&\' 放錯了位置。需要對齊的內容必須寫在對齊環境中，例如 \\begin{align} … \\end{align}、\\begin{tabular} … \\end{tabular} 等。如果想在內文中寫出 \'&\' 這個字元，請改寫成 \\&。',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    '表格某一列中的對齊符號 & 太多，多出的一個被當成了換行。請檢查表格宣告的欄數是否正確。',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    '獨立公式結尾少了 $ 符號。獨立公式必須寫在 $$ … $$ 之間，請檢查每個公式兩側的 $ 數量是否一致。',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    '數學式和符號必須放在數學模式中：行內公式用 $...$，獨立公式用 \\[...\\] 或數學環境（如 equation）。下標（ _ ）、積分（ \\int ）、希臘字母（ \\alpha、\\beta、\\delta ）以及 \\vec{x}、\\tilde{x} 這類修飾符號都需要這樣處理。',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    '參照了一個尚未設定標籤的對象。如果已經設定過標籤，請確認 \\ref{...} 中寫的和 \\label{...} 中寫的完全一致。',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    '引用了參考文獻中沒有的條目。請確認 \\cite{...} 中的鍵存在於參考文獻中，且兩處拼寫一致。',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    '同一個標籤使用了不只一次。請確認每個 \\label{...} 只對應一個對象。',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    '浮動物件位置參數 \'h\' 要求太嚴格，LaTeX 無法在這裡妥善放置。可以放寬為 \'ht\'，必要時改用 \'htbp\'。如果一定要放在這裡，可以使用 float 套件。',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    '方括號中缺少浮動物件位置參數（它告訴 LaTeX 圖表要放在哪裡）。可以在方括號中填入位置參數（如 \\begin{figure}[h]），或者移除方括號（如 \\begin{figure} ）。按「瞭解更多」可查看位置參數的說明。',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    '編譯器無法辨識你使用的某個指令。請檢查指令拼寫是否正確；如果它來自某個套件，請確認已在導言區用 \\usepackage{...} 載入該套件。',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    '可能缺少套件：需要在導言區加入 {usage}，{command} 指令才能使用。',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    '使用了一個無法辨識的環境（\\begin{…} 和 \\end{…}）。請確認已在導言區載入該環境所需的套件，且環境名稱拼寫正確。',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    '可能缺少套件：需要在導言區加入 {usage}，{environment} 環境才能使用。',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    '編譯器找不到要引入的檔案。請確認檔案已上傳，且路徑寫得正確。',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    '編譯器無法辨識某張圖片的檔案類型。請確認圖片格式受目前的編譯器支援，並檢查圖片檔名中沒有多餘的句點（.）。',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    '編譯器無法辨識浮動物件位置參數 \'H\'。在導言區加入 \\usepackage{float} 即可。',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    '使用了編譯器無法辨識的浮動物件位置參數。按「瞭解更多」可查看可用的位置參數。',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    '使用了只能在數學模式中使用的字型指令。這個指令必須寫在數學模式中（如 $ … $ 或 \\begin{math} … \\end{math} ）。如果要在內文中使用，請改用對應的文字指令，如 \\textrm、\\textit 等。',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    '有 \\begin{...} 沒有對應的 \\end{...}。',
  'You have used an open bracket without a corresponding close bracket.':
    '有左括號沒有對應的右括號。',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    '在內文中使用了只能放在導言區的指令。請確認 \\documentclass[…]{…} 和所有 \\usepackage{…} 都寫在 \\begin{document} 之前。',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    '算式以 \\left 開頭，但沒有對應的 \\right。請確認 \\left 和 \\right 成對出現，或改用 \\Biggl 和 \\Biggr（見「瞭解更多」）。',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    '雙重上標寫成了 a^b^c，或是在撇號（′）後面又加了上標。多重上標要用 { 和 } 分組，例如 a^{b^c}。',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    '雙重下標寫成了 a_b_c。多重下標要用 { 和 } 分組，例如 a_{b_c}。',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    '使用了 \\maketitle，但沒有設定 \\author。請在導言區用 \\author{…} 寫上作者。',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    '清單中沒有任何項目。請確認每個項目都以 \\item 開頭，且沒有把清單放在表格中。',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    '\\hline 放錯了位置，可能寫在了表格外面。如果它在表格中，請在它前面加上 \\\\。',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    '在 LaTeX 不允許換行的地方使用了 \\\\ 或 \\newline。換行只能放在一段文字之後，在清單等環境中使用時要特別注意。',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    '\\verb 指令用法有誤（不能跨行）。可以改用 \\begin{verbatim} … \\end{verbatim}。',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    '寫了一個長度但沒有單位（pt、mm、cm 等）。如果你並沒有寫長度，請檢查是否有換行符號 \\\\ 後面緊接著方括號 […]。',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    '有 \\right 沒有對應的 \\left。請確認 \\left 和 \\right 都成對出現。',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    '找不到 \\begin{document}。請確認文件中寫了 \\begin{document}，且專案設定中的主文件正確。',
  'You have used \\begin{} without a corresponding \\end{}.':
    '有 \\begin{} 沒有對應的 \\end{}。',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} 個編譯錯誤',
  'Compile log': '編譯記錄檔',
}

export default messages
