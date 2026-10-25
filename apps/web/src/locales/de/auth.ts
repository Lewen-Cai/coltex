// German messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'E-Mail-Adresse oder Passwort ist falsch',
  'Too many requests. Please try again later.': 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
  'This account has been disabled': 'Dieses Konto wurde deaktiviert',
  'Sign-in failed': 'Anmeldung fehlgeschlagen',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'Das Passwort muss mindestens 8 Zeichen lang sein und einen Großbuchstaben, einen Kleinbuchstaben und eine Ziffer enthalten',
  'Password must be at most 128 characters': 'Das Passwort darf höchstens 128 Zeichen lang sein',
  'Passwords do not match': 'Die Passwörter stimmen nicht überein',
  'The current password is wrong': 'Das aktuelle Passwort ist falsch',
  'ColTex is already set up': 'ColTex ist bereits eingerichtet',
  'Setup is already in progress': 'Die Einrichtung läuft bereits',
  'This invite is for a different email address': 'Diese Einladung gilt für eine andere E-Mail-Adresse',
  'This invite has already been used': 'Diese Einladung wurde bereits verwendet',
  'This invite link is invalid, expired, or already used': 'Dieser Einladungslink ist ungültig, abgelaufen oder bereits verwendet',
  'An account with this email already exists': 'Für diese E-Mail-Adresse gibt es bereits ein Konto',
  'This link is invalid, expired, or has been used up': 'Dieser Link ist ungültig, abgelaufen oder aufgebraucht',
  'This link does not allow creating an account; sign in instead': 'Mit diesem Link kann kein Konto erstellt werden; melden Sie sich stattdessen an',
  'Code from your authenticator app': 'Code aus Ihrer Authenticator-App',
  'Recovery code': 'Wiederherstellungscode',
  'Don’t ask again on this device for 30 days': 'Auf diesem Gerät 30 Tage lang nicht mehr fragen',
  Verify: 'Bestätigen',
  Back: 'Zurück',
  'Use a recovery code': 'Wiederherstellungscode verwenden',
  'Use the authenticator app': 'Authenticator-App verwenden',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': 'Dieses Konto ist nach zu vielen fehlgeschlagenen Anmeldungen gesperrt. Bitten Sie den Systemadministrator, es zu entsperren.',
  'Too many failed sign-ins from this address. Try again later.': 'Zu viele fehlgeschlagene Anmeldungen von dieser Adresse. Versuchen Sie es später erneut.',
  'Invalid code': 'Ungültiger Code',
  'Invalid recovery code': 'Ungültiger Wiederherstellungscode',
  'This sign-in has expired. Sign in again.': 'Diese Anmeldung ist abgelaufen. Melden Sie sich erneut an.',
  'Too many wrong codes. Try again in 15 minutes.': 'Zu viele falsche Codes. Versuchen Sie es in 15 Minuten erneut.',
  'The password is wrong': 'Das Passwort ist falsch',
  'Too many failed sign-ins. Try again in {n} minute.': 'Zu viele fehlgeschlagene Anmeldungen. Versuchen Sie es in {n} Minute erneut.',
  'Too many failed sign-ins. Try again in {n} minutes.': 'Zu viele fehlgeschlagene Anmeldungen. Versuchen Sie es in {n} Minuten erneut.',
}

export default messages
