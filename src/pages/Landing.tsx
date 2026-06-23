import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

export default function Landing() {
  const { user, initializing } = useAuth()

  if (initializing) return <div className="screen-center">Loading…</div>
  if (user) return <Navigate to="/feed" replace />

  return (
    <div className="landing">
      <h1>alpha</h1>
      <p>Short videos. Endless scroll. Made by people like you.</p>
      <div className="actions">
        <Link className="btn btn-primary btn-block" to="/signup">
          Create account
        </Link>
        <Link className="btn btn-ghost btn-block" to="/login">
          Log in
        </Link>
      </div>
    </div>
  )
}
