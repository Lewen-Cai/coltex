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
  'Code from your authenticator app': 'Mã từ ứng dụng xác thực',
  'Recovery code': 'Mã khôi phục',
  'Don’t ask again on this device for 30 days': 'Không hỏi lại trên thiết bị này trong 30 ngày',
  Verify: 'Xác minh',
  Back: 'Quay lại',
  'Use a recovery code': 'Dùng mã khôi phục',
  'Use the authenticator app': 'Dùng ứng dụng xác thực',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': 'Tài khoản này đã bị khóa do đăng nhập thất bại quá nhiều lần. Hãy nhờ quản trị viên hệ thống mở khóa.',
  'Too many failed sign-ins from this address. Try again later.': 'Đăng nhập thất bại quá nhiều lần từ địa chỉ này. Hãy thử lại sau.',
  'Invalid code': 'Mã không đúng',
  'Invalid recovery code': 'Mã khôi phục không đúng',
  'This sign-in has expired. Sign in again.': 'Phiên đăng nhập này đã hết hạn. Hãy đăng nhập lại.',
  'Too many wrong codes. Try again in 15 minutes.': 'Nhập sai mã quá nhiều lần. Hãy thử lại sau 15 phút.',
  'The password is wrong': 'Mật khẩu không đúng',
  'Too many failed sign-ins. Try again in {n} minute.': 'Đăng nhập thất bại quá nhiều lần. Hãy thử lại sau {n} phút.',
  'Too many failed sign-ins. Try again in {n} minutes.': 'Đăng nhập thất bại quá nhiều lần. Hãy thử lại sau {n} phút.',
}

export default messages
