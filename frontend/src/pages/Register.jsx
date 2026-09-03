import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NFL_TEAMS, NBA_TEAMS } from '../utils/teams'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '', inviteCode: '',
    favoriteNflTeam: '', favoriteNbaTeam: '', almaMater: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({
        ...form,
        inviteCode: form.inviteCode.trim(),
        favoriteNflTeam: form.favoriteNflTeam || null,
        favoriteNbaTeam: form.favoriteNbaTeam || null,
        almaMater: form.almaMater.trim() || null,
      })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen auth-mesh flex items-center justify-center px-4 py-8 sm:py-12">
      {/* Decorative elements */}
      <div className="fixed top-0 left-0 w-48 h-48 pointer-events-none opacity-20">
        <svg viewBox="0 0 192 192" fill="none" className="text-oracle-500"><path d="M0 192V0h192" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8"/></svg>
      </div>
      <div className="fixed bottom-0 right-0 w-48 h-48 pointer-events-none opacity-20">
        <svg viewBox="0 0 192 192" fill="none" className="text-gold-500"><path d="M192 0v192H0" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8"/></svg>
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="animate-float inline-block mb-4">
            <img src="/logo.png" alt="Fantasy Seers" className="w-48 h-48 sm:w-56 sm:h-56 object-contain drop-shadow-[0_0_40px_rgba(79,70,229,0.3)]"  />
          </div>
          <h1 className="font-display text-3xl font-800 text-slate-100 tracking-tight">Fantasy Seers</h1>
          <p className="text-slate-500 text-sm mt-1">Your vision. Your edge. Your arena.</p>
        </div>

        <div className="glass-card p-7">
          <p className="font-display text-lg font-700 text-slate-100 mb-1">Join your league</p>
          <p className="text-slate-400 text-xs mb-6">Build your rankings and compare picks with friends</p>

          {error && (
            <div role="alert" className="mb-4 px-4 py-3 rounded-lg text-sm text-loss-400 alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
            <div>
              <label htmlFor="register-username" className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Username</label>
              <input
                id="register-username"
                name="username"
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="input-base"
                placeholder="seer_handle"
                autoComplete="username"
                minLength={3}
                maxLength={50}
                required
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Email</label>
              <input
                id="register-email"
                name="email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-base"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-base pr-10"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-invite-code" className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Invite Code</label>
              <input
                id="register-invite-code"
                name="inviteCode"
                type="text"
                value={form.inviteCode}
                onChange={e => setForm({ ...form, inviteCode: e.target.value })}
                className="input-base"
                placeholder="Enter your league invite code"
                autoComplete="off"
                maxLength={100}
              />
            </div>

            {/* Your Identity section */}
            <div className="pt-4 mt-2 border-t border-void-700">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Your Identity</p>
                <span className="chip-gold text-[10px] px-2 py-0.5 rounded-full font-semibold">Optional</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="favorite-nfl-team" className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Favorite NFL Team</label>
                  <select
                    id="favorite-nfl-team"
                    name="favoriteNflTeam"
                    value={form.favoriteNflTeam}
                    onChange={e => setForm({ ...form, favoriteNflTeam: e.target.value })}
                    className="input-base"
                  >
                    <option value="">Select a team</option>
                    {NFL_TEAMS.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="favorite-nba-team" className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Favorite NBA Team</label>
                  <select
                    id="favorite-nba-team"
                    name="favoriteNbaTeam"
                    value={form.favoriteNbaTeam}
                    onChange={e => setForm({ ...form, favoriteNbaTeam: e.target.value })}
                    className="input-base"
                  >
                    <option value="">Select a team</option>
                    {NBA_TEAMS.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="alma-mater" className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Alma Mater</label>
                  <input
                    id="alma-mater"
                    name="almaMater"
                    type="text"
                    value={form.almaMater}
                    onChange={e => setForm({ ...form, almaMater: e.target.value })}
                    className="input-base"
                    placeholder="e.g. University of Michigan"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>

            {/* Bonus callout */}
            <div className="rounded-lg px-4 py-3 text-xs text-gold-400 chip-gold">
              <span className="font-bold">Welcome bonus:</span> Start with <span className="font-mono">1,000</span> free points.
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
            <p className="text-slate-400 text-sm">
              Already a Seer?{' '}
              <Link to="/login" className="text-oracle-400 hover:text-oracle-500 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Private league competition · No real-money wagering
        </p>
      </div>
    </div>
  )
}
