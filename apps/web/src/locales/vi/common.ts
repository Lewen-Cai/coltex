// Vietnamese messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': 'Được chia sẻ với tôi',
  Workspace: 'Không gian làm việc',
  Settings: 'Cài đặt',
  'New project': 'Dự án mới',
  Member: 'Thành viên',
  'Sign out': 'Đăng xuất',
  Theme: 'Chủ đề',
  Language: 'Ngôn ngữ',
  Light: 'Sáng',
  Dark: 'Tối',
  Forest: 'Rừng',
  Moss: 'Rêu',
  Sepia: 'Nâu nhạt',
  Espresso: 'Cà phê',
  'Toggle Sidebar': 'Ẩn/hiện thanh bên',
  More: 'Thêm',
  Loading: 'Đang tải',

  // Settings navigation
  Personal: 'Cá nhân',
  Administration: 'Quản trị',
  Users: 'Người dùng',
  Account: 'Tài khoản',
  Appearance: 'Giao diện',
  Overview: 'Tổng quan',
  Invitations: 'Lời mời',
  'AI agent': 'Tác tử AI',

  // Appearance

  // Account
  Profile: 'Hồ sơ',
  Name: 'Tên',
  Email: 'Email',
  Save: 'Lưu',
  'Name updated': 'Đã cập nhật tên',
  Password: 'Mật khẩu',
  'Current password': 'Mật khẩu hiện tại',
  'New password': 'Mật khẩu mới',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': 'Từ 8 ký tự trở lên',
  'An uppercase letter': 'Một chữ hoa',
  'A lowercase letter': 'Một chữ thường',
  'A number': 'Một chữ số',
  Weak: 'Yếu',
  Fair: 'Trung bình',
  Good: 'Khá',
  Strong: 'Mạnh',
  'Confirm password': 'Xác nhận mật khẩu',
  'Sign out on my other devices': 'Đăng xuất trên các thiết bị khác của tôi',
  'Change password': 'Đổi mật khẩu',
  'Password changed': 'Đã đổi mật khẩu',
  'Password changed. Other devices were signed out.': 'Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.',
}

export default messages
