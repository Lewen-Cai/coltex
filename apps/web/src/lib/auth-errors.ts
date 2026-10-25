import { PASSWORD_PROBLEM } from '@coltex/shared'
import { plural, t } from './i18n.ts'

/**
 * Errors on the pages people see before they are in (sign-in, first-run
 * setup, invitations, join links) and about their password are shown in the
 * interface language (user's decision, 2026-10-18), unlike the app's other
 * errors, which stay English. Messages not listed here stay as they are.
 */
export function authErrorText(message: string): string {
  switch (message) {
    case 'Invalid email or password':
      return t('Invalid email or password')
    case 'Too many requests. Please try again later.':
      return t('Too many requests. Please try again later.')
    case 'You have been banned from this application':
      return t('This account has been disabled')
    case 'Sign-in failed':
      return t('Sign-in failed')
    case 'This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.':
      return t('This account is locked after too many failed sign-ins. Ask the system administrator to unlock it.')
    case 'Too many failed sign-ins from this address. Try again later.':
      return t('Too many failed sign-ins from this address. Try again later.')
    case 'Invalid code':
      return t('Invalid code')
    case 'Invalid backup code':
      return t('Invalid recovery code')
    case 'Too many attempts. Please request a new code.':
    case 'Invalid two factor cookie':
      return t('This sign-in has expired. Sign in again.')
    case 'Too many failed verification attempts. Your account is temporarily locked. Please try again later.':
      return t('Too many wrong codes. Try again in 15 minutes.')
    case 'Invalid password':
      return t('The password is wrong')
    case PASSWORD_PROBLEM:
      return t('Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number')
    case 'Password must be at most 128 characters':
      return t('Password must be at most 128 characters')
    case 'Passwords do not match':
      return t('Passwords do not match')
    case 'The current password is wrong':
      return t('The current password is wrong')
    case 'ColTex is already set up':
      return t('ColTex is already set up')
    case 'Setup is already in progress':
      return t('Setup is already in progress')
    case 'This invite is for a different email address':
      return t('This invite is for a different email address')
    case 'This invite has already been used':
      return t('This invite has already been used')
    case 'This invite link is invalid, expired, or already used':
      return t('This invite link is invalid, expired, or already used')
    case 'An account with this email already exists':
      return t('An account with this email already exists')
    case 'This link is invalid, expired, or has been used up':
      return t('This link is invalid, expired, or has been used up')
    case 'This link does not allow creating an account; sign in instead':
      return t('This link does not allow creating an account; sign in instead')
    default:
      return message
  }
}

/** The wait after failed sign-ins (the server says how long, in seconds). */
export function signInWaitText(seconds: number | undefined): string {
  const minutes = Math.max(1, Math.ceil((seconds ?? 900) / 60))
  return plural(minutes, 'Too many failed sign-ins. Try again in {n} minute.', 'Too many failed sign-ins. Try again in {n} minutes.')
}
