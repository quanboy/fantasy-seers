import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

export function getLoginErrorMessage(error) {
  return error.response?.data?.message || "Invalid credentials";
}

const labelClass = "block text-xs text-slate-500 uppercase tracking-widest mb-2";

function PasswordField({ id, value, onChange, autoComplete, minLength }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>Password</label>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="input-base pr-10"
          placeholder={minLength ? `Min. ${minLength} characters` : "Your password"}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={72}
          required
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ loading, label, busyLabel }) {
  return (
    <button type="submit" disabled={loading} className="btn-oracle w-full py-3.5">
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {busyLabel}
        </span>
      ) : label}
    </button>
  );
}

// Shared submit handling: one request at a time, inline error on failure.
function useSubmit(action, onSuccess, toMessage) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setError("");
    setLoading(true);
    try {
      await action();
      onSuccess();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return { error, loading, submit };
}

function LoginForm({ onAuthenticated, onSwitch }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const { error, loading, submit } = useSubmit(() => login(form), onAuthenticated, getLoginErrorMessage);

  return (
    <>
      {error && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-lg text-sm text-loss-400 alert-error">{error}</div>
      )}
      <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
        <div>
          <label htmlFor="auth-login-username" className={labelClass}>Username</label>
          <input
            id="auth-login-username"
            name="username"
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="input-base"
            placeholder="your_handle"
            autoComplete="username"
            maxLength={50}
            required
          />
        </div>
        <PasswordField
          id="auth-login-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          autoComplete="current-password"
        />
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => setForm({ username: "demo", password: "demo-only-password" })}
            className="w-full rounded-lg border border-void-600 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-oracle-500 hover:text-slate-100"
          >
            Use demo account
          </button>
        )}
        <SubmitButton loading={loading} label="Log in" busyLabel="Logging in..." />
      </form>
      <p className="mt-5 border-t border-void-700 pt-4 text-center text-sm text-slate-400">
        New to Fantasy Seers?{" "}
        <button type="button" onClick={onSwitch} className="font-semibold text-oracle-400 hover:text-oracle-500">
          Create an account
        </button>
      </p>
    </>
  );
}

function SignupForm({ onAuthenticated, onSwitch }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const { error, loading, submit } = useSubmit(
    () => register(form),
    onAuthenticated,
    (err) => err.response?.data?.message || "Registration failed"
  );

  return (
    <>
      <p className="mb-5 text-xs text-slate-400">
        Build your rankings first. After signing in, join friends with a league invite code on the Leagues page.
      </p>
      {error && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-lg text-sm text-loss-400 alert-error">{error}</div>
      )}
      <form onSubmit={submit} className="space-y-4" aria-busy={loading}>
        <div>
          <label htmlFor="auth-signup-username" className={labelClass}>Username</label>
          <input
            id="auth-signup-username"
            name="username"
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="input-base"
            placeholder="seer_handle"
            autoComplete="username"
            minLength={3}
            maxLength={50}
            required
          />
        </div>
        <div>
          <label htmlFor="auth-signup-email" className={labelClass}>Email</label>
          <input
            id="auth-signup-email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input-base"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <PasswordField
          id="auth-signup-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          autoComplete="new-password"
          minLength={8}
        />
        <div className="rounded-lg px-4 py-3 text-xs text-gold-400 chip-gold">
          <span className="font-bold">Welcome bonus:</span> Start with <span className="font-mono">1,000</span> free points.
        </div>
        <SubmitButton loading={loading} label="Create account" busyLabel="Creating your account..." />
      </form>
      <p className="mt-5 border-t border-void-700 pt-4 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} className="font-semibold text-oracle-400 hover:text-oracle-500">
          Log in instead
        </button>
      </p>
    </>
  );
}

export default function AuthDialog({ mode, onModeChange, onClose, onAuthenticated }) {
  const dialogRef = useRef(null);
  const headingId = useId();
  const isLogin = mode === "login";

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  // showModal would focus the close button; start people in the first field instead.
  useEffect(() => {
    dialogRef.current.querySelector("input")?.focus();
  }, [mode]);

  const handleCancel = (event) => {
    // Escape: close through React state so focus restoration runs.
    event.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onCancel={handleCancel}
      className="m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-void-900 p-0 text-slate-200 backdrop:bg-black/60 sm:m-auto sm:h-fit sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-void-700"
    >
      <div className="p-6 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={headingId} className="font-display text-xl font-700 text-slate-100">
              {isLogin ? "Log in" : "Sign up"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Private league competition · No real-money wagering</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-void-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {isLogin ? (
          <LoginForm onAuthenticated={onAuthenticated} onSwitch={() => onModeChange("signup")} />
        ) : (
          <SignupForm onAuthenticated={onAuthenticated} onSwitch={() => onModeChange("login")} />
        )}
      </div>
    </dialog>
  );
}
