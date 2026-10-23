// French messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': 'Partagés avec moi',
  Workspace: 'Espace de travail',
  Settings: 'Paramètres',
  'New project': 'Nouveau projet',
  Member: 'Membre',
  'Sign out': 'Se déconnecter',
  Theme: 'Thème',
  Language: 'Langue',
  Light: 'Clair',
  Dark: 'Sombre',
  Forest: 'Forêt',
  Moss: 'Mousse',
  Sepia: 'Sépia',
  Espresso: 'Espresso',
  'Toggle Sidebar': 'Afficher/masquer la barre latérale',
  More: 'Plus',
  Loading: 'Chargement',

  // Settings navigation
  Personal: 'Personnel',
  Administration: 'Administration',
  Users: 'Utilisateurs',
  Account: 'Compte',
  Appearance: 'Apparence',
  Overview: 'Vue d’ensemble',
  Invitations: 'Invitations',
  'AI agent': 'Agent IA',

  // Appearance

  // Account
  Profile: 'Profil',
  Name: 'Nom',
  Email: 'E-mail',
  Save: 'Enregistrer',
  'Name updated': 'Nom mis à jour',
  Password: 'Mot de passe',
  'Current password': 'Mot de passe actuel',
  'New password': 'Nouveau mot de passe',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': '8 caractères ou plus',
  'An uppercase letter': 'Une majuscule',
  'A lowercase letter': 'Une minuscule',
  'A number': 'Un chiffre',
  Weak: 'Faible',
  Fair: 'Moyen',
  Good: 'Bon',
  Strong: 'Fort',
  'Confirm password': 'Confirmer le mot de passe',
  'Sign out on my other devices': 'Me déconnecter sur mes autres appareils',
  'Change password': 'Changer le mot de passe',
  'Password changed': 'Mot de passe modifié',
  'Password changed. Other devices were signed out.': 'Mot de passe modifié. Les autres appareils ont été déconnectés.',
}

export default messages
