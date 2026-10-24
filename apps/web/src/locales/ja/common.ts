// Japanese messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': '共有されたプロジェクト',
  Workspace: 'ワークスペース',
  Settings: '設定',
  'New project': '新規プロジェクト',
  Member: 'メンバー',
  'Sign out': 'ログアウト',
  Theme: 'テーマ',
  Language: '言語',
  Light: 'ライト',
  Dark: 'ダーク',
  Forest: 'フォレスト',
  Moss: 'モス',
  Lavender: 'ラベンダー',
  Plum: 'プラム',
  'Toggle Sidebar': 'サイドバーの表示切り替え',
  More: 'その他',
  Loading: '読み込み中',

  // Settings navigation
  Personal: '個人',
  Administration: '管理',
  Users: 'ユーザー',
  Account: 'アカウント',
  Appearance: '外観',
  Overview: '概要',
  Invitations: '招待',
  'AI agent': 'AI エージェント',

  // Appearance

  // Account
  Profile: 'プロフィール',
  Name: '名前',
  'Avatar colour': 'アバターの色',
  Email: 'メールアドレス',
  Save: '保存',
  'Name updated': '名前を更新しました',
  Password: 'パスワード',
  'Current password': '現在のパスワード',
  'New password': '新しいパスワード',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': '8 文字以上',
  'An uppercase letter': '大文字',
  'A lowercase letter': '小文字',
  'A number': '数字',
  Weak: '弱い',
  Fair: '普通',
  Good: '良い',
  Strong: '強い',
  'Confirm password': 'パスワードの確認',
  'Sign out on my other devices': '他のデバイスからもログアウトする',
  'Change password': 'パスワードを変更',
  'Password changed': 'パスワードを変更しました',
  'Password changed. Other devices were signed out.': 'パスワードを変更しました。他のデバイスからはログアウトしました。',
}

export default messages
