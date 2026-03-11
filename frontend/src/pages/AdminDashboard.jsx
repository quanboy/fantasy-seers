import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { adminApi } from "../api/client";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [actionErrors, setActionErrors] = useState({});

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
  }, []);

  const handleApprove = async (id) => {
    if (actioningId) return;
    setActioningId(id);
    setActionErrors((prev) => ({ ...prev, [id]: null }));
    try {
      await adminApi.approve(id);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        [id]: "Failed to approve. Try again.",
      }));
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
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        [id]: "Failed to reject. Try again.",
      }));
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-gray-500 hover:text-gray-300 text-sm">
            ← Back
          </a>
          <h1 className="text-lg font-bold text-white">
            Admin — Pending Props
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm hidden sm:block">
            {user?.username}
          </span>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-gray-300 text-xs sm:text-sm"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <p className="text-gray-500 text-center py-12">
            Loading pending props...
          </p>
        )}

        {/* Fetch error state */}
        {!loading && fetchError && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-gray-400 mb-4">Failed to load pending props.</p>
            <button
              onClick={fetchPending}
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !fetchError && pending.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-500">
              No pending props. You're all caught up.
            </p>
          </div>
        )}

        {!loading && !fetchError && pending.length > 0 && (
          <div className="space-y-4">
            {pending.map((prop) => (
              <div
                key={prop.id}
                className="bg-gray-900 border border-yellow-800 rounded-2xl p-6"
              >
                {/* Sport + submitted by */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      prop.sport === "NFL"
                        ? "bg-green-900 text-green-300"
                        : "bg-orange-900 text-orange-300"
                    }`}
                  >
                    {prop.sport}
                  </span>
                  <span className="text-gray-500 text-xs">
                    Submitted by {prop.createdBy}
                  </span>
                </div>

                {/* Title */}
                <p className="text-white font-semibold text-lg leading-snug mb-1">
                  {prop.title}
                </p>

                {/* Description */}
                {prop.description && (
                  <p className="text-gray-400 text-sm mb-3">
                    {prop.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-4">
                  <span>
                    Closes:{" "}
                    {new Date(prop.closesAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {prop.minWager && <span>Min wager: {prop.minWager} pts</span>}
                  {prop.maxWager && <span>Max wager: {prop.maxWager} pts</span>}
                </div>

                {/* Inline action error */}
                {actionErrors[prop.id] && (
                  <p className="text-red-400 text-sm mb-3">
                    {actionErrors[prop.id]}
                  </p>
                )}

                {/* Approve / Reject buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(prop.id)}
                    disabled={actioningId === prop.id}
                    className="bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all"
                  >
                    {actioningId === prop.id ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(prop.id)}
                    disabled={actioningId === prop.id}
                    className="bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all"
                  >
                    {actioningId === prop.id ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
