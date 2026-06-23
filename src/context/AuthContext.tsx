import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { Profile, UserDoc } from '../lib/types'
import { assertValidAge, normalizeHandle, validateHandle } from '../utils/validation'
import { AuthContext } from './auth-context'
import type { SignUpInput } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [initializing, setInitializing] = useState(true)

  // Track the Firebase auth session.
  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      if (!next) {
        setProfile(null)
        setInitializing(false)
      }
    })
  }, [])

  // Live-subscribe to the signed-in user's profile document.
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(snap.exists() ? { uid: user.uid, ...(snap.data() as UserDoc) } : null)
        setInitializing(false)
      },
      () => setInitializing(false),
    )
    return unsub
  }, [user])

  async function signUp(input: SignUpInput) {
    const handle = normalizeHandle(input.handle)
    validateHandle(handle) // throws on invalid handle
    assertValidAge(input.birthdate) // throws if under 13 / invalid
    const displayName = input.displayName.trim()
    if (!displayName) throw new Error('Display name is required.')

    const cred = await createUserWithEmailAndPassword(auth, input.email, input.password)
    try {
      await runTransaction(db, async (tx) => {
        const handleRef = doc(db, 'handles', handle)
        const handleSnap = await tx.get(handleRef)
        if (handleSnap.exists()) throw new Error('handle-taken')

        const userRef = doc(db, 'users', cred.user.uid)
        tx.set(handleRef, { uid: cred.user.uid })
        tx.set(userRef, {
          handle,
          displayName,
          avatarURL: null,
          bio: '',
          followerCount: 0,
          followingCount: 0,
          birthdate: input.birthdate,
          createdAt: serverTimestamp(),
        })
      })
    } catch (err) {
      // Roll back the orphaned auth account so the email/handle can be reused.
      await deleteUser(cred.user).catch(() => {})
      if (err instanceof Error && err.message === 'handle-taken') {
        throw new Error('That handle is already taken. Try another.', { cause: err })
      }
      throw err
    }
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logOut() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, profile, initializing, signUp, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}
