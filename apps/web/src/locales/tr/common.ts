// Turkish messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': 'Benimle paylaşılanlar',
  Workspace: 'Çalışma alanı',
  Settings: 'Ayarlar',
  'New project': 'Yeni proje',
  Member: 'Üye',
  'Sign out': 'Oturumu kapat',
  Theme: 'Tema',
  Language: 'Dil',
  Light: 'Açık',
  Dark: 'Koyu',
  Forest: 'Orman',
  Moss: 'Yosun',
  Sepia: 'Sepya',
  Espresso: 'Espresso',
  'Toggle Sidebar': 'Kenar çubuğunu aç/kapat',
  More: 'Daha fazla',
  Loading: 'Yükleniyor',

  // Settings navigation
  Personal: 'Kişisel',
  Administration: 'Yönetim',
  Users: 'Kullanıcılar',
  Account: 'Hesap',
  Appearance: 'Görünüm',
  Overview: 'Genel bakış',
  Invitations: 'Davetler',
  'AI agent': 'YZ ajanı',

  // Appearance

  // Account
  Profile: 'Profil',
  Name: 'Ad',
  Email: 'E-posta',
  Save: 'Kaydet',
  'Name updated': 'Ad güncellendi',
  Password: 'Parola',
  'Current password': 'Mevcut parola',
  'New password': 'Yeni parola',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': 'En az 8 karakter',
  'An uppercase letter': 'Bir büyük harf',
  'A lowercase letter': 'Bir küçük harf',
  'A number': 'Bir rakam',
  Weak: 'Zayıf',
  Fair: 'Orta',
  Good: 'İyi',
  Strong: 'Güçlü',
  'Confirm password': 'Parolayı onaylayın',
  'Sign out on my other devices': 'Diğer cihazlarımda oturumu kapat',
  'Change password': 'Parolayı değiştir',
  'Password changed': 'Parola değiştirildi',
  'Password changed. Other devices were signed out.': 'Parola değiştirildi. Diğer cihazlarda oturum kapatıldı.',
}

export default messages
