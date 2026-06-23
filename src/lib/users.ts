import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Profile, UserDoc } from './types'

// Process-lifetime cache so author handles aren't re-fetched per video card.
const cache = new Map<string, Promise<Profile | null>>()

export function fetchProfile(uid: string): Promise<Profile | null> {
  let pending = cache.get(uid)
  if (!pending) {
    pending = getDoc(doc(db, 'users', uid)).then((snap) =>
      snap.exists() ? { uid, ...(snap.data() as UserDoc) } : null,
    )
    cache.set(uid, pending)
  }
  return pending
}
