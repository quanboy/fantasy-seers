import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { propsApi, userApi } from "../api/client";
import PropCard from "../components/PropCard";
import VoteModal from "../components/VoteModal";
import SubmitPropCard from "../components/SubmitPropCard";

function getTierInfo(points) {
  if (points >= 50000)
    return {
      label: "Legend",
      color: "text-gold-400",
      bg: "rgba(217,119,6,0.15)",
      border: "rgba(245,158,11,0.3)",
    };
  if (points >= 15000)
    return {
      label: "Elite",
      color: "text-oracle-300",
      bg: "rgba(124,58,237,0.15)",
      border: "rgba(139,92,246,0.3)",
    };
  if (points >= 5000)
    return {
      label: "Pro",
      color: "text-win-400",
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(52,211,153,0.25)",
    };
  return {
    label: "Rookie",
    color: "text-slate-400",
    bg: "rgba(71,85,105,0.15)",
    border: "rgba(100,116,139,0.25)",
  };
}

function NavbarLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/logo.png"
        alt="Fantasy Seers"
        className="w-20 h-20 object-contain drop-shadow-[0_0_22px_rgba(168,85,247,0.6)]"
      />
      <span className="font-display text-lg font-700 text-white tracking-tight">
        Welcome to Fantasy Seers
      </span>
    </div>
  );
}

function SkeletonCard() {
  return <div className="skeleton h-28 mb-4" />;
}

export default function Dashboard() {
  const { user, logout, setUser } = useAuth();
  const [props, setProps] = useState([]);
  const [selectedProp, setSelectedProp] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProps = () => {
    propsApi
      .getPublic()
      .then(({ data }) => setProps(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProps();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await userApi.getMe();
      const updated = { ...user, pointBank: data.pointBank };
      localStorage.setItem("fs_user", JSON.stringify(updated));
      setUser(updated);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleVoted = async () => {
    const { data } = await userApi.getMe();
    const updated = { ...user, pointBank: data.pointBank };
    localStorage.setItem("fs_user", JSON.stringify(updated));
    setUser(updated);
    setSelectedProp(null);
  };

  const tier = getTierInfo(user?.pointBank ?? 0);
  const openProps = props.filter((p) => p.status === "OPEN");
  const resolvedProps = props.filter((p) => p.status === "RESOLVED");

  return (
    <div className="min-h-screen bg-void-950">
      {/* Navbar */}
      <nav
        className="sticky top-0 z-40 border-b border-void-700"
        style={{
          background: "rgba(7,8,15,0.85)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <NavbarLogo />

          <div className="flex items-center gap-3">
            {/* Points + tier */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" fill="#F59E0B" opacity="0.9" />
                  <text
                    x="6"
                    y="9"
                    textAnchor="middle"
                    fontSize="7"
                    fill="#07080F"
                    fontWeight="bold"
                  >
                    ⚡
                  </text>
                </svg>
                <span className="text-gold-400 font-bold text-sm tabular-nums">
                  {user?.pointBank?.toLocaleString() ?? 0}
                </span>
              </div>

              <div
                className="hidden sm:flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold"
                style={{
                  background: tier.bg,
                  border: `1px solid ${tier.border}`,
                  color: "inherit",
                }}
              >
                <span className={tier.color}>{tier.label}</span>
              </div>
            </div>

            <span className="text-slate-500 text-sm hidden sm:block">
              {user?.username}
            </span>

            {user?.role === "ADMIN" && (
              <a
                href="/admin"
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                style={{
                  background: "rgba(217,119,6,0.12)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  color: "#FBBF24",
                }}
              >
                Admin
              </a>
            )}

            <button
              onClick={logout}
              className="text-slate-600 hover:text-slate-400 text-xs transition-colors p-1.5 rounded-lg hover:bg-void-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Feed */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <div className="space-y-4 mt-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && (
          <div className="animate-fade-in">
            {/* Composer */}
            <SubmitPropCard onSubmitted={fetchProps} />

            {/* Open Props header */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-lg font-700 text-white">
                Open Props
              </h2>
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
                <div className="text-4xl mb-3 animate-float inline-block">
                  🔮
                </div>
                <p className="text-slate-500 text-sm">
                  No open props right now.
                </p>
                <p className="text-slate-600 text-xs mt-1">
                  Be the first — create one above.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-10">
                {openProps.map((prop) => (
                  <PropCard
                    key={prop.id}
                    prop={prop}
                    onVote={setSelectedProp}
                  />
                ))}
              </div>
            )}

            {/* Resolved Props */}
            {resolvedProps.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-display text-base font-700 text-slate-500">
                    Resolved
                  </h2>
                  <div className="flex-1 h-px bg-void-700" />
                  <span className="text-slate-600 text-xs">
                    {resolvedProps.length} settled
                  </span>
                </div>
                <div className="space-y-3">
                  {resolvedProps.map((prop) => (
                    <PropCard
                      key={prop.id}
                      prop={prop}
                      onVote={setSelectedProp}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Vote Modal */}
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
