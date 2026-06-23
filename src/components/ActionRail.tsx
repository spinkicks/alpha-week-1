function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

interface ActionRailProps {
  liked: boolean
  favorited: boolean
  likeCount: number
  commentCount: number
  favoriteCount: number
  shareCount: number
  onLike: () => void
  onComment: () => void
  onFavorite: () => void
  onShare: () => void
}

/** Right-side rail of engagement controls overlaid on a video. */
export default function ActionRail({
  liked,
  favorited,
  likeCount,
  commentCount,
  favoriteCount,
  shareCount,
  onLike,
  onComment,
  onFavorite,
  onShare,
}: ActionRailProps) {
  return (
    <div className="action-rail">
      <button
        type="button"
        className={liked ? 'rail-btn active' : 'rail-btn'}
        onClick={onLike}
        aria-pressed={liked}
        aria-label="Like"
      >
        <span className="rail-icon">{liked ? '♥' : '♡'}</span>
        <span className="rail-count">{formatCount(likeCount)}</span>
      </button>

      <button type="button" className="rail-btn" onClick={onComment} aria-label="Comments">
        <span className="rail-icon">💬</span>
        <span className="rail-count">{formatCount(commentCount)}</span>
      </button>

      <button
        type="button"
        className={favorited ? 'rail-btn active' : 'rail-btn'}
        onClick={onFavorite}
        aria-pressed={favorited}
        aria-label="Favorite"
      >
        <span className="rail-icon">{favorited ? '★' : '☆'}</span>
        <span className="rail-count">{formatCount(favoriteCount)}</span>
      </button>

      <button type="button" className="rail-btn" onClick={onShare} aria-label="Share">
        <span className="rail-icon">↗</span>
        <span className="rail-count">{formatCount(shareCount)}</span>
      </button>
    </div>
  )
}
