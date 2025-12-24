import { useRouter } from "next/router"
import { useState } from "react"
import { login } from "../lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      router.push("/worklist")
    } catch (err) {
      setError("Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <header>
        <div>
          <h1>Eligibility & Benefits Copilot</h1>
          <p>Traceable, evidence-backed verification for outpatient teams.</p>
        </div>
      </header>
      <div className="grid two">
        <section className="card">
          <h2>Log in</h2>
          <form onSubmit={handleSubmit} className="grid" style={{ gap: 12 }}>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error && <div className="notice">{error}</div>}
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
        <section className="card">
          <h2>What this does</h2>
          <p>
            The copilot consolidates eligibility evidence, extracts structured benefits with
            citations, and routes low-confidence cases for review.
          </p>
          <div className="grid">
            <div className="badge">Evidence-linked fields</div>
            <div className="badge">Immutable audit log</div>
            <div className="badge">Human-in-the-loop review</div>
          </div>
        </section>
      </div>
    </main>
  )
}
