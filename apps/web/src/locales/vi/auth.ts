// Vietnamese messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'Email hoặc mật khẩu không đúng',
  'Too many requests. Please try again later.': 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  'This account has been disabled': 'Tài khoản này đã bị vô hiệu hóa',
  'Sign-in failed': 'Đăng nhập không thành công',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'Mật khẩu phải có ít nhất 8 ký tự, gồm một chữ hoa, một chữ thường và một chữ số',
  'Password must be at most 128 characters': 'Mật khẩu tối đa 128 ký tự',
  'Passwords do not match': 'Mật khẩu không khớp',
  'The current password is wrong': 'Mật khẩu hiện tại không đúng',
  'ColTex is already set up': 'ColTex đã được thiết lập',
  'Setup is already in progress': 'Quá trình thiết lập đang diễn ra',
  'This invite is for a different email address': 'Lời mời này dành cho một địa chỉ email khác',
  'This invite has already been used': 'Lời mời này đã được sử dụng',
  'This invite link is invalid, expired, or already used': 'Liên kết mời không hợp lệ, đã hết hạn hoặc đã được sử dụng',
  'An account with this email already exists': 'Đã có tài khoản dùng email này',
  'This link is invalid, expired, or has been used up': 'Liên kết không hợp lệ, đã hết hạn hoặc đã hết lượt sử dụng',
  'This link does not allow creating an account; sign in instead': 'Liên kết này không cho phép tạo tài khoản; hãy đăng nhập',
}

export default messages
