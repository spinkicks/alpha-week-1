# Build Plan — Short-form Video Platform (MVP)

**Companion to:** PRD v0.1
**Status:** Draft v0.1 — for review
**Last updated:** 2026-06-22

This is a concrete, file-level implementation plan for the MVP described in the PRD. It maps the
6 PRD milestones to actual files, data structures, and Cloud Functions, calls out the cost/perf
traps in a Firestore-based design, and lists the decisions still needed from the owner.

---

## 0. Locked decisions & assumptions

| Decision | Choice | Source |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript (already scaffolded) | repo |
| Backend | Firebase BaaS (Auth, Firestore, Functions, Storage, Hosting) | PRD §8 |
| Video delivery (MVP) | **Raw Firebase Storage** — direct upload + serve. Transcoding/CDN deferred. | owner decision |
| Recommendation | Engagement-score heuristic, server-computed. No ML in v1. | PRD §7 |
| Auth | **Email/password only** for v1. No OAuth. (Revisit Google/Apple post-MVP.) | owner decision |
| Billing | **Blaze plan** active. Build against the live project (no emulator detour). | owner decision |
| State layer | React Context + hooks (no Redux). Add Zustand only if Context churns. | PRD §8 |
| Routing | React Router v7 | PRD §8 |

**Assumptions to confirm** (see §9): no Firebase project exists yet; Cloud Functions require the
**Blaze (pay-as-you-go)** plan; "raw Storage" means no adaptive bitrate, so we cap upload size/
duration aggressively to keep playback acceptable.

---

## 1. Dependencies to add

```
# runtime
firebase                      # client SDK (auth, firestore, storage)
react-router-dom              # routing
react-firebase-hooks          # optional: tidy auth/firestore subscriptions

# dev / tooling
firebase-tools                # CLI (global or devDep) — init already attempted
```

Cloud Functions live in `/functions` with their own `package.json`:
```
firebase-admin
firebase-functions
```

---

## 2. Target directory structure

```
/                       # Vite app root (existing)
  firebase.json         # hosting + emulators + functions config   [NEW]
  .firebaserc           # project alias                            [NEW]
  firestore.rules       # security rules                           [NEW]
  firestore.indexes.json# composite indexes                        [NEW]
  storage.rules         # storage security rules                   [NEW]
  /docs
    BUILD_PLAN.md       # this file
  /src
    /lib
      firebase.ts       # SDK init (reads import.meta.env)          [NEW]
      types.ts          # shared Firestore document types           [NEW]
    /context
      AuthContext.tsx   # current user, auth state, sign in/out     [NEW]
    /hooks
      useFeed.ts        # candidate fetch + client-side ranking     [NEW]
      useVideoActions.ts# like/favorite/comment/share/report        [NEW]
      useUpload.ts      # storage upload + doc create                [NEW]
    /components
      AppShell.tsx      # nav + outlet (mobile-first)                [NEW]
      VideoCard.tsx     # single video w/ playback + action rail     [NEW]
      ActionRail.tsx    # like/comment/favorite/share buttons        [NEW]
      CommentSheet.tsx  # comments drawer                            [NEW]
      ProtectedRoute.tsx# gate routes behind auth                    [NEW]
    /pages
      Landing.tsx
      SignUp.tsx        # includes age gate                          [NEW]
      Login.tsx
      ForYouFeed.tsx    # personalized feed                          [NEW]
      FollowingFeed.tsx
      Upload.tsx
      Profile.tsx       # own + others'                              [NEW]
      Search.tsx
      Hashtag.tsx
    /utils
      validation.ts     # upload + form validation                   [NEW]
      affinity.ts       # client-side final personalization helpers   [NEW]
  /functions            # Cloud Functions (gen 2)                    [NEW]
    /src
      index.ts
      engagement.ts     # rolling score aggregation (scheduled)
      affinity.ts       # per-user affinity updates (triggered)
      fanout.ts         # follow edge / counter maintenance
      onUpload.ts       # thumbnail/validation + moderation hook
      moderation.ts     # report handling + auto-screen stub
```

---

## 3. Data model (`src/lib/types.ts` + Firestore)

```ts
// users/{uid}
interface UserDoc {
  handle: string;            // unique, lowercased; enforced via /handles/{handle}
  displayName: string;
  avatarURL: string | null;
  bio: string;
  followerCount: number;
  followingCount: number;
  birthdate: string;         // ISO; used for age gate, NOT shown publicly
  createdAt: Timestamp;
}

// videos/{videoId}
interface VideoDoc {
  authorId: string;
  videoURL: string;          // Storage download URL
  thumbnailURL: string | null;
  caption: string;
  hashtags: string[];        // lowercased, no '#'
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  shareCount: number;
  viewCount: number;
  engagementScore: number;   // computed server-side, recency-decayed
  status: 'processing' | 'live' | 'removed';
  createdAt: Timestamp;
}

// videos/{videoId}/comments/{commentId}
interface CommentDoc { authorId: string; text: string; createdAt: Timestamp; }

// follows/{followerId}_{followeeId}  -> { followerId, followeeId, createdAt }
// likes/{uid}_{videoId}             -> { uid, videoId, createdAt }
// favorites/{uid}_{videoId}         -> { uid, videoId, createdAt }

// engagementEvents/{autoId}  (append-only; consumed by Functions)
interface EngagementEvent {
  uid: string; videoId: string;
  type: 'view' | 'like' | 'unlike' | 'comment' | 'favorite' | 'share' | 'skip';
  watchMs?: number; completed?: boolean;
  hashtags: string[]; authorId: string;   // denormalized so affinity fn avoids extra reads
  createdAt: Timestamp;
}

// userAffinities/{uid} -> { hashtags: {tag: score}, creators: {authorId: score}, updatedAt }

// reports/{autoId} -> { reporterId, targetType: 'video'|'comment', targetId, reason, status, createdAt }
// handles/{handle} -> { uid }   // uniqueness guard, created transactionally at signup
```

**Composite indexes needed** (`firestore.indexes.json`):
- `videos` by `status == 'live'` ordered by `engagementScore desc` (cold-start/global feed)
- `videos` by `authorId` ordered by `createdAt desc` (profile grid)
- `videos` array-contains `hashtags` ordered by `engagementScore desc` (hashtag page)

---

## 4. Cost & correctness traps (design these in from day 1)

1. **Counter hot-spots.** `likeCount`/`viewCount` on a viral video = a single hot document.
   - Writes go to `engagementEvents` (append-only, no contention). A Function rolls them up into
     counts + `engagementScore`. Client reads the rolled-up number; it does **not** increment the
     video doc on every like. Avoids the "1 write/sec per doc" ceiling and runaway write costs.
2. **Feed read cost.** Never scan all videos per request. Cold-start = single indexed query on
   `engagementScore desc` (bounded, e.g. 50 docs). Personalization re-ranks that small candidate
   set **client-side** using `userAffinities/{uid}` (one read). Bounded reads per feed page.
3. **Follow fan-out.** MVP uses a **read-time** Following feed (query `follows` where
   `followerId == me`, then fetch recent videos) rather than write-time fan-out into per-user
   inboxes. Cheaper to build; revisit if a user follows thousands.
4. **Storage egress.** Raw Storage has no CDN tier by default and bills egress per GB. Mitigate by
   capping duration (~≤60s) and size (~≤50MB), and generating a lightweight poster thumbnail so the
   grid/feed previews don't pull full video.

---

## 5. Milestone-by-milestone plan

### M1 — Foundation  ✅ Built & verified end-to-end against the live `alpha-week-1` project
- Finish `firebase init` (Firestore, Functions, Storage, Hosting, Emulators) → creates config files.
- `src/lib/firebase.ts`: init from `import.meta.env.VITE_FIREBASE_*` (keys in `.env.local`, gitignored).
- `AuthContext` + `ProtectedRoute`; router with public (Landing/Login/SignUp) vs gated routes.
- `SignUp` with **age gate**: collect birthdate, block <13, store `birthdate`. Transactional handle
  reservation via `/handles/{handle}`.
- `firestore.rules` v1: users can read public docs, write only their own; `engagementEvents`
  create-only; reports create-only.
- **Done when:** a real user can sign up (email/password), gets a profile doc, and lands in an
  empty authenticated shell.

### M2 — Consumption loop
- `VideoCard` (HTML5 `<video>`, autoplay on in-view via `IntersectionObserver`, tap-to-pause,
  next-clip preload), `ActionRail`, `CommentSheet`.
- `useVideoActions`: writes like/favorite/comment + emits `engagementEvents` (incl. `watchMs`,
  `completed`, `skip`).
- `ForYouFeed` renders a vertical snap-scroll of candidate videos (seeded from manually uploaded
  sample docs until M3 exists).
- **Done when:** feed plays smoothly, all 4 actions persist, every interaction emits an event.

### M3 — Creation loop
- `useUpload` + `Upload.tsx`: file picker → `validation.ts` (format/size/duration) → upload to
  `videos/{uid}/{videoId}` in Storage → create `videos/{videoId}` with `status:'processing'`.
- `onUpload` Function: generate thumbnail, run moderation stub, flip `status` to `'live'`.
- Profile grid lists the author's `live` videos.
- **Done when:** an uploaded clip appears on the profile and enters the candidate pool.

### M4 — Discovery & social
- Follow/unfollow (`fanout` Function maintains follower/following counts via `follows` triggers).
- `FollowingFeed` (read-time query). `Search` over handles/captions/hashtags
  (prefix search on lowercased fields; consider a search-keywords array for caption tokens).
- `Hashtag.tsx` page.
- **Done when:** users can follow, see a Following feed, and find content via search + hashtags.

### M5 — Recommendation v1
- `engagement.ts` (scheduled, e.g. every 10 min): aggregate recent `engagementEvents` per video →
  update counts + recency-decayed `engagementScore` normalized by impressions.
- `affinity.ts` (triggered on `engagementEvents`): increment `userAffinities/{uid}` for the video's
  hashtags + author; decay over time.
- `useFeed` candidate strategy: global top-N by score → client re-rank with affinity boosts +
  followed-creator mix + an exploration slice (`utils/affinity.ts`). Cold-start = pure global score.
- **Done when:** completion rate for a returning user's feed measurably beats the cold-start feed.

### M6 — Trust & safety + launch readiness
- Report flow on every video + comment (`reports` collection) → `moderation.ts` queue.
- Auto-screen hook on upload (moderation API or Cloud Video Intelligence) before `status:'live'`.
- Harden `firestore.rules` / `storage.rules`; community guidelines page + takedown path.
- Compliance checklist: COPPA (<13 block already in M1), 13–17 handling, app-store age rating,
  GDPR/CCPA data-export/delete. **Legal review before public launch.**
- **Done when:** every piece of UGC is reportable, uploads are screened, rules deny-by-default.

---

## 6. Recommendation v1 — scoring sketch

```
engagementScore(video) =
   w_complete * completionRate
 + w_like     * likes/impressions
 + w_cmt      * comments/impressions
 + w_fav      * favorites/impressions
 + w_share    * shares/impressions
 - w_skip     * skips/impressions
   , all multiplied by recencyDecay(ageHours)   // e.g. exp(-age / halfLife)
```
Client final rank = `engagementScore * (1 + affinityBoost(hashtags,author))`, then splice in a
fixed exploration fraction (random/new-creator picks) so users aren't trapped and new uploads get
impressions. Weights live in one config object so they're tunable without code changes elsewhere.

---

## 7. Risks carried from PRD

| Risk | Plan-level mitigation |
|---|---|
| Video cost/perf (raw Storage, no CDN) | Hard caps on size/duration; thumbnails; revisit Mux/Cloudflare before scale. **Accepted for MVP.** |
| Moderation at scale | Auto-screen on upload + report queue from M6; manual review only as backstop. |
| Cold-start quality | Global trending feed must feel good day one; exploration slice seeds learning. |
| Firestore ranking cost | Bounded candidate query + client re-rank; no full scans. |
| Minor safety / compliance | Age gate in M1; full compliance pass + legal review in M6 (launch-blocking). |

---

## 8. This week (suggested order for M1)

1. Confirm/create Firebase project, upgrade to Blaze, finish `firebase init`.
2. Install deps; add `src/lib/firebase.ts` + `.env.local` (+ `.env.example`).
3. `types.ts`, `AuthContext`, router + `AppShell` + `ProtectedRoute`.
4. `SignUp` (age gate + handle reservation), `Login`, minimal `Profile`.
5. `firestore.rules` v1 + emulator smoke test.

## 9. Open decisions needed from owner

1. ~~Firebase project / billing~~ — **RESOLVED:** Blaze active. Need project ID + web app config.
2. ~~OAuth~~ — **RESOLVED:** Email/password only. No OAuth in v1.
3. **Upload limits**: confirm max duration/size (proposed ≤60s / ≤50MB).
4. **Moderation provider**: Google Cloud Video Intelligence vs a third-party API (cost/latency).
