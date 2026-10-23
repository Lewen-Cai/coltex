// Portuguese (Brazil) messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'E-mail ou senha inválidos',
  'Too many requests. Please try again later.': 'Muitas tentativas. Tente novamente mais tarde.',
  'This account has been disabled': 'Esta conta foi desativada',
  'Sign-in failed': 'Falha ao entrar',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'A senha deve ter pelo menos 8 caracteres e incluir uma letra maiúscula, uma letra minúscula e um número',
  'Password must be at most 128 characters': 'A senha deve ter no máximo 128 caracteres',
  'Passwords do not match': 'As senhas não coincidem',
  'The current password is wrong': 'A senha atual está incorreta',
  'ColTex is already set up': 'O ColTex já está configurado',
  'Setup is already in progress': 'A configuração inicial já está em andamento',
  'This invite is for a different email address': 'Este convite é para outro endereço de e-mail',
  'This invite has already been used': 'Este convite já foi usado',
  'This invite link is invalid, expired, or already used': 'Este link de convite é inválido, expirou ou já foi usado',
  'An account with this email already exists': 'Já existe uma conta com este e-mail',
  'This link is invalid, expired, or has been used up': 'Este link é inválido, expirou ou já atingiu o limite de usos',
  'This link does not allow creating an account; sign in instead': 'Este link não permite criar uma conta; entre com a sua conta',
}

export default messages
