// Japanese messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'シンボリックリンク {name} をスキップしました',
  'Duplicate entry {path}; kept the last one': '{path} が重複しているため、最後のものを残しました',

  // History
  'Initial version': '最初のバージョン',
  'Created the project': 'プロジェクトを作成しました',
  'Imported the project': 'プロジェクトをインポートしました',
  'Converted to a journal template': 'ジャーナルテンプレートに変換しました',
  'Copied from another project': '別のプロジェクトからコピーしました',
  'Applied changes from the AI agent': 'AI エージェントの変更を適用しました',
  'Edited by an AI agent over MCP': 'MCP 経由で AI エージェントが編集しました',
  'Accepted or rejected tracked changes': '変更履歴を承諾または却下しました',
  'Restored an earlier version': '以前のバージョンを復元しました',
  'Deleted user': '削除されたユーザー',

  // AI assistant: availability
  'The AI agent is unavailable': 'AI エージェントは利用できません',
  'The AI agent is turned off': 'AI エージェントはオフになっています',
  "You don't have access to the AI agent": 'AI エージェントを利用する権限がありません',
  'No AI model is available to you': '利用できる AI モデルがありません',
  'No AI provider is connected yet': 'AI プロバイダーがまだ接続されていません',
  'Auto: {model} for a quick answer': '自動：すばやく答えるため {model} を使用',
  'Auto: {model} for this task': '自動：このタスクには {model} を使用',
  '{provider} keeps failing; {model} answers this message instead': '{provider} でエラーが続いているため、このメッセージには {model} が答えます',
  '{provider} is not signed in': '{provider} にログインしていません',

  // AI assistant: session, apply and undo
  'Draft changes discarded': '下書きの変更を破棄しました',
  'Stopped; the draft was not applied': '停止しました。下書きは適用されていません',
  'Applied changes to {files}; stopped before the build finished.': '{files} に変更を適用しました。ビルドの完了前に停止しました。',
  'Applied changes to {files}. Build: {before} → {after} errors.': '{files} に変更を適用しました。ビルドのエラー：{before} → {after} 件。',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'AI エージェントの変更を元に戻しました。ただし、その後同じ行が編集された {files} は除きます。',
  "Undid the AI agent's changes.": 'AI エージェントの変更を元に戻しました。',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'プロジェクトのファイルを一覧表示',
  'Read compile log': 'コンパイルログを読む',
  'Compile with proposed changes': '提案された変更でコンパイル',
  'Read the {name} manual': '{name} のマニュアルを読む',
  'Read {name} from TeX Live': 'TeX Live から {name} を読む',
  'Read {path} (lines {start}–end)': '{path} を読む（{start} 行目から最後まで）',
  'Read {path} (lines {start}–{end})': '{path} を読む（{start}–{end} 行目）',
  'Read {path}': '{path} を読む',
  'Search compile log for “{query}”': 'コンパイルログで「{query}」を検索',
  'Search the {name} manual for “{query}”': '{name} のマニュアルで「{query}」を検索',
  'Search for “{query}”': '「{query}」を検索',
  'Look up “{query}” in {name}': '{name} で「{query}」を調べる',
  'Undo draft changes to {path}': '{path} への下書きの変更を元に戻す',
  'Edit {path}': '{path} を編集',
  'Create {path}': '{path} を作成',
  'Delete {path}': '{path} を削除',
  'Move {from} to {to}': '{from} を {to} に移動',
  'Use skill “{name}”': 'Skill「{name}」を使用',
  'Read {path} of skill “{name}”': 'Skill「{name}」の {path} を読む',
  'Draft skill “{name}”': 'Skill「{name}」の下書きを作成',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '「{from}」の名前を {name} に変更しました',
  '{name} has no description; used its first line': '{name} には説明がないため、最初の行を使用しました',
  '{name}: skipped {path} (not a text file)': '{name}：{path} をスキップしました（テキストファイルではありません）',
  '{name}: skipped {path} (too large)': '{name}：{path} をスキップしました（大きすぎます）',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': '{name} の API キー（サーバーで不要な場合は空欄のまま）',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'ブラウザでログインを完了するか、認可コードまたはリダイレクト URL をここに貼り付けてください：',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'ブラウザでログインを完了するか、認可コードまたはリダイレクト URL をここに貼り付けてください：',
  'Complete login in your browser, or paste the final redirect URL here:': 'ブラウザでログインを完了するか、最終的なリダイレクト URL をここに貼り付けてください：',
  'Paste the code Anthropic shows after you sign in:': 'ログイン後に Anthropic が表示するコードを貼り付けてください：',
  'Exchanging authorization code for tokens...': '認可コードをトークンと交換しています…',
  'Exchanging authorization code for an API key...': '認可コードを API キーと交換しています…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'GitHub Enterprise の URL またはドメイン（github.com の場合は空欄）',
  'Select {name} login method:': '{name} のログイン方法を選択してください：',
  'Select {name} authentication method:': '{name} の認証方法を選択してください：',
  'Listening for OAuth callback on {url}': '{url} で OAuth コールバックを待機しています',
  'Sign in to {name}:': '{name} にログイン：',
  'Enter {name}': '{name} を入力',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    '整列用のタブ文字「&」が正しくない位置にあります。何かを揃えたい場合は、\\begin{align} … \\end{align} や \\begin{tabular} … \\end{tabular} などの整列環境の中に書く必要があります。本文中にアンパサンド「&」を書きたい場合は、代わりに \\& と書いてください。',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    '表の中の整列用タブ（&）が多すぎるため、そのうちの 1 つが改行として扱われました。表の列数が正しく指定されているか確認してください。',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'ディスプレイ数式モードの最後の $ 記号が抜けています。ディスプレイ数式は必ず $$ … $$ の中に書いてください。各数式の前後で $ の数が一致しているか確認してください。',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    '数式や数学記号はすべて特別な記号で囲む必要があります。これにより「数式モード」になります。インライン数式には $...$ を、ディスプレイ数式には \\[...\\] または数式環境（equation など）を使ってください。下付き文字（ _ ）、積分（ \\int ）、ギリシャ文字（ \\alpha、\\beta、\\delta ）、修飾子（\\vec{x}、\\tilde{x}）などの記号も同様です。',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'まだラベルが付けられていないものを参照しています。すでにラベルを付けている場合は、\\ref{...} の中身が \\label{...} の中身と同じか確認してください。',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    '参考文献に含まれていないものを引用しています。引用（\\cite{...}）に対応するキーが参考文献にあり、両者の綴りが同じか確認してください。',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    '同じラベルが複数回使われています。各 \\label{...} が 1 つの項目だけに付けられているか確認してください。',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    'フロート配置指定子「h」は制約が厳しすぎて、LaTeX がここにフロートをうまく配置できません。「ht」や、必要なら「htbp」に緩めてみてください。どうしてもこの位置に置きたい場合は、float パッケージを確認してください。',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    '図の配置場所を LaTeX に伝えるフロート配置指定子が抜けています。角括弧の中に配置指定子を入れる（例：\\begin{figure}[h]）か、角括弧を削除して（例：\\begin{figure} ）ください。配置指定子について詳しくはこちらをご覧ください。',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    '使用したコマンドをコンパイラが認識できません。コマンドの綴りが正しいか確認してください。パッケージのコマンドの場合は、プリアンブルで \\usepackage{...} を使ってそのパッケージを読み込んでいるか確認してください。',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'パッケージが不足しているようです。文書のプリアンブルに {usage} を追加しないと、{command} コマンドは動作しません。',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    '認識されない環境（\\begin{…} と \\end{…} コマンド）を使用しています。その環境に必要なパッケージをプリアンブルで読み込んでいるか、環境名の綴りが正しいか確認してください。',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'パッケージが不足しているようです。文書のプリアンブルに {usage} を追加しないと、{environment} 環境は動作しません。',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    '読み込もうとしているファイルがコンパイラで見つかりません。ファイルがアップロードされていて、場所が正しく指定されているか確認してください。',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    '画像のいずれかのファイル形式をコンパイラが認識できません。選択したコンパイラが対応している画像形式を使っているか、画像のファイル名に余分なピリオド（.）がないか確認してください。',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'コンパイラがフロートオプション「H」を認識できません。プリアンブルに \\usepackage{float} を追加すると解決します。',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'コンパイラが理解できないフロート配置指定子を使用しています。図の配置に使えるフロートオプションについて詳しくはこちらをご覧ください。',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    '数式モードでのみ使えるフォントコマンドを使用しています。このコマンドは数式モード（例：$ … $ や \\begin{math} … \\end{math} ）の中で使う必要があります。数式モードの外で使いたい場合は、代わりに \\textrm、\\textit などのテキスト用コマンドを使ってください。',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    '\\begin{...} に対応する \\end{...} がありません。',
  'You have used an open bracket without a corresponding close bracket.':
    '開き括弧に対応する閉じ括弧がありません。',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'プリアンブルで使うべきコマンドを本文中で使用しています。\\documentclass[…]{…} とすべての \\usepackage{…} コマンドが \\begin{document} より前に書かれているか確認してください。',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    '式を \\left コマンドで始めていますが、対応する \\right コマンドがありません。\\left と \\right がすべての箇所で対になっているか確認するか、こちらに示すように代わりに \\Biggl と \\Biggr コマンドを使ってみてください。',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    '二重の上付き文字を a^b^c と誤って書いているか、プライムに上付き文字を付けています。上付き文字を重ねるときは { と } で囲んでください。代わりに a^{b^c} と書いてみてください。',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    '二重の下付き文字を a_b_c と誤って書いています。下付き文字を重ねるときは { と } で囲んでください。代わりに a_{b_c} と書いてみてください。',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    '\\maketitle コマンドを使用していますが、\\author が指定されていません。プリアンブルで \\author{…} コマンドを使って著者を指定してください。',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    '作成したリストに項目がありません。リストの各項目に \\item コマンドを付けているか、表の中でリストを使っていないか確認してください。',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    '\\hline コマンドが正しくない位置（おそらく表の外）で使われています。\\hline が表の中にある場合は、その前に \\\\ を入れてみてください。',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'LaTeX が想定していない位置で \\\\ または \\newline コマンドを使用しています。改行はテキストのまとまりの後でのみ使い、リストなどの環境の中で改行を使うときは注意してください。',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    '\\verb コマンドの使い方が正しくありません。\\verb コマンドを \\begin{verbatim} … \\end{verbatim} に置き換えてみてください。',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    '長さを書いていますが、適切な単位（pt、mm、cm など）が指定されていません。長さを書いていない場合は、改行 \\\\ の直後に角括弧 […] が続いている箇所がないか確認してください。',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    '対応する \\left コマンドのない \\right コマンドがあります。\\left と \\right がすべての箇所で対になっているか確認してください。',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    '\\begin{document} コマンドが見つかりません。\\begin{document} を書いているか、メイン文書が正しく設定されているか確認してください。',
  'You have used \\begin{} without a corresponding \\end{}.':
    '\\begin{} に対応する \\end{} がありません。',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} 件のコンパイルエラー',
  'Compile log': 'コンパイルログ',
  'Search the web for “{query}”': 'ウェブで「{query}」を検索',
  'Read web page {url}': 'ウェブページ {url} を読む',
  'Look at page {page} of the PDF': 'PDF の {page} ページを見る',
}

export default messages
