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
}

export default messages
