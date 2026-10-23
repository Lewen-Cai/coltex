// Japanese messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'メールアドレスまたはパスワードが正しくありません',
  'Too many requests. Please try again later.': 'リクエストが多すぎます。しばらくしてからもう一度お試しください。',
  'This account has been disabled': 'このアカウントは無効化されています',
  'Sign-in failed': 'ログインに失敗しました',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'パスワードは 8 文字以上で、大文字・小文字・数字をそれぞれ含める必要があります',
  'Password must be at most 128 characters': 'パスワードは 128 文字以内にしてください',
  'Passwords do not match': 'パスワードが一致しません',
  'The current password is wrong': '現在のパスワードが正しくありません',
  'ColTex is already set up': 'ColTex はすでにセットアップされています',
  'Setup is already in progress': 'セットアップはすでに進行中です',
  'This invite is for a different email address': 'この招待は別のメールアドレス宛てです',
  'This invite has already been used': 'この招待はすでに使用されています',
  'This invite link is invalid, expired, or already used': 'この招待リンクは無効、期限切れ、または使用済みです',
  'An account with this email already exists': 'このメールアドレスのアカウントはすでに存在します',
  'This link is invalid, expired, or has been used up': 'このリンクは無効、期限切れ、または使用回数の上限に達しています',
  'This link does not allow creating an account; sign in instead': 'このリンクではアカウントを作成できません。ログインしてください',
}

export default messages
