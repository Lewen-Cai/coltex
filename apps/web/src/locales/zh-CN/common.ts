// Chinese (Simplified) messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': '与我共享',
  Workspace: '项目区',
  Settings: '设置',
  'New project': '新建项目',
  Member: '成员',
  'Sign out': '退出登录',
  Theme: '主题',
  Language: '语言',
  Light: '浅色',
  Dark: '深色',
  Forest: '森林',
  Moss: '苔藓',
  Sepia: '暖色',
  Espresso: '咖啡',
  'Toggle Sidebar': '展开/收起侧边栏',
  More: '更多',
  Loading: '加载中',

  // Settings navigation
  Personal: '个人',
  Administration: '管理',
  Users: '用户',
  Account: '账号',
  Appearance: '外观',
  Overview: '概览',
  Invitations: '邀请',
  'AI agent': 'AI 智能体',

  // Appearance

  // Account
  Profile: '个人资料',
  Name: '姓名',
  Email: '邮箱',
  Save: '保存',
  'Name updated': '姓名已更新',
  Password: '密码',
  'Current password': '当前密码',
  'New password': '新密码',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': '至少 8 个字符',
  'An uppercase letter': '大写字母',
  'A lowercase letter': '小写字母',
  'A number': '数字',
  Weak: '弱',
  Fair: '一般',
  Good: '良好',
  Strong: '强',
  'Confirm password': '确认密码',
  'Sign out on my other devices': '同时退出我在其他设备上的登录',
  'Change password': '修改密码',
  'Password changed': '密码已修改',
  'Password changed. Other devices were signed out.': '密码已修改，其他设备已退出登录。',
}

export default messages
