import { useState } from "react";
import { propsApi } from "../api/client";

export default function VoteModal({ prop, onClose, onVoted, userPoints }) {
  const [choice, setChoice] = useState(null);
  const [wager, setWager] = useState("");
  const [split, setSplit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVote = async () => {
    if (!choice) return setError("Pick YES or NO");
    if (!wager || wager < 1) return setError("Enter a valid wager");
    if (wager > userPoints) return setError("Not enough points");
    if (prop.minWager && wager < prop.minWager)
      return setError(`Minimum wager is ${prop.minWager} pts`);
    if (prop.maxWager && wager > prop.maxWager)
      return setError(`Maximum wager is ${prop.maxWager} pts`);

    setLoading(true);
    setError("");
    try {
      const { data } = await propsApi.vote(prop.id, {
        choice,
        wagerAmount: parseInt(wager),
      });
      setSplit(data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl p-8 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              prop.sport === "NFL"
                ? "bg-green-900 text-green-300"
                : "bg-orange-900 text-orange-300"
            }`}
          >
            {prop.sport}
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <p className="text-white font-bold text-xl mb-8 leading-snug">
          {prop.title}
        </p>

        {!split ? (
          <>
            {/* Yes / No buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setChoice("YES")}
                className={`py-5 rounded-xl font-bold text-xl transition-all ${
                  choice === "YES"
                    ? "bg-green-600 text-white scale-95"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                ✅ YES
              </button>
              <button
                onClick={() => setChoice("NO")}
                className={`py-5 rounded-xl font-bold text-xl transition-all ${
                  choice === "NO"
                    ? "bg-red-600 text-white scale-95"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                ❌ NO
              </button>
            </div>

            {/* Wager input */}
            <div className="mb-5">
              <label className="block text-sm text-gray-400 mb-2">
                Wager{" "}
                <span className="text-blue-400">
                  ({userPoints.toLocaleString()} pts available)
                </span>
                {prop.minWager && (
                  <span className="text-gray-500 ml-2">
                    Min: {prop.minWager}
                  </span>
                )}
                {prop.maxWager && (
                  <span className="text-gray-500 ml-1">
                    · Max: {prop.maxWager}
                  </span>
                )}
              </label>
              <input
                type="number"
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:border-blue-500"
                placeholder="How many points?"
                min={prop.minWager || 1}
                max={prop.maxWager || userPoints}
              />
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
              onClick={handleVote}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-colors"
            >
              {loading ? "Submitting..." : "Lock In Vote"}
            </button>
          </>
        ) : (
          <>
            {/* Split reveal */}
            <div className="text-center mb-6">
              <p className="text-gray-400 text-sm mb-4">
                Here's how everyone voted
              </p>

              <div className="flex rounded-full overflow-hidden h-4 mb-6">
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
                <div className="bg-gray-800 rounded-xl p-5">
                  <div className="text-3xl font-bold text-green-400">
                    {split.yesPct.toFixed(0)}%
                  </div>
                  <div className="text-gray-500 text-xs mt-2">
                    YES ({split.yesCount} votes)
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    {split.yesWagerTotal.toLocaleString()} pts wagered
                  </div>
                </div>
                <div className="bg-gray-800 rounded-xl p-5">
                  <div className="text-3xl font-bold text-red-400">
                    {split.noPct.toFixed(0)}%
                  </div>
                  <div className="text-gray-500 text-xs mt-2">
                    NO ({split.noCount} votes)
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    {split.noWagerTotal.toLocaleString()} pts wagered
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                await onVoted();
                onClose();
              }}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl text-lg transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
