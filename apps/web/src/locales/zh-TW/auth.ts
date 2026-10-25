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
  'Code from your authenticator app': '驗證器應用程式中的驗證碼',
  'Recovery code': '復原碼',
  'Don’t ask again on this device for 30 days': '這台裝置 30 天內不再詢問',
  Verify: '驗證',
  Back: '返回',
  'Use a recovery code': '使用復原碼',
  'Use the authenticator app': '使用驗證器應用程式',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': '登入失敗次數過多，此帳號已被鎖定。請聯絡系統管理員解鎖。',
  'Too many failed sign-ins from this address. Try again later.': '此位址登入失敗次數過多，請稍後再試。',
  'Invalid code': '驗證碼不正確',
  'Invalid recovery code': '復原碼不正確',
  'This sign-in has expired. Sign in again.': '此次登入已過期，請重新登入。',
  'Too many wrong codes. Try again in 15 minutes.': '錯誤的驗證碼過多，請 15 分鐘後再試。',
  'The password is wrong': '密碼不正確',
  'Too many failed sign-ins. Try again in {n} minute.': '登入失敗次數過多，請 {n} 分鐘後再試。',
  'Too many failed sign-ins. Try again in {n} minutes.': '登入失敗次數過多，請 {n} 分鐘後再試。',
}

export default messages
