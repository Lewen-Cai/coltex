// Vietnamese messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'Đã bỏ qua liên kết tượng trưng {name}',
  'Duplicate entry {path}; kept the last one': 'Mục {path} bị trùng; đã giữ mục cuối cùng',

  // History
  'Initial version': 'Phiên bản đầu tiên',
  'Created the project': 'Đã tạo dự án',
  'Imported the project': 'Đã nhập dự án',
  'Converted to a journal template': 'Đã chuyển sang mẫu tạp chí',
  'Copied from another project': 'Sao chép từ một dự án khác',
  'Applied changes from the AI agent': 'Đã áp dụng thay đổi từ tác tử AI',
  'Edited by an AI agent over MCP': 'Được một tác tử AI chỉnh sửa qua MCP',
  'Accepted or rejected tracked changes': 'Đã chấp nhận hoặc từ chối thay đổi được theo dõi',
  'Restored an earlier version': 'Đã khôi phục một phiên bản trước',
  'Deleted user': 'Người dùng đã bị xóa',

  // AI assistant: availability
  'The AI agent is unavailable': 'Tác tử AI không khả dụng',
  'The AI agent is turned off': 'Tác tử AI đã bị tắt',
  "You don't have access to the AI agent": 'Bạn không có quyền dùng tác tử AI',
  'No AI model is available to you': 'Không có mô hình AI nào bạn được dùng',
  'No AI provider is connected yet': 'Chưa kết nối nhà cung cấp AI nào',
  'Auto: {model} for a quick answer': 'Tự động: {model} để trả lời nhanh',
  'Auto: {model} for this task': 'Tự động: {model} cho tác vụ này',
  '{provider} keeps failing; {model} answers this message instead': '{provider} liên tục gặp lỗi; {model} sẽ trả lời tin nhắn này thay thế',
  '{provider} is not signed in': 'Chưa đăng nhập {provider}',

  // AI assistant: session, apply and undo
  'Draft changes discarded': 'Đã bỏ các thay đổi nháp',
  'Stopped; the draft was not applied': 'Đã dừng; bản nháp chưa được áp dụng',
  'Applied changes to {files}; stopped before the build finished.': 'Đã áp dụng thay đổi vào {files}; đã dừng trước khi biên dịch xong.',
  'Applied changes to {files}. Build: {before} → {after} errors.': 'Đã áp dụng thay đổi vào {files}. Biên dịch: {before} → {after} lỗi.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'Đã hoàn tác các thay đổi của tác tử AI, trừ trong {files}, nơi những dòng đó đã được chỉnh sửa sau đó.',
  "Undid the AI agent's changes.": 'Đã hoàn tác các thay đổi của tác tử AI.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'Liệt kê các tệp của dự án',
  'Read compile log': 'Đọc nhật ký biên dịch',
  'Compile with proposed changes': 'Biên dịch với các thay đổi được đề xuất',
  'Read the {name} manual': 'Đọc tài liệu hướng dẫn {name}',
  'Read {name} from TeX Live': 'Đọc {name} từ TeX Live',
  'Read {path} (lines {start}–end)': 'Đọc {path} (dòng {start}–cuối)',
  'Read {path} (lines {start}–{end})': 'Đọc {path} (dòng {start}–{end})',
  'Read {path}': 'Đọc {path}',
  'Search compile log for “{query}”': 'Tìm “{query}” trong nhật ký biên dịch',
  'Search the {name} manual for “{query}”': 'Tìm “{query}” trong tài liệu hướng dẫn {name}',
  'Search for “{query}”': 'Tìm “{query}”',
  'Look up “{query}” in {name}': 'Tra “{query}” trong {name}',
  'Undo draft changes to {path}': 'Hoàn tác thay đổi nháp trong {path}',
  'Edit {path}': 'Sửa {path}',
  'Create {path}': 'Tạo {path}',
  'Delete {path}': 'Xóa {path}',
  'Move {from} to {to}': 'Di chuyển {from} tới {to}',
  'Use skill “{name}”': 'Dùng skill “{name}”',
  'Read {path} of skill “{name}”': 'Đọc {path} của skill “{name}”',
  'Draft skill “{name}”': 'Soạn nháp skill “{name}”',
  // Notes from importing skills
  'Renamed “{from}” to {name}': 'Đã đổi tên “{from}” thành {name}',
  '{name} has no description; used its first line': '{name} không có mô tả; đã dùng dòng đầu tiên của nó',
  '{name}: skipped {path} (not a text file)': '{name}: đã bỏ qua {path} (không phải tệp văn bản)',
  '{name}: skipped {path} (too large)': '{name}: đã bỏ qua {path} (quá lớn)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': 'Khóa API cho {name} (để trống nếu máy chủ không yêu cầu)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'Hoàn tất đăng nhập trong trình duyệt, hoặc dán mã ủy quyền / URL chuyển hướng vào đây:',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'Hoàn tất đăng nhập trong trình duyệt, hoặc dán mã ủy quyền / URL chuyển hướng vào đây:',
  'Complete login in your browser, or paste the final redirect URL here:': 'Hoàn tất đăng nhập trong trình duyệt, hoặc dán URL chuyển hướng cuối cùng vào đây:',
  'Paste the code Anthropic shows after you sign in:': 'Dán mã mà Anthropic hiển thị sau khi bạn đăng nhập:',
  'Exchanging authorization code for tokens...': 'Đang đổi mã ủy quyền lấy token…',
  'Exchanging authorization code for an API key...': 'Đang đổi mã ủy quyền lấy khóa API…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'URL/tên miền GitHub Enterprise (để trống nếu dùng github.com)',
  'Select {name} login method:': 'Chọn phương thức đăng nhập {name}:',
  'Select {name} authentication method:': 'Chọn phương thức xác thực {name}:',
  'Listening for OAuth callback on {url}': 'Đang chờ OAuth callback tại {url}',
  'Sign in to {name}:': 'Đăng nhập vào {name}:',
  'Enter {name}': 'Nhập {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    'Bạn đã đặt ký tự căn cột \'&\' sai chỗ. Nếu muốn căn chỉnh nội dung, bạn phải viết nó bên trong một môi trường căn chỉnh như \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, v.v. Nếu muốn viết ký tự \'&\' trong văn bản, hãy viết \\&.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    'Bạn đã viết quá nhiều ký tự căn cột & trong một bảng, khiến một ký tự bị chuyển thành ngắt dòng. Hãy kiểm tra số cột đã khai báo cho bảng có đúng không.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'Bạn đã quên dấu $ ở cuối chế độ công thức riêng dòng. Ở chế độ này, công thức luôn phải nằm trong $$ … $$. Hãy kiểm tra số dấu $ ở hai bên mỗi công thức có khớp nhau không.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    'Mọi biểu thức và ký hiệu toán học phải được bao bằng các dấu đặc biệt tạo ra “chế độ toán”. Dùng $...$ cho công thức trong dòng, và \\[...\\] hoặc một môi trường toán học (vd. equation) cho công thức riêng dòng. Điều này áp dụng cho các ký hiệu như chỉ số dưới ( _ ), tích phân ( \\int ), chữ cái Hy Lạp ( \\alpha, \\beta, \\delta ) và các dấu bổ nghĩa (\\vec{x}, \\tilde{x}).',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'Bạn đã tham chiếu tới một đối tượng chưa được gắn nhãn. Nếu đã gắn nhãn rồi, hãy chắc chắn rằng nội dung trong \\ref{...} giống hệt nội dung trong \\label{...}.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    'Bạn đã trích dẫn một mục không có trong danh mục tài liệu tham khảo. Hãy chắc chắn rằng trích dẫn (\\cite{...}) có khóa tương ứng trong danh mục tài liệu tham khảo, và cả hai được viết giống nhau.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    'Bạn đã dùng cùng một nhãn nhiều lần. Hãy kiểm tra để mỗi \\label{...} chỉ gắn cho một đối tượng.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    'Tham số vị trí float \'h\' quá khắt khe để LaTeX đặt đối tượng float của bạn một cách hợp lý ở đây. Hãy nới lỏng bằng \'ht\', hoặc thậm chí \'htbp\' nếu cần. Nếu vẫn muốn giữ float ở đúng chỗ này, hãy dùng gói float.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'Bạn đã quên tham số vị trí float, tham số cho LaTeX biết nơi đặt hình. Để sửa, hãy điền tham số vị trí vào trong dấu ngoặc vuông (vd. \\begin{figure}[h]), hoặc bỏ dấu ngoặc vuông (vd. \\begin{figure} ). Tìm hiểu thêm về tham số vị trí float tại đây.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    'Trình biên dịch không hiểu một lệnh bạn đã dùng. Hãy kiểm tra lệnh có được viết đúng chính tả không. Nếu lệnh thuộc về một gói, hãy chắc chắn bạn đã nạp gói đó trong phần mở đầu bằng \\usepackage{...}.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'Có vẻ bạn đang thiếu một gói! Lệnh {command} sẽ không hoạt động nếu bạn không thêm {usage} vào phần mở đầu của tài liệu.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    'Bạn đã tạo một môi trường (bằng \\begin{…} và \\end{…}) không được nhận diện. Hãy chắc chắn bạn đã nạp gói cần thiết cho môi trường đó trong phần mở đầu, và tên môi trường được viết đúng.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'Có vẻ bạn đang thiếu một gói! Môi trường {environment} sẽ không hoạt động nếu bạn không thêm {usage} vào phần mở đầu của tài liệu.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    'Trình biên dịch không tìm thấy tệp bạn muốn chèn. Hãy chắc chắn bạn đã tải tệp lên và ghi đúng đường dẫn tới tệp.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    'Trình biên dịch không nhận ra định dạng của một hình ảnh. Hãy chắc chắn bạn dùng định dạng ảnh mà trình biên dịch đã chọn hỗ trợ, và kiểm tra tên tệp ảnh không chứa dấu chấm (.) thừa.',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'Trình biên dịch không nhận ra tùy chọn float \'H\'. Hãy thêm \\usepackage{float} vào phần mở đầu để khắc phục.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'Bạn đã dùng một tham số vị trí float mà trình biên dịch không hiểu. Bạn có thể tìm hiểu thêm về các tùy chọn float dùng để đặt hình tại đây.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    'Bạn đã dùng một lệnh phông chữ chỉ có trong chế độ toán. Để dùng lệnh này, bạn phải ở trong chế độ toán (vd. $ … $ hoặc \\begin{math} … \\end{math} ). Nếu muốn dùng nó bên ngoài chế độ toán, hãy dùng phiên bản dành cho văn bản: \\textrm, \\textit, v.v.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    'Bạn đã dùng \\begin{...} mà không có \\end{...} tương ứng.',
  'You have used an open bracket without a corresponding close bracket.':
    'Bạn đã dùng dấu ngoặc mở mà không có dấu ngoặc đóng tương ứng.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'Bạn đã dùng trong thân tài liệu một lệnh chỉ nên dùng ở phần mở đầu. Hãy chắc chắn rằng \\documentclass[…]{…} và mọi lệnh \\usepackage{…} được viết trước \\begin{document}.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    'Bạn đã mở đầu một biểu thức bằng lệnh \\left nhưng không có lệnh \\right tương ứng. Hãy chắc chắn các lệnh \\left và \\right luôn đi thành cặp, hoặc thử dùng \\Biggl và \\Biggr như hướng dẫn tại đây.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    'Bạn đã viết sai chỉ số trên kép thành a^b^c, hoặc đã viết dấu phẩy trên (′) kèm chỉ số trên. Hãy nhớ dùng { và } khi có nhiều chỉ số trên. Hãy thử a^{b^c}.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    'Bạn đã viết sai chỉ số dưới kép thành a_b_c. Hãy nhớ dùng { và } khi có nhiều chỉ số dưới. Hãy thử a_{b_c}.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    'Bạn đã dùng lệnh \\maketitle nhưng chưa khai báo \\author. Để sửa, hãy thêm tác giả vào phần mở đầu bằng lệnh \\author{…}.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    'Không tìm thấy mục nào trong một danh sách bạn đã tạo. Hãy chắc chắn mỗi mục được bắt đầu bằng lệnh \\item, và bạn không đặt danh sách bên trong bảng.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    'Bạn đã dùng lệnh \\hline sai chỗ, có lẽ là bên ngoài bảng. Nếu \\hline nằm trong bảng, hãy thử thêm \\\\ trước nó.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'Bạn đã dùng \\\\ hoặc \\newline ở chỗ LaTeX không cho phép. Chỉ nên ngắt dòng sau một khối văn bản, và hãy cẩn thận khi ngắt dòng trong danh sách và các môi trường khác.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    'Bạn đã dùng lệnh \\verb không đúng cách. Hãy thử thay \\verb bằng \\begin{verbatim} … \\end{verbatim}.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    'Bạn đã viết một độ dài nhưng chưa ghi đơn vị phù hợp (pt, mm, cm, v.v.). Nếu bạn không viết độ dài nào, hãy kiểm tra xem có chỗ nào ký tự ngắt dòng \\\\ được theo sau bởi dấu ngoặc vuông […] không.',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    'Bạn đã viết lệnh \\right mà không có lệnh \\left tương ứng. Hãy kiểm tra để mọi lệnh \\left và \\right luôn đi thành cặp.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    'Không tìm thấy lệnh \\begin{document}. Hãy chắc chắn bạn đã viết \\begin{document} trong tài liệu, và tài liệu chính của dự án được đặt đúng.',
  'You have used \\begin{} without a corresponding \\end{}.':
    'Bạn đã dùng \\begin{} mà không có \\end{} tương ứng.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} lỗi biên dịch',
  'Compile log': 'Nhật ký biên dịch',
  'Search the web for “{query}”': 'Tìm trên web “{query}”',
  'Read web page {url}': 'Đọc trang web {url}',
  'Look at page {page} of the PDF': 'Xem trang {page} của PDF',
  'The AI agent stopped at the limit of steps for one message. Send “continue” to let it go on.':
    'Tác tử AI đã dừng vì đạt giới hạn số bước cho một tin nhắn. Gửi “tiếp tục” để nó làm tiếp.',
}

export default messages
