import { useState, useEffect } from "react";
import { adminApi } from "../api/client";

const SPORT_CLASSES = {
  NFL: "sport-nfl",
  NBA: "sport-nba",
  MLB: "sport-mlb",
  NHL: "sport-nhl",
};
const SPORTS = ["NFL", "NBA", "MLB", "NHL"];
function getSportClass(sport) {
  return SPORT_CLASSES[sport] ?? "sport-default";
}

export default function AdminDashboard() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [actionErrors, setActionErrors] = useState({});

  // Create prop state
  const [groups, setGroups] = useState([]);
  const [createForm, setCreateForm] = useState({ title: "", description: "", sport: "NFL", closesAt: "", groupId: "" });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  const fetchPending = () => {
    setFetchError(false);
    adminApi
      .getPending()
      .then(({ data }) => setPending(data))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
    adminApi.getAllGroups().then(({ data }) => setGroups(data)).catch(() => {});
  }, []);

  const handleCreateProp = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    try {
      const payload = {
        title: createForm.title,
        description: createForm.description || null,
        sport: createForm.sport,
        closesAt: createForm.closesAt,
        groupId: createForm.groupId ? Number(createForm.groupId) : null,
      };
      await adminApi.createProp(payload);
      setCreateMsg({ type: "success", text: "Prop created!" });
      setCreateForm({ title: "", description: "", sport: "NFL", closesAt: "", groupId: "" });
    } catch (err) {
      setCreateMsg({ type: "error", text: err.response?.data?.message ?? "Failed to create prop" });
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (id) => {
    if (actioningId) return;
    setActioningId(id);
    setActionErrors((prev) => ({ ...prev, [id]: null }));
    try {
      await adminApi.approve(id);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setActionErrors((prev) => ({ ...prev, [id]: "Failed to approve. Try again." }));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id) => {
    if (actioningId) return;
    setActioningId(id);
    setActionErrors((prev) => ({ ...prev, [id]: null }));
    try {
      await adminApi.reject(id);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setActionErrors((prev) => ({ ...prev, [id]: "Failed to reject. Try again." }));
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Create Prop */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="font-display text-lg font-700 text-slate-900 mb-4">Create Prop</h2>
          <form onSubmit={handleCreateProp} className="space-y-3">
            <input
              type="text"
              placeholder="Prop title"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="input-base w-full text-sm"
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="input-base w-full text-sm"
            />
            <div className="flex gap-3">
              <select
                value={createForm.sport}
                onChange={(e) => setCreateForm({ ...createForm, sport: e.target.value })}
                className="input-base text-sm flex-1"
              >
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="datetime-local"
                value={createForm.closesAt}
                onChange={(e) => setCreateForm({ ...createForm, closesAt: e.target.value })}
                className="input-base text-sm flex-1"
                required
              />
            </div>
            <select
              value={createForm.groupId}
              onChange={(e) => setCreateForm({ ...createForm, groupId: e.target.value })}
              className="input-base w-full text-sm"
            >
              <option value="">Global (no group)</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button type="submit" disabled={creating} className="btn-oracle w-full py-2.5 text-sm">
              {creating ? "Creating…" : "Create Prop"}
            </button>
            {createMsg && (
              <p className={`text-xs ${createMsg.type === "success" ? "text-win-400" : "text-loss-400"}`}>
                {createMsg.text}
              </p>
            )}
          </form>
        </div>

        {/* Pending Props */}
        <h2 className="font-display text-lg font-700 text-slate-900 mb-4">Pending Props</h2>

        {loading && (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="skeleton h-40" />)}
          </div>
        )}

        {!loading && fetchError && (
          <div className="glass-card p-10 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-slate-500 text-sm mb-5">Failed to load pending props.</p>
            <button onClick={fetchPending}
              className="btn-oracle px-6 py-2.5 text-sm">
              Try Again
            </button>
          </div>
        )}

        {!loading && !fetchError && pending.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="text-4xl mb-3 animate-float inline-block">✅</div>
            <p className="font-display text-lg font-700 text-slate-900 mb-1">Queue is empty</p>
            <p className="text-slate-500 text-sm">No pending props — you're all caught up.</p>
          </div>
        )}

        {!loading && !fetchError && pending.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            {pending.map((prop) => (
              <div key={prop.id} className="rounded-2xl p-6 transition-all glass-card card-pending-border shadow-card">

                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <span className={getSportClass(prop.sport)}>{prop.sport}</span>
                  <span className="text-slate-400 text-xs">
                    by <span className="text-slate-600 font-semibold">{prop.createdBy}</span>
                  </span>
                </div>

                {/* Title */}
                <p className="font-body font-semibold text-slate-800 text-base leading-snug mb-1">
                  {prop.title}
                </p>

                {/* Description */}
                {prop.description && (
                  <p className="text-slate-500 text-sm mb-3 leading-relaxed">{prop.description}</p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-5">
                  <span>
                    ⏰ Closes {new Date(prop.closesAt).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  {prop.minWager && <span>↓ Min {prop.minWager.toLocaleString()} pts</span>}
                  {prop.maxWager && <span>↑ Max {prop.maxWager.toLocaleString()} pts</span>}
                </div>

                {actionErrors[prop.id] && (
                  <p className="text-loss-700 text-xs mb-3 px-3 py-2 rounded-lg alert-error">
                    {actionErrors[prop.id]}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(prop.id)}
                    disabled={actioningId === prop.id}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-approve"
                  >
                    {actioningId === prop.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-win-700/30 border-t-win-700 rounded-full animate-spin" />
                        Approving...
                      </span>
                    ) : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(prop.id)}
                    disabled={actioningId === prop.id}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-reject"
                  >
                    {actioningId === prop.id ? "Rejecting..." : "✕ Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
