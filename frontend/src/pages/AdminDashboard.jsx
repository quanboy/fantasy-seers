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

  // Resolve state
  const [closed, setClosed] = useState([]);
  const [closedLoading, setClosedLoading] = useState(true);
  const [closedError, setClosedError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveErrors, setResolveErrors] = useState({});
  const [groupsError, setGroupsError] = useState(null);

  // Confirm modal state: { type: 'approve'|'reject'|'resolve', propId, propTitle, result? }
  const [pendingAction, setPendingAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPending = () => {
    setFetchError(false);
    adminApi
      .getPending()
      .then(({ data }) => setPending(data))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  };

  const fetchClosed = () => {
    setClosedError(null);
    adminApi
      .getClosed()
      .then(({ data }) => setClosed(data))
      .catch((err) => setClosedError(err.response?.data?.message || "Failed to load closed props."))
      .finally(() => setClosedLoading(false));
  };

  useEffect(() => {
    fetchPending();
    fetchClosed();
    adminApi.getAllGroups()
      .then(({ data }) => setGroups(data))
      .catch((err) => setGroupsError(err.response?.data?.message || "Failed to load groups."));
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

  const openConfirm = (type, prop, result = null) => {
    setPendingAction({ type, propId: prop.id, propTitle: prop.title, result });
    setRejectReason("");
  };

  const closeConfirm = () => {
    setPendingAction(null);
    setRejectReason("");
  };

  const executeAction = async () => {
    if (!pendingAction) return;
    const { type, propId, result } = pendingAction;
    closeConfirm();

    if (type === "approve") {
      setActioningId(propId);
      setActionErrors((prev) => ({ ...prev, [propId]: null }));
      try {
        await adminApi.approve(propId);
        setPending((prev) => prev.filter((p) => p.id !== propId));
      } catch {
        setActionErrors((prev) => ({ ...prev, [propId]: "Failed to approve. Try again." }));
      } finally {
        setActioningId(null);
      }
    } else if (type === "reject") {
      setActioningId(propId);
      setActionErrors((prev) => ({ ...prev, [propId]: null }));
      try {
        await adminApi.reject(propId);
        setPending((prev) => prev.filter((p) => p.id !== propId));
      } catch {
        setActionErrors((prev) => ({ ...prev, [propId]: "Failed to reject. Try again." }));
      } finally {
        setActioningId(null);
      }
    } else if (type === "resolve") {
      setResolvingId(propId);
      setResolveErrors((prev) => ({ ...prev, [propId]: null }));
      try {
        await adminApi.resolve(propId, result);
        setClosed((prev) => prev.filter((p) => p.id !== propId));
      } catch (err) {
        setResolveErrors((prev) => ({ ...prev, [propId]: err.response?.data?.message ?? "Failed to resolve." }));
      } finally {
        setResolvingId(null);
      }
    }
  };

  const confirmMeta = pendingAction ? {
    approve: {
      heading: "Approve this prop?",
      body: "It will go live immediately and users can start voting.",
      confirmLabel: "Approve",
      confirmClass: "btn-approve",
    },
    reject: {
      heading: "Reject this prop?",
      body: "This action cannot be undone. The submitter will need to resubmit.",
      confirmLabel: "Reject",
      confirmClass: "btn-reject",
    },
    resolve: {
      heading: `Resolve as ${pendingAction.result}?`,
      body: pendingAction.result === "YES"
        ? "Users who voted YES will receive their payouts."
        : "Users who voted NO will receive their payouts.",
      confirmLabel: `Confirm ${pendingAction.result}`,
      confirmClass: pendingAction.result === "YES" ? "btn-approve" : "btn-reject",
    },
  }[pendingAction.type] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

      {/* Confirm Modal */}
      {pendingAction && confirmMeta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={closeConfirm}
        >
          <div
            className="glass-card rounded-xl p-6 w-full max-w-sm shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-cinzel text-base font-bold text-slate-100 mb-1">
              {confirmMeta.heading}
            </h3>
            <p className="text-slate-400 text-xs mb-1 leading-relaxed">{confirmMeta.body}</p>
            <p className="text-slate-500 text-xs font-mono mb-4 truncate">
              "{pendingAction.propTitle}"
            </p>

            {pendingAction.type === "reject" && (
              <textarea
                placeholder="Reason for rejection (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="input-base w-full text-sm resize-none mb-4"
              />
            )}

            <div className="flex gap-3">
              <button onClick={closeConfirm} className="btn-ghost flex-1 py-2.5 text-sm">
                Cancel
              </button>
              <button onClick={executeAction} className={`${confirmMeta.confirmClass} flex-1 py-2.5 text-sm font-semibold rounded-lg`}>
                {confirmMeta.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Create Prop */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <h2 className="font-display text-lg font-700 text-slate-100 mb-4">Create Prop</h2>
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
              <option value="">{groupsError ? "Global only (groups failed to load)" : "Global (no group)"}</option>
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
        <h2 className="font-display text-lg font-700 text-slate-100 mb-4">Pending Props</h2>

        {loading && (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="skeleton h-40" />)}
          </div>
        )}

        {!loading && fetchError && (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-500 text-sm mb-4">Failed to load pending props.</p>
            <button onClick={fetchPending}
              className="btn-oracle px-6 py-2.5 text-sm">
              Try Again
            </button>
          </div>
        )}

        {!loading && !fetchError && pending.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-500 text-sm">No pending props.</p>
          </div>
        )}

        {!loading && !fetchError && pending.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            {pending.map((prop) => (
              <div key={prop.id} className="rounded-xl p-6 transition-all glass-card card-pending-border shadow-card">

                {/* Top row */}
                <div className="flex items-center justify-between mb-3">
                  <span className={getSportClass(prop.sport)}>{prop.sport}</span>
                  <span className="text-slate-400 text-xs">
                    by <span className="text-slate-400 font-semibold">{prop.createdBy}</span>
                  </span>
                </div>

                {/* Title */}
                <p className="font-body font-semibold text-slate-200 text-base leading-snug mb-1">
                  {prop.title}
                </p>

                {/* Description */}
                {prop.description && (
                  <p className="text-slate-500 text-sm mb-3 leading-relaxed">{prop.description}</p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-400 font-mono mb-5">
                  <span>
                    Closes {new Date(prop.closesAt).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  {prop.minWager && <span>Min {prop.minWager.toLocaleString()} pts</span>}
                  {prop.maxWager && <span>Max {prop.maxWager.toLocaleString()} pts</span>}
                </div>

                {actionErrors[prop.id] && (
                  <p className="text-loss-400 text-xs mb-3 px-3 py-2 rounded-lg alert-error">
                    {actionErrors[prop.id]}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => openConfirm("approve", prop)}
                    disabled={actioningId === prop.id}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-approve"
                  >
                    {actioningId === prop.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-win-700/30 border-t-win-700 rounded-full animate-spin" />
                        Approving...
                      </span>
                    ) : "Approve"}
                  </button>
                  <button
                    onClick={() => openConfirm("reject", prop)}
                    disabled={actioningId === prop.id}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-reject"
                  >
                    {actioningId === prop.id ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Resolve Props */}
        <div className="flex items-center gap-3 mt-10 mb-4">
          <h2 className="font-display text-lg font-700 text-slate-100">Resolve Props</h2>
          {closed.length > 0 && (
            <span className="text-slate-500 text-xs font-mono">{closed.length} awaiting</span>
          )}
        </div>

        {closedLoading && (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="skeleton h-20" />)}
          </div>
        )}

        {!closedLoading && closedError && (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-500 text-sm mb-4">{closedError}</p>
            <button onClick={fetchClosed} className="btn-oracle px-6 py-2.5 text-sm">
              Try Again
            </button>
          </div>
        )}

        {!closedLoading && !closedError && closed.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-500 text-sm">No closed props to resolve.</p>
          </div>
        )}

        {!closedLoading && !closedError && closed.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            {closed.map((prop) => (
              <div key={prop.id} className="rounded-xl p-5 glass-card shadow-card">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={getSportClass(prop.sport)}>{prop.sport}</span>
                      <span className="text-slate-500 text-xs font-mono">
                        Closed {new Date(prop.closesAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="font-body font-semibold text-slate-200 text-sm leading-snug">
                      {prop.title}
                    </p>
                  </div>

                  <div className="flex gap-1.5 shrink-0 pt-1">
                    <button
                      onClick={() => openConfirm("resolve", prop, "YES")}
                      disabled={resolvingId === prop.id}
                      className="btn-approve text-xs px-3 py-1.5 font-medium disabled:opacity-50"
                    >
                      {resolvingId === prop.id ? "..." : "YES"}
                    </button>
                    <button
                      onClick={() => openConfirm("resolve", prop, "NO")}
                      disabled={resolvingId === prop.id}
                      className="btn-reject text-xs px-3 py-1.5 font-medium disabled:opacity-50"
                    >
                      NO
                    </button>
                  </div>
                </div>

                {resolveErrors[prop.id] && (
                  <p className="text-loss-400 text-xs mt-2 px-2 py-1 rounded alert-error">
                    {resolveErrors[prop.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
