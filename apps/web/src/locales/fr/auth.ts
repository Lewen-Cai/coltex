// French messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'E-mail ou mot de passe incorrect',
  'Too many requests. Please try again later.': 'Trop de tentatives. Veuillez réessayer plus tard.',
  'This account has been disabled': 'Ce compte a été désactivé',
  'Sign-in failed': 'Échec de la connexion',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'Le mot de passe doit comporter au moins 8 caractères, dont une majuscule, une minuscule et un chiffre',
  'Password must be at most 128 characters': 'Le mot de passe doit comporter au plus 128 caractères',
  'Passwords do not match': 'Les mots de passe ne correspondent pas',
  'The current password is wrong': 'Le mot de passe actuel est incorrect',
  'ColTex is already set up': 'ColTex est déjà configuré',
  'Setup is already in progress': 'La configuration est déjà en cours',
  'This invite is for a different email address': 'Cette invitation est destinée à une autre adresse e-mail',
  'This invite has already been used': 'Cette invitation a déjà été utilisée',
  'This invite link is invalid, expired, or already used': 'Ce lien d’invitation est invalide, expiré ou déjà utilisé',
  'An account with this email already exists': 'Un compte existe déjà avec cette adresse e-mail',
  'This link is invalid, expired, or has been used up': 'Ce lien est invalide, expiré ou épuisé',
  'This link does not allow creating an account; sign in instead': 'Ce lien ne permet pas de créer un compte ; connectez-vous plutôt',
  'Code from your authenticator app': 'Code de votre application d’authentification',
  'Recovery code': 'Code de récupération',
  'Don’t ask again on this device for 30 days': 'Ne plus demander sur cet appareil pendant 30 jours',
  Verify: 'Vérifier',
  Back: 'Retour',
  'Use a recovery code': 'Utiliser un code de récupération',
  'Use the authenticator app': 'Utiliser l’application d’authentification',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': 'Ce compte est verrouillé après trop d’échecs de connexion. Demandez à l’administrateur système de le déverrouiller.',
  'Too many failed sign-ins from this address. Try again later.': 'Trop d’échecs de connexion depuis cette adresse. Réessayez plus tard.',
  'Invalid code': 'Code incorrect',
  'Invalid recovery code': 'Code de récupération incorrect',
  'This sign-in has expired. Sign in again.': 'Cette connexion a expiré. Reconnectez-vous.',
  'Too many wrong codes. Try again in 15 minutes.': 'Trop de codes incorrects. Réessayez dans 15 minutes.',
  'The password is wrong': 'Le mot de passe est incorrect',
  'Too many failed sign-ins. Try again in {n} minute.': 'Trop d’échecs de connexion. Réessayez dans {n} minute.',
  'Too many failed sign-ins. Try again in {n} minutes.': 'Trop d’échecs de connexion. Réessayez dans {n} minutes.',
}

export default messages
