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
  const cardClass = (() => {
    if (isResolved) {
      if (prop.userWon === true)  return "card-win-border";
      if (prop.userWon === false) return "card-loss-border";
      return "glass-card";
    }
    if (isVoted) {
      return prop.userChoice === "YES" ? "card-win-border-light" : "card-loss-border-light";
    }
    return "glass-card";
  })();

  const hoverClass = (!isResolved && !isVoted) ? "glass-card-hover cursor-pointer" : "";

  return (
    <div
      onClick={() => !isResolved && !isVoted && onVote(prop)}
      className={`rounded-2xl p-5 transition-all duration-300 shadow-card ${cardClass} ${hoverClass} ${isResolved ? "opacity-75" : ""}`}
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
                  You: <span className={`font-bold ${prop.userChoice === "YES" ? "text-win-700" : "text-loss-700"}`}>{prop.userChoice}</span>
                </span>
              )}
              <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${prop.result === "YES" ? "text-win-700 chip-win" : "text-loss-700 chip-loss"}`}>
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
      <p className={`font-body font-semibold text-base leading-snug ${isResolved ? "text-slate-500" : "text-slate-800"}`}>
        {prop.title}
      </p>

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between">
        {!isResolved && (
          <>
            {isVoted ? (
              <div className={`flex items-center gap-1.5 text-sm font-semibold ${prop.userChoice === "YES" ? "text-win-700" : "text-loss-700"}`}>
                <span>{prop.userChoice === "YES" ? "✓" : "✗"}</span>
                <span>Voted {prop.userChoice}</span>
              </div>
            ) : (
              <span className="text-slate-400 text-sm flex items-center gap-1.5">
                <span className="text-oracle-500">→</span>
                Tap to place your call
              </span>
            )}
          </>
        )}

        {isResolved && prop.userWon !== null && prop.userWon !== undefined && (
          <span className={`text-sm font-bold ${prop.userWon ? "text-win-700" : "text-loss-700"}`}>
            {prop.userWon ? "🏆 You won" : "You lost"}
          </span>
        )}

        {/* Wager limits hint */}
        {!isResolved && !isVoted && (prop.minWager || prop.maxWager) && (
          <span className="text-xs text-slate-400 ml-auto">
            {prop.minWager && `Min ${prop.minWager.toLocaleString()}`}
            {prop.minWager && prop.maxWager && " · "}
            {prop.maxWager && `Max ${prop.maxWager.toLocaleString()}`} pts
          </span>
        )}
      </div>
    </div>
  );
}
