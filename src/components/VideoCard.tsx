import { useEffect, useRef, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/auth-context'
import { useProfile } from '../hooks/useProfile'
import { useVideoActions } from '../hooks/useVideoActions'
import ActionRail from './ActionRail'
import CommentSheet from './CommentSheet'
import type { FeedVideo } from '../hooks/useFeed'

interface VideoCardProps {
  video: FeedVideo
  active: boolean
  onCompleted: (videoId: string) => void
}

export default function VideoCard({ video, active, onCompleted }: VideoCardProps) {
  const { user } = useAuth()
  const author = useProfile(video.authorId)
  const actions = useVideoActions()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [likeCount, setLikeCount] = useState(video.likeCount)
  const [favoriteCount, setFavoriteCount] = useState(video.favoriteCount)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Initial like / favorite state for the current user.
  useEffect(() => {
    if (!user) return
    let active2 = true
    Promise.all([
      getDoc(doc(db, 'likes', `${user.uid}_${video.id}`)),
      getDoc(doc(db, 'favorites', `${user.uid}_${video.id}`)),
    ]).then(([likeSnap, favSnap]) => {
      if (!active2) return
      setLiked(likeSnap.exists())
      setFavorited(favSnap.exists())
      // Server-rolled counts (M5) don't yet include this user's own like/favorite,
      // so reflect it in the displayed count. Absolute set keeps this idempotent.
      setLikeCount(video.likeCount + (likeSnap.exists() ? 1 : 0))
      setFavoriteCount(video.favoriteCount + (favSnap.exists() ? 1 : 0))
    })
    return () => {
      active2 = false
    }
  }, [user, video.id, video.likeCount, video.favoriteCount])

  // Autoplay the active card; pause + rewind the rest. `playing` state is driven
  // by the element's own play/pause events (below), not set here.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (active) {
      el.currentTime = 0
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [active])

  function togglePlay() {
    const el = videoRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1600)
  }

  async function handleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)))
    try {
      await actions.setLiked(video, next)
    } catch {
      setLiked(!next)
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)))
      showToast('Could not update like')
    }
  }

  async function handleFavorite() {
    const next = !favorited
    setFavorited(next)
    setFavoriteCount((c) => Math.max(0, c + (next ? 1 : -1)))
    try {
      await actions.setFavorited(video, next)
      showToast(next ? 'Saved to favorites' : 'Removed from favorites')
    } catch {
      setFavorited(!next)
      setFavoriteCount((c) => Math.max(0, c + (next ? -1 : 1)))
      showToast('Could not update favorite')
    }
  }

  async function handleShare() {
    // A share tap is itself the signal — record it regardless of whether the
    // native share sheet / clipboard is available in this environment.
    actions.share(video).catch(() => {})
    const url = `${window.location.origin}/feed`
    try {
      if (navigator.share) {
        await navigator.share({ title: video.caption || 'Check this out', url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        showToast('Link copied')
      }
    } catch {
      // user dismissed the share sheet / clipboard blocked — no-op
    }
  }

  function handleEnded() {
    onCompleted(video.id)
    const el = videoRef.current
    if (el && active) {
      el.currentTime = 0
      el.play().catch(() => {})
    }
  }

  return (
    <div className="video-card">
      <video
        ref={videoRef}
        className="video-el"
        src={video.videoURL}
        poster={video.thumbnailURL ?? undefined}
        muted={muted}
        playsInline
        preload="auto"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
      />

      {!playing && (
        <button type="button" className="play-indicator" onClick={togglePlay} aria-label="Play">
          ▶
        </button>
      )}

      <button
        type="button"
        className="mute-toggle"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <ActionRail
        liked={liked}
        favorited={favorited}
        likeCount={likeCount}
        commentCount={video.commentCount}
        favoriteCount={favoriteCount}
        shareCount={video.shareCount}
        onLike={handleLike}
        onComment={() => setCommentsOpen(true)}
        onFavorite={handleFavorite}
        onShare={handleShare}
      />

      <div className="video-overlay">
        <p className="video-author">@{author?.handle ?? '…'}</p>
        {video.caption && <p className="video-caption">{video.caption}</p>}
        {video.hashtags.length > 0 && (
          <p className="video-tags">{video.hashtags.map((t) => `#${t}`).join(' ')}</p>
        )}
      </div>

      {toast && <div className="video-toast">{toast}</div>}

      <CommentSheet video={video} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </div>
  )
}
