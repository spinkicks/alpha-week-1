import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { describeError } from '../utils/errors'
import { MIN_AGE } from '../utils/validation'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signUp({ email, password, displayName, handle, birthdate })
      navigate('/feed', { replace: true })
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <header>
        <h1>Create account</h1>
        <p className="sub">You must be at least {MIN_AGE} to join.</p>
      </header>

      <form onSubmit={onSubmit}>
        {error && <div className="error">{error}</div>}

        <div className="field">
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="handle">Handle</label>
          <input
            id="handle"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="yourname"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
          />
          <span className="hint">3–20 chars: lowercase letters, numbers, underscores.</span>
        </div>

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
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="hint">At least 6 characters.</span>
        </div>

        <div className="field">
          <label htmlFor="birthdate">Date of birth</label>
          <input
            id="birthdate"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="muted-link">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
