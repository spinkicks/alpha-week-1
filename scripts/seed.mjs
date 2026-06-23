// Seed script — populates Firestore with sample creators + "live" videos so the
// For You feed is functional before the M3 upload flow exists.
//
// Usage:  node scripts/seed.mjs
//
// It reads the web config from .env.local, signs in (or creates) each seed
// creator, writes their profile + handle, then writes their sample videos with
// deterministic IDs (idempotent — re-running skips videos that already exist).
// Creator auth accounts are deleted at the end; their profile/video docs remain
// as seed content. All writes go through the same client SDK + security rules
// the app uses, so this also exercises the rules.

import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

function loadEnv() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const env = loadEnv()
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const poster = (slug) => `https://picsum.photos/seed/${slug}/400/700`

const CREATORS = [
  {
    email: 'seed.alphacreator@alpha.local',
    password: 'seedpass123',
    handle: 'alphacreator',
    displayName: 'Alpha Creator',
    bio: 'Sample creator for the alpha feed.',
    videos: [
      { slug: 'bunny-trailer', url: 'https://media.w3.org/2010/05/bunny/trailer.mp4', caption: 'Bunny vibes only 🐰', hashtags: ['animation', 'shortfilm'] },
      { slug: 'bunny-movie', url: 'https://media.w3.org/2010/05/bunny/movie.mp4', caption: 'The full bunny experience 🎬', hashtags: ['animation', 'classic'] },
      { slug: 'bbb-quick', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4', caption: 'Quick clip energy ⚡', hashtags: ['shortfilm', 'loop'] },
      { slug: 'bbb-blender', url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4', caption: 'Open-source animation 💛', hashtags: ['blender', 'opensource'] },
    ],
  },
  {
    email: 'seed.naturepix@alpha.local',
    password: 'seedpass123',
    handle: 'naturepix',
    displayName: 'Nature Pix',
    bio: 'Sample creator for the alpha feed.',
    videos: [
      { slug: 'sintel-trailer', url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', caption: 'Epic fantasy feels ⚔️', hashtags: ['fantasy', 'animation'] },
      { slug: 'sintel-hd', url: 'https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4', caption: 'Sintel in HD 🗡️', hashtags: ['fantasy', 'hd'] },
      { slug: 'jellyfish', url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4', caption: 'Ocean calm 🪼', hashtags: ['nature', 'ocean'] },
      { slug: 'throwback', url: 'https://media.w3.org/2010/05/video/movie_300.mp4', caption: 'Throwback reel 📼', hashtags: ['retro', 'clip'] },
    ],
  },
]

async function ensureSignedIn(auth, email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred.user
  } catch {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    return cred.user
  }
}

async function ensureProfile(db, user, creator) {
  const userRef = doc(db, 'users', user.uid)
  const snap = await getDoc(userRef)
  if (snap.exists()) return
  await runTransaction(db, async (tx) => {
    const handleRef = doc(db, 'handles', creator.handle)
    const handleSnap = await tx.get(handleRef)
    if (!handleSnap.exists()) tx.set(handleRef, { uid: user.uid })
    tx.set(userRef, {
      handle: creator.handle,
      displayName: creator.displayName,
      avatarURL: null,
      bio: creator.bio,
      followerCount: 0,
      followingCount: 0,
      birthdate: '1995-01-01',
      createdAt: serverTimestamp(),
    })
  })
}

async function ensureVideo(db, user, sample) {
  const id = `seed-${sample.slug}`
  const ref = doc(db, 'videos', id)
  const snap = await getDoc(ref)
  if (snap.exists()) return { id, created: false }
  await setDoc(ref, {
    authorId: user.uid,
    videoURL: sample.url,
    thumbnailURL: poster(sample.slug),
    caption: sample.caption,
    hashtags: sample.hashtags,
    likeCount: 0,
    commentCount: 0,
    favoriteCount: 0,
    shareCount: 0,
    viewCount: 0,
    engagementScore: 0,
    status: 'live',
    createdAt: serverTimestamp(),
  })
  return { id, created: true }
}

async function main() {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  let created = 0
  let skipped = 0
  for (const creator of CREATORS) {
    const user = await ensureSignedIn(auth, creator.email, creator.password)
    await ensureProfile(db, user, creator)
    for (const sample of creator.videos) {
      const res = await ensureVideo(db, user, sample)
      res.created ? created++ : skipped++
      console.log(`  ${res.created ? '+ created' : '· exists '}  ${res.id}  (@${creator.handle})`)
    }
    // Remove the seed login; the profile + video docs remain as content.
    await user.delete().catch(() => {})
  }
  console.log(`\nDone. ${created} created, ${skipped} already existed.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
