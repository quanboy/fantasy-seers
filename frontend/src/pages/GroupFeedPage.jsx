import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { groupsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PropCard from "../components/PropCard";
import VoteModal from "../components/VoteModal";
import { userApi } from "../api/client";

export default function GroupFeedPage() {
  const { id } = useParams();
  const { user, logout, setUser } = useAuth();

  const [group, setGroup] = useState(null);
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProp, setSelectedProp] = useState(null);

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
    <div className="min-h-screen bg-void-950">
      {/* Navbar */}
      <nav
        className="sticky top-0 z-40 border-b border-void-700"
        style={{ background: "rgba(7,8,15,0.85)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Fantasy Seers" className="w-8 h-8 object-contain" />
              <span className="font-display text-sm font-700 text-slate-400 hover:text-white transition-colors">
                Dashboard
              </span>
            </Link>
            <span className="text-slate-700">/</span>
            <Link to="/groups" className="font-display text-sm font-700 text-slate-400 hover:text-white transition-colors">
              Groups
            </Link>
            {group && (
              <>
                <span className="text-slate-700">/</span>
                <span className="font-display text-sm font-700 text-white truncate max-w-[140px]">{group.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm hidden sm:block">{user?.username}</span>
            <button
              onClick={logout}
              className="text-slate-600 hover:text-slate-400 text-xs transition-colors p-1.5 rounded-lg hover:bg-void-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <div className="space-y-4 mt-4">
            <div className="skeleton h-16 mb-6" />
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </div>
        )}

        {error && (
          <div className="glass-card p-8 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <Link to="/groups" className="text-oracle-400 text-xs mt-2 inline-block hover:underline">
              Back to Groups
            </Link>
          </div>
        )}

        {!loading && !error && group && (
          <div className="animate-fade-in">
            {/* Group header */}
            <div className="rounded-2xl p-5 mb-6"
              style={{ background: 'linear-gradient(145deg, #161825, #0E1018)', border: '1px solid #1E2235' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-xl font-700 text-white">{group.name}</h1>
                  <p className="text-slate-500 text-sm mt-1">
                    {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                    {" · "}owner: {group.ownerUsername}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-slate-600 text-xs mb-1">Invite code</p>
                  <code
                    className="text-oracle-400 text-xs font-mono px-2 py-1 rounded cursor-pointer"
                    style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
                    onClick={() => navigator.clipboard.writeText(group.inviteCode)}
                    title="Click to copy"
                  >
                    {group.inviteCode}
                  </code>
                </div>
              </div>
            </div>

            {/* Open Props */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-lg font-700 text-white">Open Props</h2>
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
                  <span className="text-slate-600 text-xs">{resolvedProps.length} settled</span>
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
      </main>

      {selectedProp && (
        <VoteModal
          prop={selectedProp}
          userPoints={user?.pointBank}
          onClose={() => setSelectedProp(null)}
          onVoted={handleVoted}
        />
      )}
    </div>
  );
}
