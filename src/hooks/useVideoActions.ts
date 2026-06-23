import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/auth-context'
import type { EngagementType } from '../lib/types'
import type { FeedVideo } from './useFeed'

/**
 * Persists user interactions and emits an append-only engagement event for each
 * one. Counts/scores on the video doc are rolled up server-side (M5); these
 * writes are the raw signal + the like/favorite join records.
 */
export function useVideoActions() {
  const { user } = useAuth()

  async function recordEngagement(
    video: FeedVideo,
    type: EngagementType,
    extra?: { watchMs?: number; completed?: boolean },
  ) {
    if (!user) return
    await addDoc(collection(db, 'engagementEvents'), {
      uid: user.uid,
      videoId: video.id,
      type,
      hashtags: video.hashtags ?? [],
      authorId: video.authorId,
      ...(extra?.watchMs != null ? { watchMs: extra.watchMs } : {}),
      ...(extra?.completed != null ? { completed: extra.completed } : {}),
      createdAt: serverTimestamp(),
    })
  }

  async function setLiked(video: FeedVideo, liked: boolean) {
    if (!user) return
    const ref = doc(db, 'likes', `${user.uid}_${video.id}`)
    if (liked) {
      await setDoc(ref, { uid: user.uid, videoId: video.id, createdAt: serverTimestamp() })
    } else {
      await deleteDoc(ref)
    }
    await recordEngagement(video, liked ? 'like' : 'unlike')
  }

  async function setFavorited(video: FeedVideo, favorited: boolean) {
    if (!user) return
    const ref = doc(db, 'favorites', `${user.uid}_${video.id}`)
    if (favorited) {
      await setDoc(ref, { uid: user.uid, videoId: video.id, createdAt: serverTimestamp() })
    } else {
      await deleteDoc(ref)
    }
    // 'favorite' is a positive signal; removal isn't separately tracked in v1.
    if (favorited) await recordEngagement(video, 'favorite')
  }

  async function addComment(video: FeedVideo, text: string) {
    if (!user) return
    const trimmed = text.trim()
    if (!trimmed) return
    await addDoc(collection(db, 'videos', video.id, 'comments'), {
      authorId: user.uid,
      text: trimmed,
      createdAt: serverTimestamp(),
    })
    await recordEngagement(video, 'comment')
  }

  async function share(video: FeedVideo) {
    await recordEngagement(video, 'share')
  }

  return { recordEngagement, setLiked, setFavorited, addComment, share }
}
