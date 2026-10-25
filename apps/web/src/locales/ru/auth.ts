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
  'Code from your authenticator app': 'Код из приложения-аутентификатора',
  'Recovery code': 'Код восстановления',
  'Don’t ask again on this device for 30 days': 'Не спрашивать на этом устройстве 30 дней',
  Verify: 'Подтвердить',
  Back: 'Назад',
  'Use a recovery code': 'Использовать код восстановления',
  'Use the authenticator app': 'Использовать приложение-аутентификатор',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': 'Учётная запись заблокирована после слишком многих неудачных попыток входа. Попросите системного администратора разблокировать её.',
  'Too many failed sign-ins from this address. Try again later.': 'Слишком много неудачных попыток входа с этого адреса. Повторите попытку позже.',
  'Invalid code': 'Неверный код',
  'Invalid recovery code': 'Неверный код восстановления',
  'This sign-in has expired. Sign in again.': 'Время входа истекло. Войдите снова.',
  'Too many wrong codes. Try again in 15 minutes.': 'Слишком много неверных кодов. Повторите попытку через 15 минут.',
  'The password is wrong': 'Неверный пароль',
  'Too many failed sign-ins. Try again in {n} minute.': 'Слишком много неудачных попыток входа. Повторите попытку позже (минут: {n}).',
  'Too many failed sign-ins. Try again in {n} minutes.': 'Слишком много неудачных попыток входа. Повторите попытку позже (минут: {n}).',
}

export default messages
