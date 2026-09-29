import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuthDialog } from "../context/AuthDialogContext";
import { propsApi, userApi } from "../api/client";
import PropCard from "../components/PropCard";
import VoteModal from "../components/VoteModal";
import SubmitPropCard from "../components/SubmitPropCard";

function SkeletonCard() {
  return <div className="skeleton h-28 mb-4" />;
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const isGuest = !user;
  const { openAuthDialog } = useAuthDialog();
  const [props, setProps] = useState([]);
  const [selectedProp, setSelectedProp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [sportFilter, setSportFilter] = useState("ALL");
  // A vote a guest started before signing in; resumed once they're signed in.
  const [pendingVote, setPendingVote] = useState(null);
  const [voteNotice, setVoteNotice] = useState(null);

  const fetchProps = () => {
    setError(null);
    propsApi
      .getPublic()
      .then(({ data }) => setProps(data.content || data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load props."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProps();
    if (isGuest) return;
    userApi.getMe()
      .then(({ data }) => {
        if (!data.favoriteNflTeam && !data.favoriteNbaTeam && !data.almaMater) {
          setProfileIncomplete(true);
        }
      })
      .catch(() => {});
  }, [isGuest]);

  const handleVoted = async () => {
    const { data } = await userApi.getMe();
    const updated = { ...user, pointBank: data.pointBank };
    localStorage.setItem("fs_user", JSON.stringify(updated));
    setUser(updated);
    setSelectedProp(null);
    fetchProps();
  };

  // Guests sign in first; the vote then reopens for explicit confirmation (never auto-submitted).
  const handleVote = isGuest
    ? (vote) => openAuthDialog("login", { onAuthenticated: () => setPendingVote(vote) })
    : setSelectedProp;

  useEffect(() => {
    if (!pendingVote || isGuest) return;
    const vote = pendingVote;
    setPendingVote(null);
    Promise.all([propsApi.getById(vote.id), userApi.getMe()])
      .then(([{ data: prop }, { data: me }]) => {
        setUser((current) => {
          const updated = { ...current, pointBank: me.pointBank };
          localStorage.setItem("fs_user", JSON.stringify(updated));
          return updated;
        });
        if (prop.userChoice) {
          setVoteNotice("You already voted on this prop.");
        } else if (prop.status !== "OPEN" || new Date(prop.closesAt) <= new Date()) {
          setVoteNotice("Voting has closed.");
        } else {
          setSelectedProp({ ...prop, _initialChoice: vote._initialChoice, _initialWager: vote._initialWager });
        }
      })
      .catch(() => setVoteNotice("Couldn't load that prop. Please try again."))
      .finally(fetchProps);
  }, [pendingVote, isGuest]);

  const filtered = useMemo(() => {
    if (sportFilter === "ALL") return props;
    return props.filter((p) => p.sport === sportFilter);
  }, [props, sportFilter]);

  const sports = useMemo(() => {
    const set = new Set(props.map((p) => p.sport));
    return ["ALL", ...["NFL", "NBA", "MLB", "NHL"].filter((s) => set.has(s))];
  }, [props]);

  const openProps = filtered.filter((p) => p.status === "OPEN");
  const closedProps = filtered.filter((p) => p.status === "CLOSED");
  const resolvedProps = filtered.filter((p) => p.status === "RESOLVED");

  return (
    <>
    <div className="max-w-2xl mx-auto py-6 sm:py-8">
        {loading && (
          <div className="space-y-4 mt-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && error && (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <button onClick={fetchProps} className="btn-oracle px-6 py-2.5 text-sm">
              Try Again
            </button>
          </div>
        )}

        {voteNotice && (
          <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-void-600 bg-void-800 px-4 py-3">
            <p className="text-sm text-slate-200">{voteNotice}</p>
            <button
              type="button"
              onClick={() => setVoteNotice(null)}
              aria-label="Dismiss"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-void-700 hover:text-slate-200"
            >
              ×
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="animate-fade-in">
            {/* Profile completion banner */}
            {!isGuest && profileIncomplete && !profileBannerDismissed && (
              <div className="chip-gold rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
                <p className="text-sm text-gold-400">
                  Complete your profile — add your favorite teams and alma mater.{' '}
                  <Link to="/profile" className="font-semibold underline underline-offset-2">
                    Go to Profile
                  </Link>
                </p>
                <button
                  type="button"
                  onClick={() => setProfileBannerDismissed(true)}
                  aria-label="Dismiss profile reminder"
                  className="text-gold-500 hover:text-gold-700 ml-3 shrink-0 w-11 h-11 flex items-center justify-center rounded-lg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {/* Composer */}
            {!isGuest && <SubmitPropCard onSubmitted={fetchProps} />}

            {/* Sport filter pills */}
            {sports.length > 2 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {sports.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setSportFilter(sport)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      sportFilter === sport ? "chip-oracle-active" : "chip-oracle"
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            )}

            {/* Open Props header */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-cinzel text-lg font-700 text-slate-100">
                Public Props
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
              <div className="glass-card p-8 text-center mb-10">
                <p className="text-slate-500 text-sm">
                  No open props right now.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-10">
                {openProps.map((prop) => (
                  <PropCard
                    key={prop.id}
                    prop={prop}
                    onVote={handleVote}
                  />
                ))}
              </div>
            )}

            {/* Closed Props */}
            {closedProps.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-cinzel text-base font-700 text-slate-500">
                    Closed
                  </h2>
                  <div className="flex-1 h-px bg-void-700" />
                  <span className="text-slate-400 text-xs">
                    {closedProps.length} awaiting results
                  </span>
                </div>
                <div className="space-y-3 mb-10">
                  {closedProps.map((prop) => (
                    <PropCard
                      key={prop.id}
                      prop={prop}
                      onVote={handleVote}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Resolved Props */}
            {resolvedProps.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-cinzel text-base font-700 text-slate-500">
                    Resolved
                  </h2>
                  <div className="flex-1 h-px bg-void-700" />
                  <span className="text-slate-400 text-xs">
                    {resolvedProps.length} settled
                  </span>
                </div>
                <div className="space-y-3">
                  {resolvedProps.map((prop) => (
                    <PropCard
                      key={prop.id}
                      prop={prop}
                      onVote={handleVote}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Vote Modal */}
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
