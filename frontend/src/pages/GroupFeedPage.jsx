import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { groupsApi, userApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PropCard from "../components/PropCard";
import VoteModal from "../components/VoteModal";

const PAGE_SIZE = 20;

function useGroupPagedProps(groupId, status) {
  const [props, setProps] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetch = useCallback((reset = false) => {
    if (!groupId) return;
    const nextPage = reset ? 0 : page;
    setLoading(true);
    groupsApi
      .getGroupPropsPaged(groupId, status, nextPage, PAGE_SIZE)
      .then(({ data }) => {
        setProps((prev) => (reset ? data.content : [...prev, ...data.content]));
        setHasMore(!data.last);
        setTotal(data.totalElements);
        setPage(reset ? 1 : nextPage + 1);
      })
      .finally(() => setLoading(false));
  }, [groupId, status, page]);

  const reset = useCallback(() => fetch(true), [groupId, status]);

  useEffect(() => {
    fetch(true);
  }, [groupId, status]);

  return { props, loading, hasMore, total, loadMore: () => fetch(false), reset };
}

export default function GroupFeedPage() {
  const { id } = useParams();
  const { user, setUser } = useAuth();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProp, setSelectedProp] = useState(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMsg, setInviteMsg] = useState(null);
  const [inviting, setInviting] = useState(false);

  const open = useGroupPagedProps(id, "OPEN");
  const closed = useGroupPagedProps(id, "CLOSED");
  const resolved = useGroupPagedProps(id, "RESOLVED");

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      await groupsApi.inviteUser(id, { username: inviteUsername.trim() });
      setInviteMsg({ type: "success", text: `Invite sent to ${inviteUsername.trim()}!` });
      setInviteUsername("");
    } catch (err) {
      setInviteMsg({ type: "error", text: err.response?.data?.message ?? "Failed to invite user" });
    } finally {
      setInviting(false);
    }
  };

  useEffect(() => {
    groupsApi.getGroup(id)
      .then(({ data }) => setGroup(data))
      .catch(err => setError(err.response?.data?.message ?? "Failed to load group"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleVoted = async () => {
    const { data } = await userApi.getMe();
    const updated = { ...user, pointBank: data.pointBank };
    localStorage.setItem("fs_user", JSON.stringify(updated));
    setUser(updated);
    setSelectedProp(null);
    open.reset();
    closed.reset();
    resolved.reset();
  };

  const initialLoading = loading || (open.loading && open.props.length === 0);

  return (
    <>
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {initialLoading && (
          <div className="space-y-4 mt-4">
            <div className="skeleton h-16 mb-6" />
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </div>
        )}

        {error && (
          <div className="glass-card p-8 text-center">
            <p className="text-loss-400 text-sm">{error}</p>
            <Link to="/groups" className="text-oracle-400 text-xs mt-2 inline-block hover:underline">
              Back to Groups
            </Link>
          </div>
        )}

        {!initialLoading && !error && group && (
          <div className="animate-fade-in">
            {/* Group header */}
            <div className="rounded-xl p-5 mb-6 glass-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-cinzel text-xl font-bold text-slate-100">{group.name}</h1>
                  <p className="text-slate-500 text-sm mt-1">
                    {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                    {" · "}owner: {group.ownerUsername}
                  </p>
                </div>
                <div className="shrink-0 text-right flex flex-col items-end gap-2">
                  <Link to={`/groups/${id}/settings`} className="btn-ghost text-xs px-2.5 py-1">
                    Settings
                  </Link>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Invite code</p>
                    <code
                      className="text-oracle-400 text-xs font-mono px-2 py-1 rounded cursor-pointer chip-oracle"
                      onClick={() => navigator.clipboard.writeText(group.inviteCode)}
                      title="Click to copy"
                    >
                      {group.inviteCode}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Invite Member */}
            <div className="glass-card rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Invite Member</h3>
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
              <h2 className="font-cinzel text-lg font-bold text-slate-100">Open Props</h2>
              {open.total > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="live-dot" />
                  <span className="text-live text-xs font-bold uppercase tracking-wide">
                    {open.total} Live
                  </span>
                </div>
              )}
            </div>

            {open.props.length === 0 ? (
              <div className="glass-card p-8 text-center mb-10">
                <p className="text-slate-500 text-sm">No open props in this group.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-10">
                {open.props.map(prop => (
                  <PropCard key={prop.id} prop={prop} onVote={setSelectedProp} />
                ))}
                {open.hasMore && (
                  <button
                    onClick={open.loadMore}
                    disabled={open.loading}
                    className="btn-ghost w-full text-sm py-2"
                  >
                    {open.loading ? "Loading…" : "Load More"}
                  </button>
                )}
              </div>
            )}

            {/* Closed */}
            {closed.total > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-cinzel text-base font-700 text-slate-500">Closed</h2>
                  <div className="flex-1 h-px bg-void-700" />
                  <span className="text-slate-400 text-xs">{closed.total} awaiting resolution</span>
                </div>
                <div className="space-y-3 mb-10">
                  {closed.props.map(prop => (
                    <PropCard key={prop.id} prop={prop} onVote={setSelectedProp} />
                  ))}
                  {closed.hasMore && (
                    <button
                      onClick={closed.loadMore}
                      disabled={closed.loading}
                      className="btn-ghost w-full text-sm py-2"
                    >
                      {closed.loading ? "Loading…" : "Load More"}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Resolved */}
            {resolved.total > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-cinzel text-base font-700 text-slate-500">Resolved</h2>
                  <div className="flex-1 h-px bg-void-700" />
                  <span className="text-slate-400 text-xs">{resolved.total} settled</span>
                </div>
                <div className="space-y-3">
                  {resolved.props.map(prop => (
                    <PropCard key={prop.id} prop={prop} onVote={setSelectedProp} />
                  ))}
                  {resolved.hasMore && (
                    <button
                      onClick={resolved.loadMore}
                      disabled={resolved.loading}
                      className="btn-ghost w-full text-sm py-2"
                    >
                      {resolved.loading ? "Loading…" : "Load More"}
                    </button>
                  )}
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
