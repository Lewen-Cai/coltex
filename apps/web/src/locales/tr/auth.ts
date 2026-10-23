// Turkish messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'E-posta veya parola hatalı',
  'Too many requests. Please try again later.': 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.',
  'This account has been disabled': 'Bu hesap devre dışı bırakıldı',
  'Sign-in failed': 'Oturum açılamadı',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'Parola en az 8 karakter olmalı ve bir büyük harf, bir küçük harf ve bir rakam içermelidir',
  'Password must be at most 128 characters': 'Parola en fazla 128 karakter olabilir',
  'Passwords do not match': 'Parolalar eşleşmiyor',
  'The current password is wrong': 'Mevcut parola yanlış',
  'ColTex is already set up': 'ColTex zaten kurulmuş',
  'Setup is already in progress': 'Kurulum zaten sürüyor',
  'This invite is for a different email address': 'Bu davet başka bir e-posta adresi için',
  'This invite has already been used': 'Bu davet zaten kullanılmış',
  'This invite link is invalid, expired, or already used': 'Bu davet bağlantısı geçersiz, süresi dolmuş ya da zaten kullanılmış',
  'An account with this email already exists': 'Bu e-posta adresiyle bir hesap zaten var',
  'This link is invalid, expired, or has been used up': 'Bu bağlantı geçersiz, süresi dolmuş ya da kullanım hakkı bitmiş',
  'This link does not allow creating an account; sign in instead': 'Bu bağlantıyla hesap oluşturulamaz; bunun yerine oturum açın',
}

export default messages
