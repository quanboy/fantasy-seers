import { useState, useEffect } from "react";
import { propsApi } from "../api/client";
import { getSportClass } from "../utils/sportClasses";

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
      if (h >= 24) {
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

function VoteChips({ userChoice, result }) {
  const yesActive = userChoice === "YES";
  const noActive = userChoice === "NO";

  const yesClass = result
    ? (result === "YES" ? "text-win-400 chip-win" : "text-slate-500 chip-vote-ghost")
    : (yesActive ? "text-win-400 chip-win" : "text-slate-500 chip-vote-ghost");

  const noClass = result
    ? (result === "NO" ? "text-loss-400 chip-loss" : "text-slate-500 chip-vote-ghost")
    : (noActive ? "text-loss-400 chip-loss" : "text-slate-500 chip-vote-ghost");

  return (
    <div className="flex items-center gap-1">
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${yesClass} ${yesActive ? "ring-1 ring-white/20" : ""}`}>
        {yesActive && !result ? "Voted Yes" : "Yes"}
      </span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${noClass} ${noActive ? "ring-1 ring-white/20" : ""}`}>
        {noActive && !result ? "Voted No" : "No"}
      </span>
    </div>
  );
}

function SplitBar({ split }) {
  if (!split) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-slate-300 mb-2">Voting Splits</p>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-slate-400">Yes</span>
        <span className="text-slate-400">No</span>
      </div>
      <div className="flex rounded-full overflow-hidden h-2 mb-1 gap-px">
        <div className="bar-yes transition-all duration-500" style={{ width: `${split.yesPct}%` }} />
        <div className="bar-no transition-all duration-500" style={{ width: `${split.noPct}%` }} />
      </div>
      <div className="flex justify-between text-xs font-mono">
        <span className="text-win-400">{split.yesPct.toFixed(0)}%</span>
        <span className="text-loss-400">{split.noPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function ContrarianHint({ userChoice, split, isClosed }) {
  if (!split) return null;
  const userIsYes = userChoice === "YES";
  const userIsMajority = userIsYes ? split.yesPct > 50 : split.noPct > 50;
  const userIsMinority = userIsYes ? split.yesPct < 50 : split.noPct < 50;

  const otherSide = userIsYes ? "No" : "Yes";
  const winPool = userIsYes ? split.yesWagerTotal : split.noWagerTotal;
  const losePool = userIsYes ? split.noWagerTotal : split.yesWagerTotal;
  if (!losePool || !winPool) return null;

  const distributable = Math.floor(losePool * (1 - PLATFORM_RAKE));
  const estPayout = Math.floor(distributable + winPool);

  if (isClosed && userIsMinority) {
    return (
      <p className="text-xs text-gold-400 font-mono mt-2">
        You're in the minority — contrarian payout if {otherSide} wins: ~{estPayout.toLocaleString()} pts
      </p>
    );
  }

  if (userIsMajority) {
    return (
      <p className="text-xs text-gold-400/70 font-mono mt-2">
        Contrarian payout if {otherSide} wins: ~{estPayout.toLocaleString()} pts
      </p>
    );
  }

  return null;
}

export default function PropCard({ prop, onVote }) {
  const isResolved = prop.status === "RESOLVED";
  const isClosed = prop.status === "CLOSED";
  const isPending = prop.status === "PENDING";
  const isVoted = !!prop.userChoice;
  const { timeLeft, isUrgent } = useCountdown(prop.closesAt);
  const canVote = !isResolved && !isVoted && !isClosed && !isPending;

  const [wager, setWager] = useState(String(prop.minWager || 100));
  const [split, setSplit] = useState(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitError, setSplitError] = useState(null);

  useEffect(() => {
    if (isVoted) {
      setSplitLoading(true);
      propsApi.getSplit(prop.id)
        .then(({ data }) => setSplit(data))
        .catch(() => setSplitError("Unable to load split data"))
        .finally(() => setSplitLoading(false));
    }
  }, [isVoted, prop.id]);

  // Determine card state
  const isCorrect = isResolved && prop.userWon === true;
  const isIncorrect = isResolved && prop.userWon === false;
  const isContrarian = isCorrect && split && (() => {
    const userIsYes = prop.userChoice === "YES";
    return userIsYes ? split.yesPct < 50 : split.noPct < 50;
  })();

  // Card styling by state
  const cardBorder = (() => {
    if (isCorrect) return "card-win";
    if (isIncorrect) return "card-loss";
    if (isClosed || (isResolved && !isVoted)) return "card-closed";
    return "card-open";
  })();

  const accentBar = (() => {
    if (isCorrect) return "accent-bar-win";
    if (isIncorrect) return "accent-bar-loss";
    if (isClosed || (isResolved && !isVoted)) return "accent-bar-muted";
    return "accent-bar-gold";
  })();

  const handleVoteClick = (choice) => {
    const w = parseInt(wager) || prop.minWager || 100;
    onVote({ ...prop, _initialChoice: choice, _initialWager: String(w) });
  };

  // Payout display
  const payoutDelta = (() => {
    if (!isResolved || !isVoted) return null;
    if (prop.userPayout != null && prop.userWager != null) {
      return prop.userPayout - prop.userWager;
    }
    return null;
  })();

  return (
    <div className={`relative overflow-hidden p-5 pl-7 transition-all duration-200 ${cardBorder}`}>
      {/* Left accent bar */}
      <div className={accentBar} />

      {/* Top row: sport badge + right side */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={getSportClass(prop.sport)}>{prop.sport}</span>

        <div className="flex items-center gap-1.5 shrink-0">
          {(isVoted && (isResolved || isClosed)) ? (
            <VoteChips userChoice={prop.userChoice} result={prop.result} />
          ) : isVoted ? (
            <VoteChips userChoice={prop.userChoice} result={null} />
          ) : isClosed || (isResolved && !isVoted) ? (
            <span className="text-xs font-mono text-slate-500">{isResolved ? "Resolved" : "Closed"}</span>
          ) : isPending ? (
            <span className="text-xs font-mono text-gold-400">Pending</span>
          ) : (
            <>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${isUrgent ? "bg-live animate-live-pulse" : "bg-gold-400"}`} />
              <span className={`text-xs font-mono ${isUrgent ? "text-live" : "text-slate-400"}`}>
                {timeLeft}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <p className={`font-cinzel font-semibold text-base leading-snug ${isResolved ? "text-slate-400" : "text-slate-200"}`}>
        {prop.title}
      </p>

      {/* Description / context */}
      {prop.description && (
        <p className={`text-xs leading-relaxed mt-1.5 ${isResolved ? "text-slate-500" : "text-slate-400"}`}>
          {prop.description}
        </p>
      )}

      {/* Open — unvoted: inline vote + wager */}
      {canVote && (
        <div className="mt-4">
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

      {/* Voted / closed / resolved: split bar + contrarian hint */}
      {isVoted && (
        <>
          {splitLoading ? (
            <div className="flex items-center gap-2 mt-3">
              <span className="w-3.5 h-3.5 border-2 border-void-600 border-t-slate-400 rounded-full animate-spin" />
              <span className="text-xs text-slate-500">Loading splits...</span>
            </div>
          ) : splitError ? (
            <p className="text-xs text-loss-400 mt-3">{splitError}</p>
          ) : (
            <>
              <SplitBar split={split} />
              {!isResolved && (
                <ContrarianHint userChoice={prop.userChoice} split={split} isClosed={isClosed} />
              )}
            </>
          )}
        </>
      )}

      {/* Closed — unvoted */}
      {isClosed && !isVoted && (
        <div className="mt-3">
          <span className="text-slate-500 text-sm">Voting closed — pending result</span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-void-700/50 mt-4 mb-3" />

      {/* Bottom row: status pill left, value right */}
      <div className="flex items-center justify-between">
        {/* Status pill */}
        {isCorrect ? (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-win-400 chip-win">
            {isContrarian ? "Correct · contrarian" : "Correct"}
          </span>
        ) : isIncorrect ? (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-loss-400 chip-loss">
            Incorrect
          </span>
        ) : isClosed ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full text-slate-400 chip-closed">
            Closed · resolving soon
          </span>
        ) : isResolved ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full text-slate-400 chip-closed">
            Resolved
          </span>
        ) : isPending ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full text-gold-400 chip-open">
            Awaiting approval
          </span>
        ) : (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full text-gold-400 chip-open">
            {isVoted ? `Open · ${timeLeft}` : "Open"}
          </span>
        )}

        {/* Right value */}
        {isCorrect && payoutDelta != null ? (
          <span className="text-xs font-mono font-bold text-gold-400">
            +{payoutDelta.toLocaleString()} pts
          </span>
        ) : isCorrect && prop.userWager ? (
          <span className="text-xs font-mono font-bold text-gold-400">
            Won
          </span>
        ) : isIncorrect && prop.userWager ? (
          <span className="text-xs font-mono text-slate-500 line-through">
            −{prop.userWager.toLocaleString()} pts
          </span>
        ) : isVoted && prop.userWager ? (
          <span className="text-xs font-mono text-slate-500">
            {prop.userWager.toLocaleString()} pts wagered
          </span>
        ) : null}
      </div>
    </div>
  );
}
