export const MIN_AGE = 13
export const MAX_AGE = 120

const HANDLE_RE = /^[a-z0-9_]{3,20}$/

/** Lowercase, trim, and strip a leading '@' so handles are stored canonically. */
export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, '')
}

/** Throws a user-facing error if the (already normalized) handle is invalid. */
export function validateHandle(handle: string): void {
  if (!HANDLE_RE.test(handle)) {
    throw new Error(
      'Handle must be 3–20 characters: lowercase letters, numbers, or underscores.',
    )
  }
}

/** Whole years between birthdate and `now`. Returns NaN for an unparseable date. */
export function ageFromBirthdate(birthdate: string, now: Date = new Date()): number {
  const dob = new Date(birthdate)
  if (Number.isNaN(dob.getTime())) return Number.NaN
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--
  return age
}

/** Age gate (COPPA): throws if the birthdate is invalid or under MIN_AGE. */
export function assertValidAge(birthdate: string): void {
  const age = ageFromBirthdate(birthdate)
  if (Number.isNaN(age) || age > MAX_AGE) {
    throw new Error('Please enter a valid birthdate.')
  }
  if (age < MIN_AGE) {
    throw new Error(`You must be at least ${MIN_AGE} years old to sign up.`)
  }
}
