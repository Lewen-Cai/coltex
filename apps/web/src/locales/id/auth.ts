// Indonesian messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'Email atau kata sandi salah',
  'Too many requests. Please try again later.': 'Terlalu banyak permintaan. Coba lagi nanti.',
  'This account has been disabled': 'Akun ini telah dinonaktifkan',
  'Sign-in failed': 'Gagal masuk',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'Kata sandi minimal 8 karakter dan harus berisi huruf besar, huruf kecil, dan angka',
  'Password must be at most 128 characters': 'Kata sandi maksimal 128 karakter',
  'Passwords do not match': 'Kata sandi tidak cocok',
  'The current password is wrong': 'Kata sandi saat ini salah',
  'ColTex is already set up': 'ColTex sudah disiapkan',
  'Setup is already in progress': 'Penyiapan sedang berlangsung',
  'This invite is for a different email address': 'Undangan ini untuk alamat email lain',
  'This invite has already been used': 'Undangan ini sudah digunakan',
  'This invite link is invalid, expired, or already used': 'Tautan undangan ini tidak valid, kedaluwarsa, atau sudah digunakan',
  'An account with this email already exists': 'Akun dengan email ini sudah ada',
  'This link is invalid, expired, or has been used up': 'Tautan ini tidak valid, kedaluwarsa, atau sudah habis digunakan',
  'This link does not allow creating an account; sign in instead': 'Tautan ini tidak dapat digunakan untuk membuat akun; silakan masuk',
}

export default messages
