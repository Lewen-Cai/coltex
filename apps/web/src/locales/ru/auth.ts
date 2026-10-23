// Russian messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'Неверный адрес электронной почты или пароль',
  'Too many requests. Please try again later.': 'Слишком много запросов. Повторите попытку позже.',
  'This account has been disabled': 'Эта учётная запись отключена',
  'Sign-in failed': 'Не удалось войти',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'Пароль должен содержать не менее 8 символов, в том числе заглавную букву, строчную букву и цифру',
  'Password must be at most 128 characters': 'Пароль должен содержать не более 128 символов',
  'Passwords do not match': 'Пароли не совпадают',
  'The current password is wrong': 'Текущий пароль неверен',
  'ColTex is already set up': 'ColTex уже настроен',
  'Setup is already in progress': 'Настройка уже выполняется',
  'This invite is for a different email address': 'Это приглашение предназначено для другого адреса электронной почты',
  'This invite has already been used': 'Это приглашение уже использовано',
  'This invite link is invalid, expired, or already used': 'Ссылка-приглашение недействительна, просрочена или уже использована',
  'An account with this email already exists': 'Учётная запись с этим адресом электронной почты уже существует',
  'This link is invalid, expired, or has been used up': 'Ссылка недействительна, просрочена или исчерпана',
  'This link does not allow creating an account; sign in instead': 'По этой ссылке нельзя создать учётную запись; войдите в систему',
}

export default messages
