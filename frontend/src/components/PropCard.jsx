export default function PropCard({ prop, onVote }) {
  const closesAt = new Date(prop.closesAt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const isResolved = prop.status === 'RESOLVED'

  const cardColor = () => {
    if (isResolved) {
      if (prop.userWon === null || prop.userWon === undefined) {
        return 'bg-gray-900 border-gray-800'
      }
      return prop.userWon
        ? 'bg-green-950 border-green-800'
        : 'bg-red-950 border-red-800'
    }
    if (prop.userChoice) {
      return prop.userChoice === 'YES'
        ? 'bg-gray-900 border-green-800'
        : 'bg-gray-900 border-red-800'
    }
    return 'bg-gray-900 border-gray-800 hover:border-blue-600'
  }


  return (
    <div
      onClick={() => !isResolved && !prop.userChoice && onVote(prop)}
      className={`border rounded-2xl p-6 transition-all ${
        isResolved ? `${cardColor()} opacity-80 cursor-default` : `${cardColor()} cursor-pointer`
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          prop.sport === 'NFL' ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
        }`}>
          {prop.sport}
        </span>
        <div className="flex items-center gap-2">
          {isResolved ? (
            <div className="flex items-center gap-3">
              {prop.userChoice && (
                <span className="text-xs text-gray-400">
                  You: <span className={`font-bold ${
                    prop.userChoice === 'YES' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {prop.userChoice}
                  </span>
                </span>
              )}
              <span className="text-xs text-gray-400">
                Result: <span className={`font-bold ${
                  prop.result === 'YES' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {prop.result}
                </span>
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-500">Closes {closesAt}</span>
          )}
        </div>
      </div>

      <p className={`font-semibold text-lg leading-snug ${isResolved ? 'text-gray-400' : 'text-white'}`}>
        {prop.title}
      </p>

      {!isResolved && (
        prop.userChoice
          ? <p className={`text-sm mt-3 font-semibold ${
              prop.userChoice === 'YES' ? 'text-green-400' : 'text-red-400'
            }`}>
              You voted {prop.userChoice}
            </p>
          : <p className="text-gray-500 text-sm mt-3">Tap to vote</p>
      )}
    </div>
  )
}