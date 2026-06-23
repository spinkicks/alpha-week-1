import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { Profile } from '../lib/types'

export interface SignUpInput {
  email: string
  password: string
  handle: string
  displayName: string
  birthdate: string // ISO yyyy-mm-dd
}

export interface AuthContextValue {
  /** Firebase auth user, or null when signed out. */
  user: User | null
  /** The user's Firestore profile doc, or null if signed out / not yet loaded. */
  profile: Profile | null
  /** True until the initial auth + profile state has resolved. */
  initializing: boolean
  signUp: (input: SignUpInput) => Promise<void>
  logIn: (email: string, password: string) => Promise<void>
  logOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
