import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { propsApi, userApi } from '../api/client'
import PropCard from '../components/PropCard'
import VoteModal from '../components/VoteModal'

export default function Dashboard() {
  const { user, logout, setUser } = useAuth()
  const [props, setProps] = useState([])
  const [selectedProp, setSelectedProp] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    propsApi.getPublic()
      .then(({ data }) => setProps(data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await userApi.getMe()
      const updated = { ...user, pointBank: data.pointBank }
      localStorage.setItem('fs_user', JSON.stringify(updated))
      setUser(updated)
    }, 30000)

    return () => clearInterval(interval)
  }, [user])

  const handleVoted = async () => {
    const { data } = await userApi.getMe()
    const updated = { ...user, pointBank: data.pointBank }
    localStorage.setItem('fs_user', JSON.stringify(updated))
    setUser(updated)
    setSelectedProp(null)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Fantasy Seers</h1>
        <div className="flex items-center gap-4">
          <span className="text-blue-400 font-semibold">⚡ {user?.pointBank?.toLocaleString()} pts</span>
          <span className="text-gray-400 text-sm">{user?.username}</span>
          <button onClick={logout} className="text-gray-500 hover:text-gray-300 text-sm">Sign out</button>
        </div>
      </nav>

      {/* Feed */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-white mb-6">Open Props</h2>

        {loading && (
          <p className="text-gray-500 text-center py-12">Loading props...</p>
        )}

        {!loading && props.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔮</div>
            <p className="text-gray-500">No open props yet. Check back soon.</p>
          </div>
        )}

        <div className="space-y-4">
          {props.map(prop => (
            <PropCard key={prop.id} prop={prop} onVote={setSelectedProp} />
          ))}
        </div>
      </main>

      {/* Vote Modal */}
      {selectedProp && (
        <VoteModal
          prop={selectedProp}
          userPoints={user?.pointBank}
          onClose={() => setSelectedProp(null)}
          onVoted={handleVoted}
        />
      )}
    </div>
  )
}