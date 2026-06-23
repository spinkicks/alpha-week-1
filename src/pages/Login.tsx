import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { describeError } from '../utils/errors'

interface LocationState {
  from?: { pathname?: string }
}

export default function Login() {
  const { logIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const dest = (location.state as LocationState | null)?.from?.pathname ?? '/feed'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await logIn(email, password)
      navigate(dest, { replace: true })
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <header>
        <h1>Welcome back</h1>
        <p className="sub">Log in to keep scrolling.</p>
      </header>

      <form onSubmit={onSubmit}>
        {error && <div className="error">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="muted-link">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </div>
  )
}
