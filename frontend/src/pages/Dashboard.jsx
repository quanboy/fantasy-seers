import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { propsApi, userApi } from "../api/client";
import PropCard from "../components/PropCard";
import VoteModal from "../components/VoteModal";
import SubmitPropCard from "../components/SubmitPropCard";

function SkeletonCard() {
  return <div className="skeleton h-28 mb-4" />;
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
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

  const openProps = props.filter((p) => p.status === "OPEN");
  const resolvedProps = props.filter((p) => p.status === "RESOLVED");

  return (
    <>
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
              <h2 className="font-display text-lg font-700 text-slate-900">
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
              <div className="glass-card p-10 text-center mb-10">
                <div className="text-4xl mb-3 animate-float inline-block">
                  🔮
                </div>
                <p className="text-slate-500 text-sm">
                  No open props right now.
                </p>
                <p className="text-slate-400 text-xs mt-1">
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
                  <span className="text-slate-400 text-xs">
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
