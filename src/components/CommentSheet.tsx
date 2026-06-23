import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { fetchProfile } from '../lib/users'
import { useVideoActions } from '../hooks/useVideoActions'
import type { CommentDoc } from '../lib/types'
import type { FeedVideo } from '../hooks/useFeed'

type CommentRow = CommentDoc & { id: string }

interface CommentSheetProps {
  video: FeedVideo
  open: boolean
  onClose: () => void
}

/** Bottom-sheet list of a video's comments + an input to add one. */
export default function CommentSheet({ video, open, onClose }: CommentSheetProps) {
  const { addComment } = useVideoActions()
  const [comments, setComments] = useState<CommentRow[]>([])
  const [handles, setHandles] = useState<Record<string, string>>({})
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const q = query(
      collection(db, 'videos', video.id, 'comments'),
      orderBy('createdAt', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as CommentDoc) })))
    })
  }, [open, video.id])

  // Resolve author handles for any comment authors we haven't seen yet.
  useEffect(() => {
    const missing = [...new Set(comments.map((c) => c.authorId))].filter(
      (id) => !(id in handles),
    )
    if (missing.length === 0) return
    let active = true
    Promise.all(
      missing.map((id) =>
        fetchProfile(id).then((p) => [id, p?.handle ?? 'unknown'] as const),
      ),
    ).then((pairs) => {
      if (active) setHandles((h) => ({ ...h, ...Object.fromEntries(pairs) }))
    })
    return () => {
      active = false
    }
  }, [comments, handles])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await addComment(video, trimmed)
      setText('')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <b>{comments.length === 1 ? '1 comment' : `${comments.length} comments`}</b>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="sheet-list">
          {comments.length === 0 && (
            <p className="sheet-empty">No comments yet. Be the first!</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <span className="comment-author">@{handles[c.authorId] ?? '…'}</span>
              <span className="comment-text">{c.text}</span>
            </div>
          ))}
        </div>

        <form className="sheet-input" onSubmit={submit}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            aria-label="Add a comment"
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()}>
            Post
          </button>
        </form>
      </div>
    </div>
  )
}
