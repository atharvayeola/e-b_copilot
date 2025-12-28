import { useRouter } from "next/router"
import { useState } from "react"
import { login } from "../lib/api"
import { validateLoginForm, getFieldError, ValidationError } from "../lib/validation"
import { ShieldCheck, Lock, Mail, ArrowRight, Activity, Zap, ClipboardCheck } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ValidationError[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFieldErrors([])

    // Frontend validation
    const validation = validateLoginForm(email, password)
    if (!validation.valid) {
      setFieldErrors(validation.errors)
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      router.push("/dashboard")
    } catch (err) {
      setError("Authorization failed. Please check credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/texture.png')] opacity-10 mix-blend-overlay" />
      </div>

      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        <div className="hidden lg:block space-y-12">
          <div>
            <div className="flex items-center gap-3 text-primary mb-6">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tighter text-white font-display">MedOS Platform</span>
            </div>
            <h1 className="text-6xl font-bold text-white tracking-tight leading-[1.1] font-display">
              Clinical <span className="text-primary">Intelligence</span> Simplified.
            </h1>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mt-1">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-white font-bold">Real-time Orchestration</h3>
                <p className="text-slate-400 text-sm">Automated 270/271 transactions and medical necessity checks.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mt-1">
                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Traceable Evidence</h3>
                <p className="text-slate-400 text-sm">Every AI decision linked directly to clinical documentation.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mt-1">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Smart Intake routing</h3>
                <p className="text-slate-400 text-sm">AI-powered fax classification and case management.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[40px] border border-white/10 shadow-2xl relative">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-primary/20 blur-2xl rounded-full" />

            <div className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-2">Platform Access</h2>
              <p className="text-slate-400 text-sm">Secure authorization for clinical personnel.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Network Identity</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="name@medical-center.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={`w-full pl-11 pr-4 py-4 bg-white/5 border rounded-2xl text-white text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all outline-none ${getFieldError(fieldErrors, 'email') ? 'border-red-500/50' : 'border-white/10'}`}
                    required
                  />
                </div>
                {getFieldError(fieldErrors, 'email') && (
                  <p className="text-red-400 text-xs px-1">{getFieldError(fieldErrors, 'email')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Access Token</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`w-full pl-11 pr-4 py-4 bg-white/5 border rounded-2xl text-white text-sm focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all outline-none ${getFieldError(fieldErrors, 'password') ? 'border-red-500/50' : 'border-white/10'}`}
                    required
                  />
                </div>
                {getFieldError(fieldErrors, 'password') && (
                  <p className="text-red-400 text-xs px-1">{getFieldError(fieldErrors, 'password')}</p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold animate-in">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate Access</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-10 border-t border-white/5 text-center">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                System Status: <span className="text-emerald-500">All Nodes Operational</span>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-slate-600 text-xs">
            Restricted access for authorized medical personnel only.
          </p>
        </div>
      </div>
    </div>
  )
}
