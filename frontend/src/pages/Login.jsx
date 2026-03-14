import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function OracleLogo() {
  return (
    <div className="flex flex-col items-center gap-0 mb-8">
      <div className="animate-float">
        <img
          src="/logo.png"
          alt="Fantasy Seers"
          className="w-72 h-72 object-contain drop-shadow-[0_0_60px_rgba(79,70,229,0.7)]"
        />
      </div>
      <div className="text-center">
        <h1 className="font-display text-3xl font-800 text-white tracking-tight">
          See It Before It Happens
        </h1>
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-mesh flex items-center justify-center px-4 py-12">
      {/* Decorative corner lines */}
      <div className="fixed top-0 left-0 w-48 h-48 pointer-events-none opacity-20">
        <svg viewBox="0 0 192 192" fill="none">
          <path
            d="M0 192V0h192"
            stroke="#4F46E5"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
        </svg>
      </div>
      <div className="fixed bottom-0 right-0 w-48 h-48 pointer-events-none opacity-20">
        <svg viewBox="0 0 192 192" fill="none">
          <path
            d="M192 0v192H0"
            stroke="#F97316"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
        </svg>
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        <OracleLogo />

        <div className="glass-card p-7">
          <p className="font-display text-lg font-700 text-white mb-6">
            Welcome back, Seer
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-loss-400 font-body alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2 font-body">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input-base"
                placeholder="your_username"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2 font-body">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-base"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-oracle w-full mt-2 py-3.5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entering the arena...
                </span>
              ) : (
                "Enter the Arena"
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-void-700 text-center">
            <p className="text-slate-600 text-sm">
              New to Fantasy Seers?{" "}
              <Link
                to="/register"
                className="text-oracle-400 hover:text-oracle-300 font-semibold transition-colors"
              >
                Claim your spot
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">
          By signing in you agree to our Terms · 18+ only · Gamble responsibly
        </p>
      </div>
    </div>
  );
}
