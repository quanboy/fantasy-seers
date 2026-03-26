import { useState, useEffect } from 'react'
import { userApi } from '../api/client'
import { NFL_TEAMS, NBA_TEAMS } from '../utils/teams'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ favoriteNflTeam: '', favoriteNbaTeam: '', almaMater: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    userApi.getMe().then(({ data }) => {
      setProfile(data)
      setForm({
        favoriteNflTeam: data.favoriteNflTeam || '',
        favoriteNbaTeam: data.favoriteNbaTeam || '',
        almaMater: data.almaMater || '',
      })
    }).finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const { data } = await userApi.updateProfile({
        favoriteNflTeam: form.favoriteNflTeam || null,
        favoriteNbaTeam: form.favoriteNbaTeam || null,
        almaMater: form.almaMater.trim() || null,
      })
      setProfile(data)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="skeleton h-10 w-48 mb-6" />
        <div className="skeleton h-64" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
      <h1 className="font-display text-2xl font-800 text-slate-100 mb-6">Profile</h1>

      {/* Account section — read-only */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-4">Account</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Username</label>
            <p className="text-sm font-semibold text-slate-200">{profile?.username}</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <p className="text-sm font-semibold text-slate-200">{profile?.email}</p>
          </div>
          {profile?.favoriteNflTeam && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Favorite NFL Team</label>
              <p className="text-sm font-semibold text-slate-200">{profile.favoriteNflTeam}</p>
            </div>
          )}
          {profile?.favoriteNbaTeam && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Favorite NBA Team</label>
              <p className="text-sm font-semibold text-slate-200">{profile.favoriteNbaTeam}</p>
            </div>
          )}
          {profile?.almaMater && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Alma Mater</label>
              <p className="text-sm font-semibold text-slate-200">{profile.almaMater}</p>
            </div>
          )}
        </div>
      </div>

      {/* Identity section — editable */}
      <div className="glass-card p-6">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-4">Identity</h2>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm text-loss-400 alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm text-win-400 chip-gold">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <button
            type="submit"
            disabled={saving}
            className="btn-oracle w-full py-3"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
