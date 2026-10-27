// Chinese (Simplified) messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': '已跳过符号链接 {name}',
  'Duplicate entry {path}; kept the last one': '条目 {path} 重复，已保留最后一个',

  // History
  'Initial version': '初始版本',
  'Created the project': '创建了项目',
  'Imported the project': '导入了项目',
  'Converted to a journal template': '转换为期刊模板',
  'Copied from another project': '从其他项目复制而来',
  'Applied changes from the AI agent': '应用了 AI 智能体的修改',
  'Edited by an AI agent over MCP': 'AI 智能体通过 MCP 修改',
  'Accepted or rejected tracked changes': '接受或拒绝了修订',
  'Restored an earlier version': '恢复了早期版本',
  'Deleted user': '已删除的用户',

  // AI assistant: availability
  'The AI agent is unavailable': 'AI 智能体不可用',
  'The AI agent is turned off': 'AI 智能体已停用',
  "You don't have access to the AI agent": '你没有使用 AI 智能体的权限',
  'No AI model is available to you': '没有你可以使用的 AI 模型',
  'No AI provider is connected yet': '尚未接入任何 AI 服务',
  'Auto: {model} for a quick answer': '自动：本条消息用 {model} 快速回答',
  'Auto: {model} for this task': '自动：本条消息用 {model} 处理',
  '{provider} keeps failing; {model} answers this message instead': '{provider} 持续出错，本条消息改由 {model} 回答',
  '{provider} is not signed in': '{provider} 尚未登录',

  // AI assistant: session, apply and undo
  'Draft changes discarded': '已放弃草稿修改',
  'Stopped; the draft was not applied': '已停止，草稿没有应用',
  'Applied changes to {files}; stopped before the build finished.': '已将修改应用到 {files}；编译完成前已停止。',
  'Applied changes to {files}. Build: {before} → {after} errors.': '已将修改应用到 {files}。编译错误：{before} → {after} 个。',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    '已撤销 AI 智能体的修改，但 {files} 中的相同行此后已被修改，未撤销。',
  "Undid the AI agent's changes.": '已撤销 AI 智能体的修改。',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': '列出项目文件',
  'Read compile log': '读取编译日志',
  'Compile with proposed changes': '使用拟议的修改编译',
  'Read the {name} manual': '阅读 {name} 手册',
  'Read {name} from TeX Live': '从 TeX Live 读取 {name}',
  'Read {path} (lines {start}–end)': '读取 {path}（第 {start} 行至末尾）',
  'Read {path} (lines {start}–{end})': '读取 {path}（第 {start}–{end} 行）',
  'Read {path}': '读取 {path}',
  'Search compile log for “{query}”': '在编译日志中搜索“{query}”',
  'Search the {name} manual for “{query}”': '在 {name} 手册中搜索“{query}”',
  'Search for “{query}”': '搜索“{query}”',
  'Look up “{query}” in {name}': '在 {name} 中查找“{query}”',
  'Undo draft changes to {path}': '撤销对 {path} 的草稿修改',
  'Edit {path}': '编辑 {path}',
  'Create {path}': '创建 {path}',
  'Delete {path}': '删除 {path}',
  'Move {from} to {to}': '把 {from} 移动到 {to}',
  'Use skill “{name}”': '使用 Skill“{name}”',
  'Read {path} of skill “{name}”': '读取 Skill“{name}”的 {path}',
  'Draft skill “{name}”': '起草 Skill“{name}”',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '已将“{from}”改名为 {name}',
  '{name} has no description; used its first line': '{name} 没有描述，已用它的第一行代替',
  '{name}: skipped {path} (not a text file)': '{name}：已跳过 {path}（不是文本文件）',
  '{name}: skipped {path} (too large)': '{name}：已跳过 {path}（太大）',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': '{name} 的 API 密钥（如果服务器不需要，可留空）',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    '请在浏览器中完成登录，或在此粘贴授权码或重定向 URL：',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    '请在浏览器中完成登录，或在此粘贴授权码或重定向 URL：',
  'Complete login in your browser, or paste the final redirect URL here:': '请在浏览器中完成登录，或在此粘贴最终的重定向 URL：',
  'Paste the code Anthropic shows after you sign in:': '粘贴登录后 Anthropic 显示的代码：',
  'Exchanging authorization code for tokens...': '正在用授权码换取令牌…',
  'Exchanging authorization code for an API key...': '正在用授权码换取 API 密钥…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'GitHub Enterprise 的 URL 或域名（使用 github.com 请留空）',
  'Select {name} login method:': '选择 {name} 的登录方式：',
  'Select {name} authentication method:': '选择 {name} 的认证方式：',
  'Listening for OAuth callback on {url}': '正在 {url} 等待 OAuth 回调',
  'Sign in to {name}:': '登录 {name}：',
  'Enter {name}': '输入 {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    '对齐符号 \'&\' 用错了地方。需要对齐的内容必须写在对齐环境里，例如 \\begin{align} … \\end{align}、\\begin{tabular} … \\end{tabular} 等。如果想在正文里写 \'&\' 这个字符，请写成 \\&。',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    '表格某一行里的对齐符号 & 太多了，多出的一个被当成了换行。请检查表格声明的列数是否正确。',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    '行间公式结尾少了 $ 符号。行间公式必须写在 $$ … $$ 之间，请检查每个公式两边的 $ 数量是否一致。',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    '数学表达式和符号必须放在数学模式里：行内公式用 $...$，行间公式用 \\[...\\] 或数学环境（如 equation）。下标（ _ ）、积分（ \\int ）、希腊字母（ \\alpha、\\beta、\\delta ）以及 \\vec{x}、\\tilde{x} 这类修饰符都需要这样。',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    '引用了一个还没有设置标签的对象。如果已经设置过标签，请确认 \\ref{...} 里写的和 \\label{...} 里写的完全一致。',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    '引用了参考文献库里没有的条目。请确认 \\cite{...} 里的键在参考文献中存在，并且两处拼写一致。',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    '同一个标签用了不止一次。请确认每个 \\label{...} 只对应一个对象。',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    '浮动体位置参数 \'h\' 要求太严格，LaTeX 无法在这里妥善放置。可以放宽为 \'ht\'，必要时用 \'htbp\'。如果一定要放在这里，可以使用 float 宏包。',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    '方括号里缺少浮动体位置参数（它告诉 LaTeX 图表放在哪里）。可以在方括号里填上位置参数（如 \\begin{figure}[h]），或者去掉方括号（如 \\begin{figure} ）。点“了解更多”可查看位置参数的说明。',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    '编译器无法识别你使用的某个命令。请检查命令拼写是否正确；如果它来自某个宏包，请确认已在导言区用 \\usepackage{...} 加载该宏包。',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    '可能缺少宏包：需要在导言区加入 {usage}，{command} 命令才能使用。',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    '使用了一个无法识别的环境（\\begin{…} 和 \\end{…}）。请确认已在导言区加载该环境所需的宏包，并且环境名拼写正确。',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    '可能缺少宏包：需要在导言区加入 {usage}，{environment} 环境才能使用。',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    '编译器找不到要引入的文件。请确认文件已上传，并且路径写得正确。',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    '编译器无法识别某张图片的文件类型。请确认图片格式受当前编译器支持，并检查图片文件名里没有多余的句点（.）。',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    '编译器无法识别浮动体位置参数 \'H\'。在导言区加入 \\usepackage{float} 即可。',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    '使用了编译器无法识别的浮动体位置参数。点“了解更多”可查看可用的位置参数。',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    '使用了只能在数学模式中使用的字体命令。这个命令必须写在数学模式里（如 $ … $ 或 \\begin{math} … \\end{math} ）。如果要在正文中使用，请改用对应的文本命令，如 \\textrm、\\textit 等。',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    '有 \\begin{...} 没有对应的 \\end{...}。',
  'You have used an open bracket without a corresponding close bracket.':
    '有左括号没有对应的右括号。',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    '在正文中使用了只能放在导言区的命令。请确认 \\documentclass[…]{…} 和所有 \\usepackage{…} 都写在 \\begin{document} 之前。',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    '表达式用 \\left 开头，但没有对应的 \\right。请确认 \\left 和 \\right 成对出现，或者改用 \\Biggl 和 \\Biggr（见“了解更多”）。',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    '双重上标写成了 a^b^c，或者在撇号（′）后面又加了上标。多重上标要用 { 和 } 分组，例如 a^{b^c}。',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    '双重下标写成了 a_b_c。多重下标要用 { 和 } 分组，例如 a_{b_c}。',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    '使用了 \\maketitle，但没有设置 \\author。请在导言区用 \\author{…} 写上作者。',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    '列表里没有任何条目。请确认每个条目都用 \\item 开头，并且没有把列表放在表格里。',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    '\\hline 用错了地方，可能是写在了表格外面。如果它在表格里，请在它前面加上 \\\\。',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    '在 LaTeX 不允许换行的地方用了 \\\\ 或 \\newline。换行只能放在一段文字之后，在列表等环境里使用时要特别注意。',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    '\\verb 命令用法有误（不能跨行）。可以改用 \\begin{verbatim} … \\end{verbatim}。',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    '写了一个长度但没有单位（pt、mm、cm 等）。如果你并没有写长度，请检查是否有换行符 \\\\ 后面紧跟着方括号 […]。',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    '有 \\right 没有对应的 \\left。请确认 \\left 和 \\right 都成对出现。',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    '没有找到 \\begin{document}。请确认文档里写了 \\begin{document}，并且项目设置里的主文档是正确的。',
  'You have used \\begin{} without a corresponding \\end{}.':
    '有 \\begin{} 没有对应的 \\end{}。',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} 个编译错误',
  'Compile log': '编译日志',
  'Search the web for “{query}”': '联网搜索“{query}”',
  'Read web page {url}': '读取网页 {url}',
  'Look at page {page} of the PDF': '查看 PDF 第 {page} 页',
  'The AI agent stopped at the limit of steps for one message. Send “continue” to let it go on.':
    'AI 智能体已达到单条消息的步骤上限，暂时停下。发送“继续”可以让它接着做。',
}

export default messages
