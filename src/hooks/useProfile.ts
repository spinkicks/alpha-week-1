import { useEffect, useState } from 'react'
import { fetchProfile } from '../lib/users'
import type { Profile } from '../lib/types'

/** Resolves a user's public profile (cached), e.g. to show a video author's handle. */
export function useProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!uid) return
    let active = true
    fetchProfile(uid).then((p) => {
      if (active) setProfile(p)
    })
    return () => {
      active = false
    }
  }, [uid])

  return profile
}
