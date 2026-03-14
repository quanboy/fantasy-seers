import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { groupsApi } from "../api/client";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const fetchGroups = () => {
    groupsApi.getMyGroups()
      .then(({ data }) => setGroups(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreateLoading(true);
    setCreateError("");
    try {
      await groupsApi.createGroup({ name: createName.trim() });
      setCreateName("");
      fetchGroups();
    } catch (err) {
      setCreateError(err.response?.data?.message ?? "Failed to create group");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError("");
    try {
      await groupsApi.joinGroup({ inviteCode: joinCode.trim() });
      setJoinCode("");
      fetchGroups();
    } catch (err) {
      setJoinError(err.response?.data?.message ?? "Invalid invite code");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Create + Join forms */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {/* Create */}
          <div className="rounded-2xl p-5 glass-card">
            <h2 className="font-display text-sm font-700 text-slate-900 mb-4">Create a Group</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                placeholder="Group name"
                className="input-base text-sm"
                maxLength={100}
              />
              {createError && <p className="text-loss-700 text-xs">{createError}</p>}
              <button
                type="submit"
                disabled={createLoading || !createName.trim()}
                className="btn-oracle py-2.5 text-sm"
              >
                {createLoading ? "Creating…" : "Create"}
              </button>
            </form>
          </div>

          {/* Join */}
          <div className="rounded-2xl p-5 glass-card">
            <h2 className="font-display text-sm font-700 text-slate-900 mb-4">Join a Group</h2>
            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="Invite code (e.g. A1B2C3D4)"
                className="input-base text-sm uppercase"
                maxLength={20}
              />
              {joinError && <p className="text-loss-700 text-xs">{joinError}</p>}
              <button
                type="submit"
                disabled={joinLoading || !joinCode.trim()}
                className="btn-oracle py-2.5 text-sm"
              >
                {joinLoading ? "Joining…" : "Join"}
              </button>
            </form>
          </div>
        </div>

        {/* Group list */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display text-lg font-700 text-slate-900">Your Groups</h2>
          {groups.length > 0 && (
            <span className="text-slate-400 text-xs">{groups.length} group{groups.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="skeleton h-20" />)}
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="glass-card p-10 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-slate-500 text-sm">No groups yet.</p>
            <p className="text-slate-400 text-xs mt-1">Create one or join with an invite code.</p>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="space-y-3">
            {groups.map(group => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="block rounded-2xl p-5 transition-all glass-card-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{group.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                      {" · "}owner: {group.ownerUsername}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-slate-400 text-xs mb-1">Invite code</p>
                    <code
                      className="text-oracle-600 text-xs font-mono px-2 py-1 rounded chip-oracle"
                      onClick={e => {
                        e.preventDefault();
                        navigator.clipboard.writeText(group.inviteCode);
                      }}
                      title="Click to copy"
                    >
                      {group.inviteCode}
                    </code>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
