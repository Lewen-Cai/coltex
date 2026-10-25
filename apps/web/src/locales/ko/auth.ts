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
  'Code from your authenticator app': '인증 앱의 코드',
  'Recovery code': '복구 코드',
  'Don’t ask again on this device for 30 days': '이 기기에서 30일 동안 다시 묻지 않기',
  Verify: '확인',
  Back: '뒤로',
  'Use a recovery code': '복구 코드 사용',
  'Use the authenticator app': '인증 앱 사용',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': '로그인 실패가 너무 많아 이 계정이 잠겼습니다. 시스템 관리자에게 잠금 해제를 요청하세요.',
  'Too many failed sign-ins from this address. Try again later.': '이 주소에서 로그인 실패가 너무 많습니다. 나중에 다시 시도하세요.',
  'Invalid code': '코드가 올바르지 않습니다',
  'Invalid recovery code': '복구 코드가 올바르지 않습니다',
  'This sign-in has expired. Sign in again.': '이 로그인은 만료되었습니다. 다시 로그인하세요.',
  'Too many wrong codes. Try again in 15 minutes.': '잘못된 코드가 너무 많습니다. 15분 후에 다시 시도하세요.',
  'The password is wrong': '비밀번호가 올바르지 않습니다',
  'Too many failed sign-ins. Try again in {n} minute.': '로그인 실패가 너무 많습니다. {n}분 후에 다시 시도하세요.',
  'Too many failed sign-ins. Try again in {n} minutes.': '로그인 실패가 너무 많습니다. {n}분 후에 다시 시도하세요.',
}

export default messages
