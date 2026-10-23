// Korean messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': '이메일 또는 비밀번호가 올바르지 않습니다',
  'Too many requests. Please try again later.': '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
  'This account has been disabled': '이 계정은 비활성화되었습니다',
  'Sign-in failed': '로그인하지 못했습니다',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': '비밀번호는 8자 이상이어야 하며 대문자, 소문자, 숫자를 포함해야 합니다',
  'Password must be at most 128 characters': '비밀번호는 128자 이하여야 합니다',
  'Passwords do not match': '비밀번호가 일치하지 않습니다',
  'The current password is wrong': '현재 비밀번호가 올바르지 않습니다',
  'ColTex is already set up': 'ColTex 초기 설정이 이미 완료되었습니다',
  'Setup is already in progress': '초기 설정이 이미 진행 중입니다',
  'This invite is for a different email address': '이 초대는 다른 이메일 주소용입니다',
  'This invite has already been used': '이 초대는 이미 사용되었습니다',
  'This invite link is invalid, expired, or already used': '초대 링크가 유효하지 않거나 만료되었거나 이미 사용되었습니다',
  'An account with this email already exists': '이 이메일로 가입된 계정이 이미 있습니다',
  'This link is invalid, expired, or has been used up': '링크가 유효하지 않거나 만료되었거나 사용 횟수를 모두 소진했습니다',
  'This link does not allow creating an account; sign in instead': '이 링크로는 계정을 만들 수 없습니다. 로그인하세요',
}

export default messages
