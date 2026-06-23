import { useCallback, useEffect, useRef, useState } from 'react'
import VideoCard from '../components/VideoCard'
import { useFeed } from '../hooks/useFeed'
import type { FeedVideo } from '../hooks/useFeed'
import { useVideoActions } from '../hooks/useVideoActions'

// A swipe-away shorter than this counts as a skip (negative signal) rather than a view.
const SKIP_MS = 1500

export default function ForYouFeed() {
  const { videos, loading, error } = useFeed()
  const { recordEngagement } = useVideoActions()
  const [activeId, setActiveId] = useState<string | null>(null)

  const slideRefs = useRef<Map<string, HTMLElement>>(new Map())
  const watchRef = useRef<{ video: FeedVideo; start: number; completed: boolean } | null>(null)

  // Emit the watch event for the video we're leaving.
  const flushWatch = useCallback(() => {
    const w = watchRef.current
    if (!w) return
    const watchMs = Math.round(performance.now() - w.start)
    const type = watchMs < SKIP_MS && !w.completed ? 'skip' : 'view'
    recordEngagement(w.video, type, { watchMs, completed: w.completed }).catch(() => {})
    watchRef.current = null
  }, [recordEngagement])

  // On active change, flush the previous video's watch and start tracking the new one.
  useEffect(() => {
    flushWatch()
    const next = videos.find((v) => v.id === activeId)
    if (next) watchRef.current = { video: next, start: performance.now(), completed: false }
    // Intentionally only re-run when the active video changes; feed snapshot
    // updates (e.g. count changes) must not reset the in-progress watch timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  // Flush when the tab is hidden or the feed unmounts.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) flushWatch()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      flushWatch()
    }
  }, [flushWatch])

  // Track which slide is in view.
  useEffect(() => {
    if (videos.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (top && top.intersectionRatio >= 0.6) {
          const id = (top.target as HTMLElement).dataset.id
          if (id) setActiveId(id)
        }
      },
      { threshold: [0.6] },
    )
    slideRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [videos])

  const setSlideRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) slideRefs.current.set(id, el)
      else slideRefs.current.delete(id)
    },
    [],
  )

  const handleCompleted = useCallback((videoId: string) => {
    if (watchRef.current && watchRef.current.video.id === videoId) {
      watchRef.current.completed = true
    }
  }, [])

  if (loading) return <div className="screen-center">Loading feed…</div>
  if (error) {
    return (
      <div className="screen-center">
        <h2>Couldn’t load the feed</h2>
        <p className="hint">{error}</p>
      </div>
    )
  }
  if (videos.length === 0) {
    return (
      <div className="screen-center">
        <h2>No videos yet</h2>
        <p>Check back soon.</p>
      </div>
    )
  }

  return (
    <div className="feed">
      {videos.map((video) => (
        <section
          key={video.id}
          className="slide"
          data-id={video.id}
          ref={setSlideRef(video.id)}
        >
          <VideoCard
            video={video}
            active={video.id === activeId}
            onCompleted={handleCompleted}
          />
        </section>
      ))}
    </div>
  )
}
