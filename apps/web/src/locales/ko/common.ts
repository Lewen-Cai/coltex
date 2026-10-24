// Korean messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': '나와 공유됨',
  Workspace: '작업 공간',
  Settings: '설정',
  'New project': '새 프로젝트',
  Member: '멤버',
  'Sign out': '로그아웃',
  Theme: '테마',
  Language: '언어',
  Light: '라이트',
  Dark: '다크',
  Forest: '포레스트',
  Moss: '모스',
  Lavender: '라벤더',
  Plum: '플럼',
  'Toggle Sidebar': '사이드바 열기/닫기',
  More: '더 보기',
  Loading: '불러오는 중',

  // Settings navigation
  Personal: '개인',
  Administration: '관리',
  Users: '사용자',
  Account: '계정',
  Appearance: '화면 표시',
  Overview: '개요',
  Invitations: '초대',
  'AI agent': 'AI 에이전트',

  // Appearance

  // Account
  Profile: '프로필',
  Name: '이름',
  'Avatar colour': '아바타 색상',
  Email: '이메일',
  Save: '저장',
  'Name updated': '이름이 업데이트되었습니다',
  Password: '비밀번호',
  'Current password': '현재 비밀번호',
  'New password': '새 비밀번호',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': '8자 이상',
  'An uppercase letter': '대문자',
  'A lowercase letter': '소문자',
  'A number': '숫자',
  Weak: '약함',
  Fair: '보통',
  Good: '좋음',
  Strong: '강함',
  'Confirm password': '비밀번호 확인',
  'Sign out on my other devices': '다른 기기에서도 로그아웃',
  'Change password': '비밀번호 변경',
  'Password changed': '비밀번호가 변경되었습니다',
  'Password changed. Other devices were signed out.': '비밀번호가 변경되었습니다. 다른 기기에서는 로그아웃되었습니다.',
}

export default messages
