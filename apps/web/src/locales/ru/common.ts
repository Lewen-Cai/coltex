// Russian messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': 'Доступные мне',
  Workspace: 'Рабочая область',
  Settings: 'Настройки',
  'New project': 'Новый проект',
  Member: 'Участник',
  'Sign out': 'Выйти',
  Theme: 'Тема',
  Language: 'Язык',
  Light: 'Светлая',
  Dark: 'Тёмная',
  Forest: 'Лес',
  Moss: 'Мох',
  Lavender: 'Лаванда',
  Plum: 'Слива',
  'Toggle Sidebar': 'Показать или скрыть боковую панель',
  More: 'Ещё',
  Loading: 'Загрузка',

  // Settings navigation
  Personal: 'Личное',
  Administration: 'Администрирование',
  Users: 'Пользователи',
  Account: 'Учётная запись',
  Appearance: 'Внешний вид',
  Overview: 'Обзор',
  Invitations: 'Приглашения',
  'AI agent': 'ИИ-агент',

  // Appearance

  // Account
  Profile: 'Профиль',
  Name: 'Имя',
  Email: 'Электронная почта',
  Save: 'Сохранить',
  'Name updated': 'Имя обновлено',
  Password: 'Пароль',
  'Current password': 'Текущий пароль',
  'New password': 'Новый пароль',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': 'Не менее 8 символов',
  'An uppercase letter': 'Заглавная буква',
  'A lowercase letter': 'Строчная буква',
  'A number': 'Цифра',
  Weak: 'Слабый',
  Fair: 'Средний',
  Good: 'Хороший',
  Strong: 'Надёжный',
  'Confirm password': 'Подтверждение пароля',
  'Sign out on my other devices': 'Выйти на других моих устройствах',
  'Change password': 'Сменить пароль',
  'Password changed': 'Пароль изменён',
  'Password changed. Other devices were signed out.': 'Пароль изменён. На других устройствах выполнен выход.',
}

export default messages
