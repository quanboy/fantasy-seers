import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen auth-mesh flex items-center justify-center px-4 py-12">
      {/* Decorative elements */}
      <div className="fixed top-0 left-0 w-48 h-48 pointer-events-none opacity-20">
        <svg viewBox="0 0 192 192" fill="none"><path d="M0 192V0h192" stroke="#4F46E5" strokeWidth="1" strokeDasharray="4 8"/></svg>
      </div>
      <div className="fixed bottom-0 right-0 w-48 h-48 pointer-events-none opacity-20">
        <svg viewBox="0 0 192 192" fill="none"><path d="M192 0v192H0" stroke="#F97316" strokeWidth="1" strokeDasharray="4 8"/></svg>
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="animate-float inline-block mb-4">
            <img src="/logo.png" alt="Fantasy Seers" className="w-72 h-72 object-contain drop-shadow-[0_0_60px_rgba(79,70,229,0.7)]"  />
          </div>
          <h1 className="font-display text-3xl font-800 text-white tracking-tight">Fantasy Seers</h1>
          <p className="text-slate-500 text-sm mt-1">Your vision. Your edge. Your arena.</p>
        </div>

        <div className="glass-card p-7">
          <p className="font-display text-lg font-700 text-white mb-1">Create your account</p>
          <p className="text-slate-600 text-xs mb-6">Join thousands of seers competing daily</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-loss-400 alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="input-base"
                placeholder="seer_handle"
                minLength={3}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-base"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-base"
                placeholder="Min. 6 characters"
                minLength={6}
                required
              />
            </div>

            {/* Bonus callout */}
            <div className="rounded-xl px-4 py-3 text-xs text-gold-400 chip-gold">
              <span className="font-bold">🎁 Welcome bonus:</span> Start with 1,000 free points to wager on your first props.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-oracle w-full py-3.5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Summoning your account...
                </span>
              ) : 'Join the Arena'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-void-700 text-center">
            <p className="text-slate-600 text-sm">
              Already a Seer?{' '}
              <Link to="/login" className="text-oracle-400 hover:text-oracle-300 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">
          18+ only · Fantasy Seers is not a licensed gambling site · Play responsibly
        </p>
      </div>
    </div>
  )
}
