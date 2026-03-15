import { useState, useEffect } from "react";
import { propsApi } from "../api/client";

const SPORT_CLASSES = {
  NFL: "sport-nfl",
  NBA: "sport-nba",
  MLB: "sport-mlb",
  NHL: "sport-nhl",
};

function getSportClass(sport) {
  return SPORT_CLASSES[sport] ?? "sport-default";
}

function useCountdown(closesAt) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(closesAt) - Date.now();
      if (diff <= 0) { setTimeLeft("Closed"); setIsUrgent(false); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setIsUrgent(h <= 48);
      if (h >= 48) {
        const d = Math.floor(h / 24);
        setTimeLeft(`${d} day${d !== 1 ? "s" : ""} left`);
      } else if (h >= 24) {
        const d = Math.floor(h / 24);
        setTimeLeft(`${d} day${d !== 1 ? "s" : ""} left`);
      } else if (h > 0) {
        setTimeLeft(`${h}h ${m}m left`);
      } else {
        setTimeLeft(`${m}m left`);
      }
    };
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, [closesAt]);

  return { timeLeft, isUrgent };
}

const PLATFORM_RAKE = 0.05;

export default function PropCard({ prop, onVote }) {
  const isResolved = prop.status === "RESOLVED";
  const isClosed = prop.status === "CLOSED";
  const isVoted = !!prop.userChoice;
  const { timeLeft, isUrgent } = useCountdown(prop.closesAt);
  const canVote = !isResolved && !isVoted && !isClosed;

  const [wager, setWager] = useState(String(prop.minWager || 100));
  const [split, setSplit] = useState(null);

  // Fetch split for voted (non-resolved) props
  useEffect(() => {
    if (isVoted && !isResolved) {
      propsApi.getSplit(prop.id).then(({ data }) => setSplit(data)).catch(() => {});
    }
  }, [isVoted, isResolved, prop.id]);

  const cardClass = (() => {
    if (isResolved) {
      if (prop.userWon === true) return "card-win-border";
      if (prop.userWon === false) return "card-loss-border";
      return "glass-card";
    }
    if (isVoted) {
      return prop.userChoice === "YES" ? "card-win-border-light" : "card-loss-border-light";
    }
    return "glass-card";
  })();

  const handleVoteClick = (choice) => {
    const w = parseInt(wager) || prop.minWager || 100;
    onVote({ ...prop, _initialChoice: choice, _initialWager: String(w) });
  };

  return (
    <div className={`rounded-xl p-5 transition-all duration-200 shadow-card ${cardClass} ${isResolved ? "opacity-70" : ""}`}>
      {/* Top row: sport badge + timer */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={getSportClass(prop.sport)}>{prop.sport}</span>

        <div className="flex items-center gap-1.5 shrink-0">
          {isResolved ? (
            <div className="flex items-center gap-1.5">
              {prop.userChoice && <span className="text-xs text-slate-500">You voted:</span>}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                prop.result === "YES"
                  ? "text-win-400 chip-win"
                  : prop.userChoice === "YES" ? "text-slate-500 bg-void-800 border border-void-700" : "text-slate-500 bg-void-800 border border-void-700"
              } ${prop.userChoice === "YES" ? "ring-1 ring-slate-400/30" : ""}`}>
                YES
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                prop.result === "NO"
                  ? "text-loss-400 chip-loss"
                  : "text-slate-500 bg-void-800 border border-void-700"
              } ${prop.userChoice === "NO" ? "ring-1 ring-slate-400/30" : ""}`}>
                NO
              </span>
            </div>
          ) : isClosed ? (
            <span className="text-xs font-mono text-slate-500">Closed</span>
          ) : prop.status === "PENDING" ? (
            <span className="text-xs font-mono text-gold-400">Pending</span>
          ) : (
            <>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${isUrgent ? "bg-live animate-live-pulse" : "bg-win-500"}`} />
              <span className={`text-xs font-mono ${isUrgent ? "text-live" : "text-slate-400"}`}>
                {timeLeft}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <p className={`font-cinzel font-semibold text-base leading-snug ${isResolved ? "text-slate-500" : "text-slate-200"}`}>
        {prop.title}
      </p>

      {/* Open state: inline vote buttons + wager */}
      {canVote && (
        <div className="mt-4">
          {/* Vote buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => handleVoteClick("YES")}
              className="py-2.5 rounded-lg font-display font-700 text-sm transition-all vote-yes-idle hover:bg-win-500/10"
            >
              Yes
            </button>
            <button
              onClick={() => handleVoteClick("NO")}
              className="py-2.5 rounded-lg font-display font-700 text-sm transition-all vote-no-idle hover:bg-loss-500/10"
            >
              No
            </button>
          </div>

          {/* Wager row */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Wager</span>
            <input
              type="number"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              min={prop.minWager || 1}
              max={prop.maxWager || undefined}
              className="flex-1 bg-void-950 border border-void-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-200 outline-none focus:border-void-600 transition-colors"
            />
            <span className="text-xs text-slate-500 font-mono">pts</span>
            {(prop.minWager || prop.maxWager) && (
              <span className="text-xs text-slate-500 font-mono ml-auto">
                {prop.minWager ?? 1} – {prop.maxWager ? prop.maxWager.toLocaleString() : "∞"} pts
              </span>
            )}
          </div>
        </div>
      )}

      {/* Voted state: chip + split bar + contrarian payout */}
      {isVoted && !isResolved && (
        <div className="mt-3">
          {/* Voted chips: YES/NO side by side, user's pick highlighted */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs text-slate-500">You voted:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              prop.userChoice === "YES"
                ? "text-win-400 chip-win"
                : "text-slate-500 bg-void-800 border border-void-700"
            }`}>
              YES
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              prop.userChoice === "NO"
                ? "text-loss-400 chip-loss"
                : "text-slate-500 bg-void-800 border border-void-700"
            }`}>
              NO
            </span>
          </div>

          {/* Split bar */}
          {split && (
            <>
              <p className="text-sm text-slate-200 mb-2 text-center font-cinzel font-semibold">Voting Splits</p>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Yes</span>
                <span className="text-slate-400">No</span>
              </div>
              <div className="flex rounded-full overflow-hidden h-2 mb-1 gap-px">
                <div className="bar-yes transition-all duration-500" style={{ width: `${split.yesPct}%` }} />
                <div className="bar-no transition-all duration-500" style={{ width: `${split.noPct}%` }} />
              </div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-win-400">{split.yesPct.toFixed(0)}%</span>
                <span className="text-loss-400">{split.noPct.toFixed(0)}%</span>
              </div>

              {/* Contrarian payout hint */}
              {(() => {
                const userIsYes = prop.userChoice === "YES";
                const userIsMajority = userIsYes ? split.yesPct > 50 : split.noPct > 50;
                if (!userIsMajority) return null;

                const otherSide = userIsYes ? "No" : "Yes";
                const winPool = userIsYes ? split.yesWagerTotal : split.noWagerTotal;
                const losePool = userIsYes ? split.noWagerTotal : split.yesWagerTotal;
                if (!losePool || !winPool) return null;

                const distributable = Math.floor(losePool * (1 - PLATFORM_RAKE));
                const estPayout = Math.floor(distributable + winPool);

                return (
                  <p className="text-xs text-gold-400 font-mono">
                    Contrarian payout if {otherSide} wins: ~{estPayout.toLocaleString()} pts
                  </p>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* Closed state */}
      {isClosed && !isVoted && (
        <div className="mt-3">
          <span className="text-slate-500 text-sm">Voting closed — pending result</span>
        </div>
      )}

      {/* Resolved state */}
      {isResolved && prop.userWon !== null && prop.userWon !== undefined && (
        <div className="mt-3">
          <span className={`text-sm font-bold ${prop.userWon ? "text-win-400" : "text-loss-400"}`}>
            {prop.userWon ? "Won" : "Lost"}
          </span>
        </div>
      )}
    </div>
  );
}
