// Chinese (Traditional) messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': '與我共用',
  Workspace: '工作區',
  Settings: '設定',
  'New project': '新增專案',
  Member: '成員',
  'Sign out': '登出',
  Theme: '主題',
  Language: '語言',
  Light: '淺色',
  Dark: '深色',
  Forest: '森林',
  Moss: '苔蘚',
  Lavender: '薰衣草',
  Plum: '梅子',
  'Toggle Sidebar': '顯示/隱藏側邊欄',
  More: '更多',
  Loading: '載入中',

  // Settings navigation
  Personal: '個人',
  Administration: '管理',
  Users: '使用者',
  Account: '帳號',
  Appearance: '外觀',
  Overview: '總覽',
  Invitations: '邀請',
  'AI agent': 'AI 代理',

  // Appearance

  // Account
  Profile: '個人資料',
  Name: '姓名',
  Email: '電子郵件',
  Save: '儲存',
  'Name updated': '姓名已更新',
  Password: '密碼',
  'Current password': '目前的密碼',
  'New password': '新密碼',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': '至少 8 個字元',
  'An uppercase letter': '大寫字母',
  'A lowercase letter': '小寫字母',
  'A number': '數字',
  Weak: '弱',
  Fair: '普通',
  Good: '良好',
  Strong: '強',
  'Confirm password': '確認密碼',
  'Sign out on my other devices': '同時登出我在其他裝置上的工作階段',
  'Change password': '變更密碼',
  'Password changed': '密碼已變更',
  'Password changed. Other devices were signed out.': '密碼已變更，其他裝置已登出。',
}

export default messages
