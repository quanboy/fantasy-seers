import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen auth-mesh flex items-center justify-center px-4">
      <div className="glass-card max-w-md w-full p-8 text-center">
        <p className="font-mono text-oracle-400 text-sm mb-3">404</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">
          Page not found
        </h1>
        <p className="text-sm text-slate-400 mt-3 mb-6">
          This link may be outdated. Your rankings and account are still safe.
        </p>
        <Link to="/" className="btn-oracle inline-flex justify-center">
          Return to Fantasy Seers
        </Link>
      </div>
    </main>
  );
}
