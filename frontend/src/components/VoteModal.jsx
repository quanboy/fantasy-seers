import { useState } from 'react'
import { propsApi } from '../api/client'

export default function VoteModal({ prop, onClose, onVoted, userPoints }) {
  const [choice, setChoice] = useState(null)
  const [wager, setWager] = useState('')
  const [split, setSplit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVote = async () => {
    if (!choice) return setError('Pick YES or NO')
    if (!wager || wager < 1) return setError('Enter a valid wager')
    if (wager > userPoints) return setError('Not enough points')

    setLoading(true)
    setError('')
    try {
      const { data } = await propsApi.vote(prop.id, {
        choice,
        wagerAmount: parseInt(wager)
      })
      setSplit(data)
      onVoted()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            prop.sport === 'NFL' ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
          }`}>
            {prop.sport}
          </span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
        </div>

        <p className="text-white font-semibold text-lg mb-6">{prop.title}</p>

        {!split ? (
          <>
            {/* Yes / No buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setChoice('YES')}
                className={`py-4 rounded-xl font-bold text-lg transition-all ${
                  choice === 'YES'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                ✅ YES
              </button>
              <button
                onClick={() => setChoice('NO')}
                className={`py-4 rounded-xl font-bold text-lg transition-all ${
                  choice === 'NO'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                ❌ NO
              </button>
            </div>

            {/* Wager input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">
                Wager <span className="text-blue-400">({userPoints.toLocaleString()} pts available)</span>
              </label>
              <input
                type="number"
                value={wager}
                onChange={e => setWager(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="How many points?"
                min={1}
                max={userPoints}
              />
            </div>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button
              onClick={handleVote}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Submitting...' : 'Lock In Vote'}
            </button>
          </>
        ) : (
          <>
            {/* Split reveal */}
            <div className="text-center mb-6">
              <p className="text-gray-400 text-sm mb-4">Here's how everyone voted</p>

              <div className="flex rounded-full overflow-hidden h-4 mb-4">
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${split.yesPct}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${split.noPct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-400">{split.yesPct.toFixed(0)}%</div>
                  <div className="text-gray-500 text-xs mt-1">YES ({split.yesCount} votes)</div>
                  <div className="text-gray-400 text-xs">{split.yesWagerTotal.toLocaleString()} pts wagered</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-400">{split.noPct.toFixed(0)}%</div>
                  <div className="text-gray-500 text-xs mt-1">NO ({split.noCount} votes)</div>
                  <div className="text-gray-400 text-xs">{split.noWagerTotal.toLocaleString()} pts wagered</div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}