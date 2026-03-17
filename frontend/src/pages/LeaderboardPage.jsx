import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { leaderboardApi, groupsApi } from "../api/client";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState("global");

  useEffect(() => {
    groupsApi.getMyGroups().then(({ data }) => setGroups(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetch = activeTab === "global"
      ? leaderboardApi.getGlobal()
      : leaderboardApi.getByGroup(activeTab);

    fetch
      .then(({ data }) => setEntries(data.entries))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const medalColor = (rank) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-slate-300";
    if (rank === 3) return "text-amber-600";
    return "text-slate-500";
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setActiveTab("global")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "global"
              ? "bg-void-700 border border-void-600 text-slate-200"
              : "bg-void-800 border border-void-700 text-slate-500 hover:text-slate-300"
          }`}
        >
          Global
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveTab(g.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === g.id
                ? "bg-void-700 border border-void-600 text-slate-200"
                : "bg-void-800 border border-void-700 text-slate-500 hover:text-slate-300"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[3rem_1fr_4.5rem_4.5rem_5rem] px-4 py-2.5 border-b border-void-700 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
          <span>#</span>
          <span>User</span>
          <span className="text-right">Picks</span>
          <span className="text-right">Correct</span>
          <span className="text-right">Accuracy</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-11 mx-4 my-1.5 rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && entries.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">No resolved picks yet.</p>
          </div>
        )}

        {/* Rows */}
        {!loading && entries.length > 0 && (
          <div>
            {entries.map((entry) => {
              const isMe = entry.username === user?.username;
              return (
                <div
                  key={entry.username}
                  className={`grid grid-cols-[3rem_1fr_4.5rem_4.5rem_5rem] px-4 py-2.5 border-b border-void-700/50 items-center transition-colors ${
                    isMe ? "bg-oracle-500/8" : "hover:bg-void-800/50"
                  }`}
                >
                  <span className={`text-sm font-mono font-bold ${medalColor(entry.rank)}`}>
                    {entry.rank}
                  </span>
                  <span className={`text-sm truncate ${isMe ? "text-slate-100 font-semibold" : "text-slate-300"}`}>
                    {entry.username}
                    {isMe && <span className="text-slate-500 text-xs ml-1.5">(you)</span>}
                  </span>
                  <span className="text-sm text-slate-400 font-mono text-right">
                    {entry.totalPicks}
                  </span>
                  <span className="text-sm text-slate-400 font-mono text-right">
                    {entry.correctPicks}
                  </span>
                  <span className={`text-sm font-mono font-medium text-right ${
                    entry.accuracy >= 60 ? "text-win-400" : entry.accuracy >= 40 ? "text-slate-200" : "text-loss-400"
                  }`}>
                    {entry.accuracy.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
