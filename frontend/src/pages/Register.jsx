import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NFL_TEAMS = [
  'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
  'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
  'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
  'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
  'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
  'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
  'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
  'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders',
]

const NBA_TEAMS = [
  'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets',
  'Chicago Bulls', 'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets',
  'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets', 'Indiana Pacers',
  'Los Angeles Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat',
  'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
  'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns',
  'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors',
  'Utah Jazz', 'Washington Wizards',
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    favoriteNflTeam: '', favoriteNbaTeam: '', almaMater: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({
        ...form,
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
    <div className="min-h-screen auth-mesh flex items-center justify-center px-4 py-12">
      {/* Decorative elements */}
      <div className="fixed top-0 left-0 w-48 h-48 pointer-events-none opacity-20">
        <svg viewBox="0 0 192 192" fill="none" className="text-oracle-500"><path d="M0 192V0h192" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8"/></svg>
      </div>
      <div className="fixed bottom-0 right-0 w-48 h-48 pointer-events-none opacity-20">
        <svg viewBox="0 0 192 192" fill="none" className="text-gold-500"><path d="M192 0v192H0" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8"/></svg>
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="animate-float inline-block mb-4">
            <img src="/logo.png" alt="Fantasy Seers" className="w-72 h-72 object-contain drop-shadow-[0_0_40px_rgba(79,70,229,0.3)]"  />
          </div>
          <h1 className="font-display text-3xl font-800 text-slate-100 tracking-tight">Fantasy Seers</h1>
          <p className="text-slate-500 text-sm mt-1">Your vision. Your edge. Your arena.</p>
        </div>

        <div className="glass-card p-7">
          <p className="font-display text-lg font-700 text-slate-100 mb-1">Create your account</p>
          <p className="text-slate-400 text-xs mb-6">Join thousands of seers competing daily</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm text-loss-400 alert-error">
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

            {/* Your Identity section */}
            <div className="pt-4 mt-2 border-t border-void-700">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Your Identity</p>
                <span className="chip-gold text-[10px] px-2 py-0.5 rounded-full font-semibold">Optional</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Favorite NFL Team</label>
                  <select
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
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Favorite NBA Team</label>
                  <select
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
                  <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Alma Mater</label>
                  <input
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
          18+ only · Fantasy Seers is not a licensed gambling site · Play responsibly
        </p>
      </div>
    </div>
  )
}
