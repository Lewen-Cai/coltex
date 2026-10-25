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
  'Code from your authenticator app': 'Kode dari aplikasi autentikator Anda',
  'Recovery code': 'Kode pemulihan',
  'Don’t ask again on this device for 30 days': 'Jangan tanya lagi di perangkat ini selama 30 hari',
  Verify: 'Verifikasi',
  Back: 'Kembali',
  'Use a recovery code': 'Gunakan kode pemulihan',
  'Use the authenticator app': 'Gunakan aplikasi autentikator',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': 'Akun ini dikunci setelah terlalu banyak gagal masuk. Minta administrator sistem untuk membukanya.',
  'Too many failed sign-ins from this address. Try again later.': 'Terlalu banyak gagal masuk dari alamat ini. Coba lagi nanti.',
  'Invalid code': 'Kode tidak valid',
  'Invalid recovery code': 'Kode pemulihan tidak valid',
  'This sign-in has expired. Sign in again.': 'Proses masuk ini sudah kedaluwarsa. Masuk lagi.',
  'Too many wrong codes. Try again in 15 minutes.': 'Terlalu banyak kode salah. Coba lagi dalam 15 menit.',
  'The password is wrong': 'Kata sandi salah',
  'Too many failed sign-ins. Try again in {n} minute.': 'Terlalu banyak gagal masuk. Coba lagi dalam {n} menit.',
  'Too many failed sign-ins. Try again in {n} minutes.': 'Terlalu banyak gagal masuk. Coba lagi dalam {n} menit.',
}

export default messages
