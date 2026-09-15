import { useState } from "react";
import { adminApi } from "../api/client";

export default function AdminDashboard() {
  const [lockSeason, setLockSeason] = useState(new Date().getFullYear().toString());
  const [locking, setLocking] = useState(false);
  const [lockMsg, setLockMsg] = useState(null);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);

  const handleLockBoards = async () => {
    setLockConfirmOpen(false);
    setLocking(true);
    setLockMsg(null);

    try {
      const { data } = await adminApi.lockBoards(Number(lockSeason));
      setLockMsg({
        type: "success",
        text: `Locked ${data.lockedBoards} board(s) for ${data.season} (${data.alreadyLockedBoards} already locked). Format: ${data.scoringFormat}${data.superflex ? ", Superflex" : ""}.`,
      });
    } catch (err) {
      setLockMsg({
        type: "error",
        text: err.response?.data?.message ?? "Failed to lock boards",
      });
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-oracle-400 font-semibold mb-2">
          Administration
        </p>
        <h1 className="font-display text-2xl font-700 text-slate-100">Board controls</h1>
        <p className="text-sm text-slate-400 mt-2">
          Freeze season rankings after confirming the league format.
        </p>
      </div>

      <section className="glass-card rounded-xl p-6">
        <h2 className="font-display text-lg font-700 text-slate-100">Lock Season Boards</h2>
        <p className="text-sm text-slate-400 mt-2 mb-5">
          This materializes default boards for users without one, stamps every board with the confirmed league format, and makes the rankings immutable.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label htmlFor="lock-season" className="text-xs text-slate-500 font-mono mb-1 block">
              Season
            </label>
            <input
              id="lock-season"
              name="lockSeason"
              type="number"
              min="2000"
              max="2100"
              value={lockSeason}
              onChange={(event) => setLockSeason(event.target.value)}
              className="input-base w-full text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setLockConfirmOpen(true)}
            disabled={locking || !lockSeason}
            className="btn-oracle px-6 py-2.5 text-sm font-semibold rounded-lg shrink-0"
          >
            {locking ? "Locking..." : "Lock Boards"}
          </button>
        </div>

        {lockMsg && (
          <p className={`text-xs mt-3 ${lockMsg.type === "success" ? "text-win-400" : "text-loss-400"}`}>
            {lockMsg.text}
          </p>
        )}
      </section>

      {lockConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={() => setLockConfirmOpen(false)}
        >
          <div
            className="glass-card rounded-xl p-6 w-full max-w-sm shadow-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="font-cinzel text-base font-bold text-slate-100 mb-1">
              Lock all boards for {lockSeason}?
            </h3>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              This action is irreversible. All user rankings will be frozen and stamped with the confirmed league format.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLockConfirmOpen(false)}
                className="btn-ghost flex-1 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLockBoards}
                className="btn-oracle flex-1 py-2.5 text-sm font-semibold rounded-lg"
              >
                Confirm Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
