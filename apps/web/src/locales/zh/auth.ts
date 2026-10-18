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
}

export default messages
