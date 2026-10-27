// Korean messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': '심볼릭 링크 {name}을(를) 건너뛰었습니다',
  'Duplicate entry {path}; kept the last one': '{path} 항목이 중복되어 마지막 항목을 유지했습니다',

  // History
  'Initial version': '최초 버전',
  'Created the project': '프로젝트 생성',
  'Imported the project': '프로젝트 가져오기',
  'Converted to a journal template': '저널 템플릿으로 변환',
  'Copied from another project': '다른 프로젝트에서 복사',
  'Applied changes from the AI agent': 'AI 에이전트의 변경 내용 적용',
  'Edited by an AI agent over MCP': 'MCP를 통해 AI 에이전트가 편집',
  'Accepted or rejected tracked changes': '추적된 변경 내용 수락 또는 거부',
  'Restored an earlier version': '이전 버전 복원',
  'Deleted user': '삭제된 사용자',

  // AI assistant: availability
  'The AI agent is unavailable': 'AI 에이전트를 사용할 수 없습니다',
  'The AI agent is turned off': 'AI 에이전트가 꺼져 있습니다',
  "You don't have access to the AI agent": 'AI 에이전트를 사용할 권한이 없습니다',
  'No AI model is available to you': '사용할 수 있는 AI 모델이 없습니다',
  'No AI provider is connected yet': '아직 연결된 AI 제공업체가 없습니다',
  'Auto: {model} for a quick answer': '자동: 빠른 답변을 위해 {model} 사용',
  'Auto: {model} for this task': '자동: 이 작업에 {model} 사용',
  '{provider} keeps failing; {model} answers this message instead': '{provider}에서 오류가 계속되어 이 메시지는 {model}이(가) 대신 답변합니다',
  '{provider} is not signed in': '{provider}에 로그인되어 있지 않습니다',

  // AI assistant: session, apply and undo
  'Draft changes discarded': '초안 변경 내용을 버렸습니다',
  'Stopped; the draft was not applied': '중지했습니다. 초안은 적용되지 않았습니다',
  'Applied changes to {files}; stopped before the build finished.': '{files}에 변경 내용을 적용했습니다. 빌드가 끝나기 전에 중지했습니다.',
  'Applied changes to {files}. Build: {before} → {after} errors.': '{files}에 변경 내용을 적용했습니다. 빌드 오류: {before} → {after}개.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'AI 에이전트의 변경 내용을 실행 취소했습니다. 단, 이후 같은 줄이 편집된 {files}은(는) 제외했습니다.',
  "Undid the AI agent's changes.": 'AI 에이전트의 변경 내용을 실행 취소했습니다.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': '프로젝트 파일 목록 보기',
  'Read compile log': '컴파일 로그 읽기',
  'Compile with proposed changes': '제안된 변경 내용으로 컴파일',
  'Read the {name} manual': '{name} 매뉴얼 읽기',
  'Read {name} from TeX Live': 'TeX Live에서 {name} 읽기',
  'Read {path} (lines {start}–end)': '{path} 읽기({start}행부터 끝까지)',
  'Read {path} (lines {start}–{end})': '{path} 읽기({start}–{end}행)',
  'Read {path}': '{path} 읽기',
  'Search compile log for “{query}”': '컴파일 로그에서 “{query}” 검색',
  'Search the {name} manual for “{query}”': '{name} 매뉴얼에서 “{query}” 검색',
  'Search for “{query}”': '“{query}” 검색',
  'Look up “{query}” in {name}': '{name}에서 “{query}” 찾기',
  'Undo draft changes to {path}': '{path}의 초안 변경 내용 실행 취소',
  'Edit {path}': '{path} 편집',
  'Create {path}': '{path} 만들기',
  'Delete {path}': '{path} 삭제',
  'Move {from} to {to}': '{from}을(를) {to}(으)로 이동',
  'Use skill “{name}”': '“{name}” Skill 사용',
  'Read {path} of skill “{name}”': '“{name}” Skill의 {path} 읽기',
  'Draft skill “{name}”': '“{name}” Skill 초안 작성',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '“{from}”의 이름을 {name}(으)로 바꿨습니다',
  '{name} has no description; used its first line': '{name}에 설명이 없어 첫 줄을 설명으로 사용했습니다',
  '{name}: skipped {path} (not a text file)': '{name}: {path}을(를) 건너뛰었습니다(텍스트 파일 아님)',
  '{name}: skipped {path} (too large)': '{name}: {path}을(를) 건너뛰었습니다(너무 큼)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': '{name}의 API 키(서버에 키가 필요 없으면 비워 두세요)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    '브라우저에서 로그인을 완료하거나, 여기에 인증 코드 또는 리디렉션 URL을 붙여넣으세요:',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    '브라우저에서 로그인을 완료하거나, 여기에 인증 코드 또는 리디렉션 URL을 붙여넣으세요:',
  'Complete login in your browser, or paste the final redirect URL here:': '브라우저에서 로그인을 완료하거나, 여기에 최종 리디렉션 URL을 붙여넣으세요:',
  'Paste the code Anthropic shows after you sign in:': '로그인 후 Anthropic이 보여 주는 코드를 붙여넣으세요:',
  'Exchanging authorization code for tokens...': '인증 코드를 토큰으로 교환하는 중…',
  'Exchanging authorization code for an API key...': '인증 코드를 API 키로 교환하는 중…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'GitHub Enterprise URL 또는 도메인(github.com이면 비워 두세요)',
  'Select {name} login method:': '{name} 로그인 방법을 선택하세요:',
  'Select {name} authentication method:': '{name} 인증 방법을 선택하세요:',
  'Listening for OAuth callback on {url}': '{url}에서 OAuth 콜백을 기다리는 중',
  'Sign in to {name}:': '{name}에 로그인:',
  'Enter {name}': '{name} 입력',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    '정렬 탭 문자 \'&\'를 잘못된 위치에 사용했습니다. 무언가를 정렬하려면 \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular} 같은 정렬 환경 안에 작성해야 합니다. 본문에 앰퍼샌드 \'&\'를 쓰려면 \\&로 작성하세요.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    '표의 한 행에 정렬 탭(&)이 너무 많아 그중 하나가 줄 바꿈으로 처리되었습니다. 표에 지정한 열 수가 올바른지 확인하세요.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    '디스플레이 수식 모드 끝에 $ 기호가 빠졌습니다. 디스플레이 수식은 항상 $$ … $$ 안에 작성해야 합니다. 각 수식 양쪽의 $ 개수가 맞는지 확인하세요.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    '모든 수식과 수학 기호는 ‘수식 모드’를 만드는 특수 표시로 감싸야 합니다. 인라인 수식에는 $...$를, 디스플레이 수식에는 \\[...\\] 또는 수식 환경(예: equation)을 사용하세요. 아래 첨자( _ ), 적분( \\int ), 그리스 문자( \\alpha, \\beta, \\delta ), 수식 꾸밈(\\vec{x}, \\tilde{x}) 같은 기호에도 적용됩니다.',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    '아직 레이블이 지정되지 않은 대상을 참조했습니다. 이미 레이블을 지정했다면 \\ref{...} 안의 내용이 \\label{...} 안의 내용과 같은지 확인하세요.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    '참고문헌에 없는 항목을 인용했습니다. 인용(\\cite{...})의 키가 참고문헌에 있는지, 두 곳의 철자가 같은지 확인하세요.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    '같은 레이블을 두 번 이상 사용했습니다. 각 \\label{...}이 하나의 대상에만 붙어 있는지 확인하세요.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    '플로트 위치 지정자 \'h\'는 너무 엄격해서 LaTeX가 이 위치에 플로트를 적절히 배치할 수 없습니다. \'ht\'나, 필요하면 \'htbp\'로 완화해 보세요. 그래도 이 위치에 두려면 float 패키지를 참고하세요.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'LaTeX에 그림의 위치를 알려 주는 플로트 위치 지정자가 빠졌습니다. 대괄호 안에 위치 지정자를 넣거나(예: \\begin{figure}[h]) 대괄호를 지우세요(예: \\begin{figure} ). 위치 지정자에 대한 자세한 내용은 여기를 참고하세요.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    '컴파일러가 사용한 명령을 인식하지 못합니다. 명령의 철자가 올바른지 확인하세요. 패키지에 포함된 명령이라면 프리앰블에서 \\usepackage{...}로 해당 패키지를 불러왔는지 확인하세요.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    '패키지가 빠진 것 같습니다! 문서 프리앰블에 {usage}를 추가해야 {command} 명령이 작동합니다.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    '인식되지 않는 환경을 만들었습니다(\\begin{…}와 \\end{…} 명령 사용). 프리앰블에 해당 환경에 필요한 패키지를 불러왔는지, 환경 이름의 철자가 올바른지 확인하세요.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    '패키지가 빠진 것 같습니다! 문서 프리앰블에 {usage}를 추가해야 {environment} 환경이 작동합니다.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    '컴파일러가 포함하려는 파일을 찾을 수 없습니다. 파일을 업로드했는지, 파일 위치를 올바르게 지정했는지 확인하세요.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    '컴파일러가 이미지 중 하나의 파일 형식을 인식하지 못합니다. 선택한 컴파일러가 지원하는 이미지 형식인지, 이미지 파일 이름에 마침표(.)가 들어 있지 않은지 확인하세요.',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    '컴파일러가 플로트 옵션 \'H\'를 인식하지 못합니다. 프리앰블에 \\usepackage{float}를 추가하면 해결됩니다.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    '컴파일러가 이해하지 못하는 플로트 위치 지정자를 사용했습니다. 그림 배치에 쓸 수 있는 플로트 옵션에 대한 자세한 내용은 여기를 참고하세요.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    '수식 모드에서만 쓸 수 있는 글꼴 명령을 사용했습니다. 이 명령은 수식 모드 안에서 사용해야 합니다(예: $ … $ 또는 \\begin{math} … \\end{math} ). 수식 모드 밖에서 사용하려면 \\textrm, \\textit 같은 텍스트용 명령을 사용하세요.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    '\\begin{...}에 대응하는 \\end{...}이 없습니다.',
  'You have used an open bracket without a corresponding close bracket.':
    '여는 괄호에 대응하는 닫는 괄호가 없습니다.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    '프리앰블에서 사용해야 하는 명령을 문서 본문에서 사용했습니다. \\documentclass[…]{…}와 모든 \\usepackage{…} 명령이 \\begin{document} 앞에 있는지 확인하세요.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    '수식을 \\left 명령으로 시작했지만 대응하는 \\right 명령이 없습니다. \\left와 \\right가 모든 곳에서 짝을 이루는지 확인하거나, 여기에 나온 것처럼 \\Biggl과 \\Biggr 명령을 대신 사용해 보세요.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    '이중 위 첨자를 a^b^c처럼 잘못 썼거나, 프라임(′) 뒤에 위 첨자를 썼습니다. 위 첨자를 여러 개 쓸 때는 { 와 }로 묶어야 합니다. a^{b^c}처럼 써 보세요.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    '이중 아래 첨자를 a_b_c처럼 잘못 썼습니다. 아래 첨자를 여러 개 쓸 때는 { 와 }로 묶어야 합니다. a_{b_c}처럼 써 보세요.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    '\\maketitle 명령을 사용했지만 \\author를 지정하지 않았습니다. 프리앰블에서 \\author{…} 명령으로 저자를 추가하세요.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    '만든 목록에 항목이 없습니다. 목록 항목을 \\item 명령으로 시작했는지, 표 안에서 목록을 사용하지 않았는지 확인하세요.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    '\\hline 명령을 잘못된 위치(아마도 표 바깥)에서 사용했습니다. \\hline이 표 안에 있다면 그 앞에 \\\\를 넣어 보세요.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'LaTeX가 예상하지 않은 위치에 \\\\ 또는 \\newline 명령을 사용했습니다. 줄 바꿈은 텍스트 블록 뒤에만 사용하고, 목록 등의 환경 안에서 줄 바꿈을 쓸 때는 주의하세요.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    '\\verb 명령을 잘못 사용했습니다(여러 줄에 걸칠 수 없음). \\verb 명령을 \\begin{verbatim} … \\end{verbatim}으로 바꿔 보세요.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    '길이를 썼지만 단위(pt, mm, cm 등)를 지정하지 않았습니다. 길이를 쓴 적이 없다면 줄 바꿈 \\\\ 바로 뒤에 대괄호 […]가 오는 곳이 없는지 확인하세요.',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    '\\right 명령에 대응하는 \\left 명령이 없습니다. 모든 \\left와 \\right 명령이 짝을 이루는지 확인하세요.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    '\\begin{document} 명령을 찾을 수 없습니다. 문서에 \\begin{document}을 넣었는지, 프로젝트의 기본 문서가 올바르게 설정되어 있는지 확인하세요.',
  'You have used \\begin{} without a corresponding \\end{}.':
    '\\begin{}에 대응하는 \\end{}이 없습니다.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '컴파일 오류 {n}개',
  'Compile log': '컴파일 로그',
  'Search the web for “{query}”': '웹에서 “{query}” 검색',
  'Read web page {url}': '웹 페이지 {url} 읽기',
  'Look at page {page} of the PDF': 'PDF {page}쪽 보기',
}

export default messages
