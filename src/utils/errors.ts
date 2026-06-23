import { FirebaseError } from 'firebase/app'

/** Map an unknown error (Firebase or otherwise) to a friendly, user-facing message. */
export function describeError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/email-already-in-use':
        return 'An account with that email already exists.'
      case 'auth/invalid-email':
        return 'That email address looks invalid.'
      case 'auth/missing-password':
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.'
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.'
      default:
        return err.message
    }
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}
