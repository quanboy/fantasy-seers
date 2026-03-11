import { useState } from "react";
import { propsApi } from "../api/client";

const PLATFORM_RAKE = 0.05; // 5% of net winnings go to Fantasy Seers

const SPORT_CLASSES = {
  NFL: "sport-nfl",
  NBA: "sport-nba",
  MLB: "sport-mlb",
  NHL: "sport-nhl",
};
function getSportClass(sport) {
  return SPORT_CLASSES[sport] ?? "sport-default";
}

function RakeExplainer({ wager }) {
  const amt = parseInt(wager) || 0;
  const netWin = Math.floor(amt * (1 - PLATFORM_RAKE));
  const fee = amt - netWin;

  return (
    <div className="rake-chip mt-3 text-xs leading-relaxed">
      <span className="font-semibold text-oracle-400">Fantasy Seers fee: 5% of winnings.</span>
      {amt > 0 && (
        <span className="text-slate-500 ml-1">
          If you win a {amt.toLocaleString()} pt bet → you keep{" "}
          <span className="text-oracle-300 font-semibold">{(amt * 2 - fee).toLocaleString()} pts</span>
          {" "}({fee.toLocaleString()} pt platform fee).
        </span>
      )}
    </div>
  );
}

function QuickAmounts({ max, onSelect }) {
  const amounts = [100, 250, 500, 1000].filter(a => a <= max);
  if (amounts.length === 0) return null;
  return (
    <div className="flex gap-2 mt-2">
      {amounts.map(a => (
        <button key={a} onClick={() => onSelect(String(a))}
          className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-oracle-300 transition-all"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
          onMouseEnter={e => e.target.style.background = 'rgba(124,58,237,0.2)'}
          onMouseLeave={e => e.target.style.background = 'rgba(124,58,237,0.1)'}
        >
          {a.toLocaleString()}
        </button>
      ))}
      <button onClick={() => onSelect(String(max))}
        className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-gold-400 transition-all"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
        onMouseEnter={e => e.target.style.background = 'rgba(245,158,11,0.2)'}
        onMouseLeave={e => e.target.style.background = 'rgba(245,158,11,0.1)'}
      >
        Max
      </button>
    </div>
  );
}

export default function VoteModal({ prop, onClose, onVoted, userPoints }) {
  const [choice, setChoice] = useState(null);
  const [wager, setWager] = useState("");
  const [split, setSplit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const maxWager = Math.min(userPoints, prop.maxWager || userPoints);

  const handleVote = async () => {
    if (!choice) return setError("Pick YES or NO first");
    if (!wager || parseInt(wager) < 1) return setError("Enter a valid wager amount");
    if (parseInt(wager) > userPoints) return setError("Not enough points in your bank");
    if (prop.minWager && parseInt(wager) < prop.minWager)
      return setError(`Minimum wager is ${prop.minWager.toLocaleString()} pts`);
    if (prop.maxWager && parseInt(wager) > prop.maxWager)
      return setError(`Maximum wager is ${prop.maxWager.toLocaleString()} pts`);

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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-7 animate-slide-up"
        style={{
          background: 'linear-gradient(145deg, #161825, #0E1018)',
          border: '1px solid #1E2235',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
      >
        {!split ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <span className={getSportClass(prop.sport)}>{prop.sport}</span>
              <button onClick={onClose}
                className="text-slate-600 hover:text-slate-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-void-700 transition-all text-lg">
                ✕
              </button>
            </div>

            {/* Prop title */}
            <p className="font-display text-xl font-700 text-white leading-snug mb-6">
              {prop.title}
            </p>

            {/* YES / NO */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setChoice("YES")}
                className={`py-5 rounded-2xl font-display font-700 text-lg transition-all duration-200 ${
                  choice === "YES"
                    ? "scale-95"
                    : "hover:scale-102"
                }`}
                style={choice === "YES"
                  ? { background: 'linear-gradient(135deg, #065F46, #10B981)', border: '1px solid rgba(16,185,129,0.5)', color: 'white', boxShadow: '0 0 24px rgba(16,185,129,0.3)' }
                  : { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#6EE7B7' }
                }
              >
                YES
              </button>
              <button
                onClick={() => setChoice("NO")}
                className={`py-5 rounded-2xl font-display font-700 text-lg transition-all duration-200 ${
                  choice === "NO" ? "scale-95" : ""
                }`}
                style={choice === "NO"
                  ? { background: 'linear-gradient(135deg, #7F1D1D, #EF4444)', border: '1px solid rgba(239,68,68,0.5)', color: 'white', boxShadow: '0 0 24px rgba(239,68,68,0.3)' }
                  : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }
                }
              >
                NO
              </button>
            </div>

            {/* Wager */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-500 uppercase tracking-widest">Your wager</label>
                <span className="text-xs text-gold-500 font-semibold">
                  {userPoints.toLocaleString()} pts available
                </span>
              </div>
              <input
                type="number"
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="input-base text-lg font-bold"
                placeholder="0"
                min={prop.minWager || 1}
                max={maxWager}
              />
              <QuickAmounts max={maxWager} onSelect={setWager} />
            </div>

            {/* Rake explainer */}
            <RakeExplainer wager={wager} />

            {/* Wager limits */}
            {(prop.minWager || prop.maxWager) && (
              <p className="text-xs text-slate-600 mt-2">
                {prop.minWager && `Min: ${prop.minWager.toLocaleString()} pts`}
                {prop.minWager && prop.maxWager && " · "}
                {prop.maxWager && `Max: ${prop.maxWager.toLocaleString()} pts`}
              </p>
            )}

            {error && (
              <p className="text-loss-400 text-sm mt-4 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(127,29,29,0.2)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            <button
              onClick={handleVote}
              disabled={loading || !choice || !wager}
              className="btn-oracle w-full mt-5 py-4 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Locking in...
                </span>
              ) : (
                choice
                  ? `Lock In — ${choice} · ${parseInt(wager) > 0 ? parseInt(wager).toLocaleString() + " pts" : "?"}`
                  : "Select YES or NO"
              )}
            </button>
          </>
        ) : (
          /* Split reveal */
          <div className="animate-scale-in">
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">🔮</div>
              <p className="font-display text-lg font-700 text-white">Vote locked in</p>
              <p className="text-slate-500 text-sm mt-1">Here's how the crowd is calling it</p>
            </div>

            {/* Bar */}
            <div className="flex rounded-full overflow-hidden h-3 mb-6 gap-0.5">
              <div
                className="transition-all duration-700 rounded-l-full"
                style={{ width: `${split.yesPct}%`, background: 'linear-gradient(90deg, #065F46, #10B981)' }}
              />
              <div
                className="transition-all duration-700 rounded-r-full"
                style={{ width: `${split.noPct}%`, background: 'linear-gradient(90deg, #7F1D1D, #EF4444)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(6,78,59,0.2)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="font-display text-3xl font-800 text-win-400">{split.yesPct.toFixed(0)}%</div>
                <div className="text-slate-500 text-xs mt-1">YES · {split.yesCount} votes</div>
                <div className="text-win-500 text-xs mt-1 font-semibold">{split.yesWagerTotal?.toLocaleString()} pts</div>
              </div>
              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(69,10,10,0.2)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="font-display text-3xl font-800 text-loss-400">{split.noPct.toFixed(0)}%</div>
                <div className="text-slate-500 text-xs mt-1">NO · {split.noCount} votes</div>
                <div className="text-loss-500 text-xs mt-1 font-semibold">{split.noWagerTotal?.toLocaleString()} pts</div>
              </div>
            </div>

            {/* Payout reminder */}
            <div className="rake-chip mb-5 text-center">
              Winners receive <span className="text-oracle-300 font-bold">95%</span> of net winnings ·
              <span className="text-slate-600"> 5% Fantasy Seers platform fee</span>
            </div>

            <button
              onClick={async () => { await onVoted(); onClose(); }}
              className="w-full py-4 rounded-2xl font-semibold text-slate-300 transition-all"
              style={{ background: '#161825', border: '1px solid #1E2235' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1E2235'}
              onMouseLeave={e => e.currentTarget.style.background = '#161825'}
            >
              Back to Feed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
