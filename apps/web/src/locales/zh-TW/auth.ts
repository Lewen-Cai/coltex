// Chinese (Traditional) messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': '電子郵件或密碼錯誤',
  'Too many requests. Please try again later.': '嘗試次數過多，請稍後再試。',
  'This account has been disabled': '這個帳號已被停用',
  'Sign-in failed': '登入失敗',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': '密碼至少需要 8 個字元，且須包含大寫字母、小寫字母和數字',
  'Password must be at most 128 characters': '密碼最多 128 個字元',
  'Passwords do not match': '兩次輸入的密碼不一致',
  'The current password is wrong': '目前的密碼不正確',
  'ColTex is already set up': 'ColTex 已完成初始設定',
  'Setup is already in progress': '初始設定正在進行中',
  'This invite is for a different email address': '這個邀請對應的是另一個電子郵件地址',
  'This invite has already been used': '這個邀請已經使用過了',
  'This invite link is invalid, expired, or already used': '邀請連結無效、已過期或已被使用',
  'An account with this email already exists': '這個電子郵件已經註冊過帳號',
  'This link is invalid, expired, or has been used up': '連結無效、已過期或已用完',
  'This link does not allow creating an account; sign in instead': '這個連結無法用來註冊帳號，請直接登入',
}

export default messages
