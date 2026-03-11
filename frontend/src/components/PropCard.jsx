import { useState, useEffect } from "react";

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

  useEffect(() => {
    const calc = () => {
      const diff = new Date(closesAt) - Date.now();
      if (diff <= 0) { setTimeLeft("Closed"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 48) {
        const d = Math.floor(h / 24);
        setTimeLeft(`${d}d left`);
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

  return timeLeft;
}

export default function PropCard({ prop, onVote }) {
  const isResolved = prop.status === "RESOLVED";
  const isVoted = !!prop.userChoice;
  const timeLeft = useCountdown(prop.closesAt);

  const isUrgent = (() => {
    const diff = new Date(prop.closesAt) - Date.now();
    return diff > 0 && diff < 3600000;
  })();

  // Border and background logic
  const cardStyle = (() => {
    if (isResolved) {
      if (prop.userWon === true)  return { border: "1px solid rgba(16,185,129,0.35)", background: "linear-gradient(145deg, #064E3B22, #0E1018)" };
      if (prop.userWon === false) return { border: "1px solid rgba(239,68,68,0.3)", background: "linear-gradient(145deg, #45000A18, #0E1018)" };
      return { border: "1px solid #1E2235", background: "linear-gradient(145deg, #161825, #0E1018)" };
    }
    if (isVoted) {
      return prop.userChoice === "YES"
        ? { border: "1px solid rgba(16,185,129,0.4)", background: "linear-gradient(145deg, #064E3B18, #0E1018)" }
        : { border: "1px solid rgba(239,68,68,0.35)", background: "linear-gradient(145deg, #45000A15, #0E1018)" };
    }
    return { border: "1px solid #1E2235", background: "linear-gradient(145deg, #161825, #0E1018)" };
  })();

  const hoverClass = (!isResolved && !isVoted) ? "glass-card-hover cursor-pointer" : "";

  return (
    <div
      onClick={() => !isResolved && !isVoted && onVote(prop)}
      className={`rounded-2xl p-5 transition-all duration-300 ${hoverClass} ${isResolved ? "opacity-75" : ""}`}
      style={{ ...cardStyle, boxShadow: "0 4px 24px rgba(0,0,0,0.35)", ...((!isResolved && !isVoted) ? {} : {}) }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={getSportClass(prop.sport)}>{prop.sport}</span>
          {!isResolved && isUrgent && (
            <div className="flex items-center gap-1">
              <span className="live-dot" />
              <span className="text-live text-xs font-bold">Closing soon</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-right shrink-0">
          {isResolved ? (
            <div className="flex items-center gap-2">
              {prop.userChoice && (
                <span className="text-xs text-slate-500">
                  You: <span className={`font-bold ${prop.userChoice === "YES" ? "text-win-400" : "text-loss-400"}`}>{prop.userChoice}</span>
                </span>
              )}
              <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${prop.result === "YES" ? "text-win-400" : "text-loss-400"}`}
                style={{
                  background: prop.result === "YES" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                  border: prop.result === "YES" ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(239,68,68,0.25)"
                }}>
                {prop.result}
              </div>
            </div>
          ) : (
            <span className={`text-xs ${isUrgent ? "text-live font-semibold" : "text-slate-500"}`}>
              {timeLeft}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <p className={`font-body font-semibold text-base leading-snug ${isResolved ? "text-slate-400" : "text-slate-100"}`}>
        {prop.title}
      </p>

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between">
        {!isResolved && (
          <>
            {isVoted ? (
              <div className={`flex items-center gap-1.5 text-sm font-semibold ${prop.userChoice === "YES" ? "text-win-400" : "text-loss-400"}`}>
                <span>{prop.userChoice === "YES" ? "✓" : "✗"}</span>
                <span>Voted {prop.userChoice}</span>
              </div>
            ) : (
              <span className="text-slate-600 text-sm flex items-center gap-1.5">
                <span className="text-oracle-500">→</span>
                Tap to place your call
              </span>
            )}
          </>
        )}

        {isResolved && prop.userWon !== null && prop.userWon !== undefined && (
          <span className={`text-sm font-bold ${prop.userWon ? "text-win-400" : "text-loss-500"}`}>
            {prop.userWon ? "🏆 You won" : "You lost"}
          </span>
        )}

        {/* Wager limits hint */}
        {!isResolved && !isVoted && (prop.minWager || prop.maxWager) && (
          <span className="text-xs text-slate-600 ml-auto">
            {prop.minWager && `Min ${prop.minWager.toLocaleString()}`}
            {prop.minWager && prop.maxWager && " · "}
            {prop.maxWager && `Max ${prop.maxWager.toLocaleString()}`} pts
          </span>
        )}
      </div>
    </div>
  );
}
