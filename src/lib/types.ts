import type { Timestamp } from 'firebase/firestore'

/** users/{uid} */
export interface UserDoc {
  handle: string // unique, lowercased; enforced via /handles/{handle}
  displayName: string
  avatarURL: string | null
  bio: string
  followerCount: number
  followingCount: number
  birthdate: string // ISO yyyy-mm-dd; used for age gate, never shown publicly
  createdAt: Timestamp | null // null briefly while serverTimestamp() resolves
}

/** A UserDoc paired with its document id. */
export type Profile = UserDoc & { uid: string }

export type VideoStatus = 'processing' | 'live' | 'removed'

/** videos/{videoId} */
export interface VideoDoc {
  authorId: string
  videoURL: string
  thumbnailURL: string | null
  caption: string
  hashtags: string[] // lowercased, no leading '#'
  likeCount: number
  commentCount: number
  favoriteCount: number
  shareCount: number
  viewCount: number
  engagementScore: number // computed server-side, recency-decayed
  status: VideoStatus
  createdAt: Timestamp | null
}

/** videos/{videoId}/comments/{commentId} */
export interface CommentDoc {
  authorId: string
  text: string
  createdAt: Timestamp | null
}

export type EngagementType =
  | 'view'
  | 'like'
  | 'unlike'
  | 'comment'
  | 'favorite'
  | 'share'
  | 'skip'

/** engagementEvents/{autoId} — append-only, consumed by Cloud Functions. */
export interface EngagementEvent {
  uid: string
  videoId: string
  type: EngagementType
  watchMs?: number
  completed?: boolean
  hashtags: string[] // denormalized so the affinity function avoids extra reads
  authorId: string
  createdAt: Timestamp | null
}

/** userAffinities/{uid} */
export interface UserAffinities {
  hashtags: Record<string, number>
  creators: Record<string, number>
  updatedAt: Timestamp | null
}

export type ReportTargetType = 'video' | 'comment'
export type ReportStatus = 'open' | 'reviewing' | 'actioned' | 'dismissed'

/** reports/{autoId} */
export interface ReportDoc {
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  reason: string
  status: ReportStatus
  createdAt: Timestamp | null
}
