import { useState } from 'react'
import { useAuth } from '../context/auth-context'
import { describeError } from '../utils/errors'

export default function Profile() {
  const { profile, logOut } = useAuth()
  const [error, setError] = useState<string | null>(null)

  if (!profile) return <div className="screen-center">Loading profile…</div>

  const joined = profile.createdAt
    ? profile.createdAt.toDate().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      })
    : '…'
  const initial = (profile.displayName || profile.handle).charAt(0).toUpperCase()

  async function onLogOut() {
    setError(null)
    try {
      await logOut()
    } catch (err) {
      setError(describeError(err))
    }
  }

  return (
    <>
      <div className="topbar">
        <h2>Profile</h2>
        <button className="btn btn-ghost" type="button" onClick={onLogOut}>
          Log out
        </button>
      </div>

      <div className="profile">
        <div className="avatar" aria-hidden="true">
          {initial}
        </div>

        <div className="identity">
          <h1>{profile.displayName}</h1>
          <p className="handle">@{profile.handle}</p>
        </div>

        <div className="stats">
          <div className="stat">
            <b>{profile.followerCount}</b>
            <span>Followers</span>
          </div>
          <div className="stat">
            <b>{profile.followingCount}</b>
            <span>Following</span>
          </div>
        </div>

        {profile.bio && <p className="bio">{profile.bio}</p>}
        <p className="bio">Joined {joined}</p>

        {error && <div className="error">{error}</div>}
      </div>
    </>
  )
}
