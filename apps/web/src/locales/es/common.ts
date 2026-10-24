// Spanish messages, keyed by their English text. See lib/i18n.ts.
// Shell, settings, and words used all over the app.
const messages: Record<string, string> = {
  // Shell
  'Shared with me': 'Compartidos conmigo',
  Workspace: 'Espacio de trabajo',
  Settings: 'Configuración',
  'New project': 'Nuevo proyecto',
  Member: 'Miembro',
  'Sign out': 'Cerrar sesión',
  Theme: 'Tema',
  Language: 'Idioma',
  Light: 'Claro',
  Dark: 'Oscuro',
  Forest: 'Bosque',
  Moss: 'Musgo',
  Lavender: 'Lavanda',
  Plum: 'Ciruela',
  'Toggle Sidebar': 'Mostrar u ocultar la barra lateral',
  More: 'Más',
  Loading: 'Cargando',

  // Settings navigation
  Personal: 'Personal',
  Administration: 'Administración',
  Users: 'Usuarios',
  Account: 'Cuenta',
  Appearance: 'Apariencia',
  Overview: 'Resumen',
  Invitations: 'Invitaciones',
  'AI agent': 'Agente de IA',

  // Appearance

  // Account
  Profile: 'Perfil',
  Name: 'Nombre',
  Email: 'Correo electrónico',
  Save: 'Guardar',
  'Name updated': 'Nombre actualizado',
  Password: 'Contraseña',
  'Current password': 'Contraseña actual',
  'New password': 'Nueva contraseña',
  // Password rules and strength (components/auth/PasswordStrength.tsx)
  '8 or more characters': '8 caracteres o más',
  'An uppercase letter': 'Una letra mayúscula',
  'A lowercase letter': 'Una letra minúscula',
  'A number': 'Un número',
  Weak: 'Débil',
  Fair: 'Aceptable',
  Good: 'Buena',
  Strong: 'Fuerte',
  'Confirm password': 'Confirmar contraseña',
  'Sign out on my other devices': 'Cerrar sesión en mis otros dispositivos',
  'Change password': 'Cambiar contraseña',
  'Password changed': 'Contraseña cambiada',
  'Password changed. Other devices were signed out.': 'Contraseña cambiada. Se cerró la sesión en los otros dispositivos.',
}

export default messages
