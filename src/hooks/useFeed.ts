import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { VideoDoc } from '../lib/types'

export type FeedVideo = VideoDoc & { id: string }

/**
 * MVP "For You" candidate query: live videos ranked by engagement score
 * (the cold-start / global feed). Uses the deployed composite index
 * (status ASC, engagementScore DESC). Personalization is layered on in M5.
 */
export function useFeed(max = 20) {
  const [videos, setVideos] = useState<FeedVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query(
      collection(db, 'videos'),
      where('status', '==', 'live'),
      orderBy('engagementScore', 'desc'),
      limit(max),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVideos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as VideoDoc) })))
        setLoading(false)
      },
      (e) => {
        setError(e.message)
        setLoading(false)
      },
    )
    return unsub
  }, [max])

  return { videos, loading, error }
}
