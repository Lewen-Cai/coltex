// Spanish messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'Correo electrónico o contraseña incorrectos',
  'Too many requests. Please try again later.': 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
  'This account has been disabled': 'Esta cuenta ha sido desactivada',
  'Sign-in failed': 'No se pudo iniciar sesión',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'La contraseña debe tener al menos 8 caracteres e incluir una mayúscula, una minúscula y un número',
  'Password must be at most 128 characters': 'La contraseña debe tener como máximo 128 caracteres',
  'Passwords do not match': 'Las contraseñas no coinciden',
  'The current password is wrong': 'La contraseña actual es incorrecta',
  'ColTex is already set up': 'ColTex ya está configurado',
  'Setup is already in progress': 'La configuración inicial ya está en curso',
  'This invite is for a different email address': 'Esta invitación es para otra dirección de correo electrónico',
  'This invite has already been used': 'Esta invitación ya se ha usado',
  'This invite link is invalid, expired, or already used': 'Este enlace de invitación no es válido, ha caducado o ya se ha usado',
  'An account with this email already exists': 'Ya existe una cuenta con este correo electrónico',
  'This link is invalid, expired, or has been used up': 'Este enlace no es válido, ha caducado o ya se ha agotado',
  'This link does not allow creating an account; sign in instead': 'Este enlace no permite crear una cuenta; inicia sesión en su lugar',
  'Code from your authenticator app': 'Código de tu aplicación de autenticación',
  'Recovery code': 'Código de recuperación',
  'Don’t ask again on this device for 30 days': 'No volver a preguntar en este dispositivo durante 30 días',
  Verify: 'Verificar',
  Back: 'Volver',
  'Use a recovery code': 'Usar un código de recuperación',
  'Use the authenticator app': 'Usar la aplicación de autenticación',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': 'Esta cuenta está bloqueada por demasiados inicios de sesión fallidos. Pide al administrador del sistema que la desbloquee.',
  'Too many failed sign-ins from this address. Try again later.': 'Demasiados inicios de sesión fallidos desde esta dirección. Inténtalo más tarde.',
  'Invalid code': 'Código no válido',
  'Invalid recovery code': 'Código de recuperación no válido',
  'This sign-in has expired. Sign in again.': 'Este inicio de sesión ha caducado. Vuelve a iniciar sesión.',
  'Too many wrong codes. Try again in 15 minutes.': 'Demasiados códigos incorrectos. Inténtalo de nuevo en 15 minutos.',
  'The password is wrong': 'La contraseña no es correcta',
  'Too many failed sign-ins. Try again in {n} minute.': 'Demasiados inicios de sesión fallidos. Inténtalo de nuevo en {n} minuto.',
  'Too many failed sign-ins. Try again in {n} minutes.': 'Demasiados inicios de sesión fallidos. Inténtalo de nuevo en {n} minutos.',
}

export default messages
