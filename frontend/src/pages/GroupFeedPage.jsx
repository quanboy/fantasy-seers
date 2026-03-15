import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { groupsApi, userApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PropCard from "../components/PropCard";
import VoteModal from "../components/VoteModal";

export default function GroupFeedPage() {
  const { id } = useParams();
  const { user, setUser } = useAuth();

  const [group, setGroup] = useState(null);
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProp, setSelectedProp] = useState(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMsg, setInviteMsg] = useState(null);
  const [inviting, setInviting] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const { data } = await groupsApi.inviteUser(id, { username: inviteUsername.trim() });
      setInviteMsg({ type: "success", text: `Invite sent to ${inviteUsername.trim()}!` });
      setInviteUsername("");
    } catch (err) {
      setInviteMsg({ type: "error", text: err.response?.data?.message ?? "Failed to invite user" });
    } finally {
      setInviting(false);
    }
  };

  const fetchAll = () => {
    Promise.all([
      groupsApi.getGroup(id),
      groupsApi.getGroupProps(id),
    ])
      .then(([{ data: g }, { data: p }]) => {
        setGroup(g);
        setProps(p);
      })
      .catch(err => {
        setError(err.response?.data?.message ?? "Failed to load group");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleVoted = async () => {
    const { data } = await userApi.getMe();
    const updated = { ...user, pointBank: data.pointBank };
    localStorage.setItem("fs_user", JSON.stringify(updated));
    setUser(updated);
    setSelectedProp(null);
    fetchAll();
  };

  const openProps = props.filter(p => p.status === "OPEN");
  const resolvedProps = props.filter(p => p.status === "RESOLVED");

  return (
    <>
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <div className="space-y-4 mt-4">
            <div className="skeleton h-16 mb-6" />
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </div>
        )}

        {error && (
          <div className="glass-card p-8 text-center">
            <p className="text-loss-700 text-sm">{error}</p>
            <Link to="/groups" className="text-oracle-600 text-xs mt-2 inline-block hover:underline">
              Back to Groups
            </Link>
          </div>
        )}

        {!loading && !error && group && (
          <div className="animate-fade-in">
            {/* Group header */}
            <div className="rounded-2xl p-5 mb-6 glass-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-xl font-700 text-slate-900">{group.name}</h1>
                  <p className="text-slate-500 text-sm mt-1">
                    {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                    {" · "}owner: {group.ownerUsername}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-slate-400 text-xs mb-1">Invite code</p>
                  <code
                    className="text-oracle-600 text-xs font-mono px-2 py-1 rounded cursor-pointer chip-oracle"
                    onClick={() => navigator.clipboard.writeText(group.inviteCode)}
                    title="Click to copy"
                  >
                    {group.inviteCode}
                  </code>
                </div>
              </div>
            </div>

            {/* Invite Member */}
            <div className="glass-card rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Invite Member</h3>
              <form onSubmit={handleInvite} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter username"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="input-base flex-1 text-sm"
                />
                <button type="submit" disabled={inviting || !inviteUsername.trim()} className="btn-oracle text-sm">
                  {inviting ? "Inviting…" : "Invite"}
                </button>
              </form>
              {inviteMsg && (
                <p className={`text-xs mt-2 ${inviteMsg.type === "success" ? "text-win-400" : "text-loss-400"}`}>
                  {inviteMsg.text}
                </p>
              )}
            </div>

            {/* Open Props */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-lg font-700 text-slate-900">Open Props</h2>
              {openProps.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="live-dot" />
                  <span className="text-live text-xs font-bold uppercase tracking-wide">
                    {openProps.length} Live
                  </span>
                </div>
              )}
            </div>

            {openProps.length === 0 ? (
              <div className="glass-card p-10 text-center mb-10">
                <div className="text-4xl mb-3">🔮</div>
                <p className="text-slate-500 text-sm">No open props in this group.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-10">
                {openProps.map(prop => (
                  <PropCard key={prop.id} prop={prop} onVote={setSelectedProp} />
                ))}
              </div>
            )}

            {/* Resolved */}
            {resolvedProps.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-display text-base font-700 text-slate-500">Resolved</h2>
                  <div className="flex-1 h-px bg-void-700" />
                  <span className="text-slate-400 text-xs">{resolvedProps.length} settled</span>
                </div>
                <div className="space-y-3">
                  {resolvedProps.map(prop => (
                    <PropCard key={prop.id} prop={prop} onVote={setSelectedProp} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
    </div>

      {selectedProp && (
        <VoteModal
          prop={selectedProp}
          userPoints={user?.pointBank}
          onClose={() => setSelectedProp(null)}
          onVoted={handleVoted}
        />
      )}
    </>
  );
}
