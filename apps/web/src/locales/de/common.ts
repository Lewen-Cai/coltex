// German messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': 'Mit mir geteilt',
  Workspace: 'Arbeitsbereich',
  Settings: 'Einstellungen',
  'New project': 'Neues Projekt',
  Member: 'Mitglied',
  'Sign out': 'Abmelden',
  Theme: 'Design',
  Language: 'Sprache',
  Light: 'Hell',
  Dark: 'Dunkel',
  Forest: 'Wald',
  Moss: 'Moos',
  Lavender: 'Lavendel',
  Plum: 'Pflaume',
  'Toggle Sidebar': 'Seitenleiste ein-/ausblenden',
  More: 'Mehr',
  Loading: 'Wird geladen',

  // Settings navigation
  Personal: 'Persönlich',
  Administration: 'Verwaltung',
  Users: 'Benutzer',
  Account: 'Konto',
  Appearance: 'Darstellung',
  Overview: 'Übersicht',
  Invitations: 'Einladungen',
  'AI agent': 'KI-Agent',

  // Appearance

  // Account
  Profile: 'Profil',
  Name: 'Name',
  'Avatar colour': 'Avatarfarbe',
  Email: 'E-Mail',
  Save: 'Speichern',
  'Name updated': 'Name aktualisiert',
  Password: 'Passwort',
  'Current password': 'Aktuelles Passwort',
  'New password': 'Neues Passwort',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': 'Mindestens 8 Zeichen',
  'An uppercase letter': 'Ein Großbuchstabe',
  'A lowercase letter': 'Ein Kleinbuchstabe',
  'A number': 'Eine Ziffer',
  Weak: 'Schwach',
  Fair: 'Mittel',
  Good: 'Gut',
  Strong: 'Stark',
  'Confirm password': 'Passwort bestätigen',
  'Sign out on my other devices': 'Auf meinen anderen Geräten abmelden',
  'Change password': 'Passwort ändern',
  'Password changed': 'Passwort geändert',
  'Password changed. Other devices were signed out.': 'Passwort geändert. Andere Geräte wurden abgemeldet.',
}

export default messages
