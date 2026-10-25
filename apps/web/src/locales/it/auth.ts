// Italian messages, keyed by their English text. See lib/i18n.ts.
// Errors on the sign-in, setup, invitation and join pages, and about passwords (lib/auth-errors.ts).
// These are translated, unlike the app's other errors (user's decision, 2026-10-18).
const messages: Record<string, string> = {
  'Invalid email or password': 'Email o password non validi',
  'Too many requests. Please try again later.': 'Troppe richieste. Riprova più tardi.',
  'This account has been disabled': 'Questo account è stato disattivato',
  'Sign-in failed': 'Accesso non riuscito',
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number': 'La password deve avere almeno 8 caratteri e contenere una lettera maiuscola, una minuscola e un numero',
  'Password must be at most 128 characters': 'La password può avere al massimo 128 caratteri',
  'Passwords do not match': 'Le password non coincidono',
  'The current password is wrong': 'La password attuale non è corretta',
  'ColTex is already set up': 'ColTex è già configurato',
  'Setup is already in progress': 'La configurazione è già in corso',
  'This invite is for a different email address': 'Questo invito è per un altro indirizzo email',
  'This invite has already been used': 'Questo invito è già stato usato',
  'This invite link is invalid, expired, or already used': 'Questo link di invito non è valido, è scaduto o è già stato usato',
  'An account with this email already exists': 'Esiste già un account con questa email',
  'This link is invalid, expired, or has been used up': 'Questo link non è valido, è scaduto o è esaurito',
  'This link does not allow creating an account; sign in instead': 'Questo link non consente di creare un account; accedi invece',
  'Code from your authenticator app': 'Codice dell’app di autenticazione',
  'Recovery code': 'Codice di recupero',
  'Don’t ask again on this device for 30 days': 'Non chiedere più su questo dispositivo per 30 giorni',
  Verify: 'Verifica',
  Back: 'Indietro',
  'Use a recovery code': 'Usa un codice di recupero',
  'Use the authenticator app': 'Usa l’app di autenticazione',
  'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.': 'Questo account è bloccato dopo troppi accessi non riusciti. Chiedi all’amministratore di sistema di sbloccarlo.',
  'Too many failed sign-ins from this address. Try again later.': 'Troppi accessi non riusciti da questo indirizzo. Riprova più tardi.',
  'Invalid code': 'Codice non valido',
  'Invalid recovery code': 'Codice di recupero non valido',
  'This sign-in has expired. Sign in again.': 'Questo accesso è scaduto. Accedi di nuovo.',
  'Too many wrong codes. Try again in 15 minutes.': 'Troppi codici errati. Riprova tra 15 minuti.',
  'The password is wrong': 'La password non è corretta',
  'Too many failed sign-ins. Try again in {n} minute.': 'Troppi accessi non riusciti. Riprova tra {n} minuto.',
  'Too many failed sign-ins. Try again in {n} minutes.': 'Troppi accessi non riusciti. Riprova tra {n} minuti.',
}

export default messages
