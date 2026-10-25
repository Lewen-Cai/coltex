// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
// Chinese (Simplified) messages, keyed by their English text. See lib/i18n.ts.
const messages: Record<string, string> = {
  'Invalid email or password': '邮箱或密码错误',
  'Too many requests. Please try again later.': '尝试次数过多，请稍后再试。',
  'This account has been disabled': '这个账号已被停用',
  'Sign-in failed': '登录失败',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': '密码至少 8 位，并且要包含大写字母、小写字母和数字',
  'Password must be at most 128 characters': '密码最多 128 个字符',
  'Passwords do not match': '两次输入的密码不一致',
  'The current password is wrong': '当前密码不正确',
  'ColTex is already set up': 'ColTex 已经完成初始设置',
  'Setup is already in progress': '初始设置正在进行中',
  'This invite is for a different email address': '这个邀请对应的是另一个邮箱地址',
  'This invite has already been used': '这个邀请已经被使用过了',
  'This invite link is invalid, expired, or already used': '邀请链接无效、已过期或已被使用',
  'An account with this email already exists': '这个邮箱已经注册过账号',
  'This link is invalid, expired, or has been used up': '链接无效、已过期或已用完',
  'This link does not allow creating an account; sign in instead': '这个链接不能用来注册账号，请直接登录',
  'Code from your authenticator app': '验证器应用里的验证码',
  'Recovery code': '恢复码',
  'Don’t ask again on this device for 30 days': '这台设备 30 天内不再询问',
  Verify: '验证',
  Back: '返回',
  'Use a recovery code': '使用恢复码',
  'Use the authenticator app': '使用验证器应用',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': '登录失败次数过多，这个账号已被锁定。请联系系统管理员解锁。',
  'Too many failed sign-ins from this address. Try again later.': '这个地址登录失败次数过多，请稍后再试。',
  'Invalid code': '验证码不正确',
  'Invalid recovery code': '恢复码不正确',
  'This sign-in has expired. Sign in again.': '这次登录已过期，请重新登录。',
  'Too many wrong codes. Try again in 15 minutes.': '错误的验证码过多，请 15 分钟后再试。',
  'The password is wrong': '密码不正确',
  'Too many failed sign-ins. Try again in {n} minute.': '登录失败次数过多，请 {n} 分钟后再试。',
  'Too many failed sign-ins. Try again in {n} minutes.': '登录失败次数过多，请 {n} 分钟后再试。',
}

export default messages
