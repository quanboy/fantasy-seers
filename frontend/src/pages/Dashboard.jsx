import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { propsApi, userApi } from "../api/client";
import PropCard from "../components/PropCard";
import VoteModal from "../components/VoteModal";
import SubmitPropCard from "../components/SubmitPropCard";

const PAGE_SIZE = 20;

function SkeletonCard() {
  return <div className="skeleton h-28 mb-4" />;
}

function usePagedProps(status) {
  const [props, setProps] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetch = useCallback((reset = false) => {
    const nextPage = reset ? 0 : page;
    setLoading(true);
    propsApi
      .getPublicPaged(status, nextPage, PAGE_SIZE)
      .then(({ data }) => {
        setProps((prev) => (reset ? data.content : [...prev, ...data.content]));
        setHasMore(!data.last);
        setTotal(data.totalElements);
        setPage(reset ? 1 : nextPage + 1);
      })
      .finally(() => setLoading(false));
  }, [status, page]);

  const reset = useCallback(() => fetch(true), [status]);

  useEffect(() => {
    fetch(true);
  }, [status]);

  return { props, loading, hasMore, total, loadMore: () => fetch(false), reset };
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [selectedProp, setSelectedProp] = useState(null);
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const open = usePagedProps("OPEN");
  const closed = usePagedProps("CLOSED");
  const resolved = usePagedProps("RESOLVED");

  useEffect(() => {
    userApi.getMe().then(({ data }) => {
      if (!data.favoriteNflTeam && !data.favoriteNbaTeam && !data.almaMater) {
        setProfileIncomplete(true);
      }
    });
  }, []);

  // Track initial load across all sections
  useEffect(() => {
    if (!open.loading && !closed.loading && !resolved.loading) {
      setInitialLoading(false);
    }
  }, [open.loading, closed.loading, resolved.loading]);

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
    open.reset();
    closed.reset();
    resolved.reset();
  };

  const handleSubmitted = () => {
    open.reset();
  };

  return (
    <>
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {initialLoading && (
          <div className="space-y-4 mt-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!initialLoading && (
          <div className="animate-fade-in">
            {/* Profile completion banner */}
            {profileIncomplete && !profileBannerDismissed && (
              <div className="chip-gold rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
                <p className="text-sm text-gold-400">
                  Complete your profile — add your favorite teams and alma mater.{' '}
                  <Link to="/profile" className="font-semibold underline underline-offset-2">
                    Go to Profile
                  </Link>
                </p>
                <button
                  onClick={() => setProfileBannerDismissed(true)}
                  className="text-gold-500 hover:text-gold-700 ml-3 shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            {/* Composer */}
            <SubmitPropCard onSubmitted={handleSubmitted} />

            {/* Open Props header */}
            <div className="flex items-center gap-3 mb-4">
              <h1 className="font-cinzel text-xl font-bold text-slate-100">
                Public Props
              </h1>
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
                <p className="text-slate-500 text-sm">
                  No open props right now.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-10">
                {open.props.map((prop) => (
                  <PropCard
                    key={prop.id}
                    prop={prop}
                    onVote={setSelectedProp}
                  />
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

            {/* Closed Props */}
            {closed.total > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-cinzel text-base font-700 text-slate-500">
                    Closed
                  </h2>
                  <div className="flex-1 h-px bg-void-700" />
                  <span className="text-slate-400 text-xs">
                    {closed.total} awaiting results
                  </span>
                </div>
                <div className="space-y-3 mb-10">
                  {closed.props.map((prop) => (
                    <PropCard
                      key={prop.id}
                      prop={prop}
                      onVote={setSelectedProp}
                    />
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

            {/* Resolved Props */}
            {resolved.total > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-cinzel text-base font-700 text-slate-500">
                    Resolved
                  </h2>
                  <div className="flex-1 h-px bg-void-700" />
                  <span className="text-slate-400 text-xs">
                    {resolved.total} settled
                  </span>
                </div>
                <div className="space-y-3">
                  {resolved.props.map((prop) => (
                    <PropCard
                      key={prop.id}
                      prop={prop}
                      onVote={setSelectedProp}
                    />
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
