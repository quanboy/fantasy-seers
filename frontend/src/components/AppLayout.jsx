import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

function getTierInfo(points) {
  if (points >= 50000)
    return { label: "Legend", color: "text-gold-400", chipClass: "chip-gold-strong" };
  if (points >= 15000)
    return { label: "Elite", color: "text-oracle-400", chipClass: "chip-oracle" };
  if (points >= 5000)
    return { label: "Pro", color: "text-win-700", chipClass: "chip-win" };
  return { label: "Rookie", color: "text-slate-500", chipClass: "bg-slate-500/10 border border-slate-500/20" };
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const tier = getTierInfo(user?.pointBank ?? 0);

  return (
    <div className="min-h-screen bg-void-950 flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <nav className="sticky top-0 z-30 border-b border-void-700 glass-nav">
          <div className="px-4 sm:px-6 py-2 flex items-center h-14">
            {/* Left: hamburger + logo (mobile only) */}
            <div className="lg:hidden flex items-center gap-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-slate-400 hover:text-slate-200 p-0.5 rounded-lg hover:bg-void-800"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <img src="/logo.png" alt="Fantasy Seers" className="w-[52px] h-[52px] object-contain" />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right: username, points, sign out */}
            <div className="flex items-center gap-3 h-10">
              <span className="text-slate-400 text-sm font-medium truncate max-w-[100px] sm:max-w-none">
                {user?.username}
              </span>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg chip-gold">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gold-500">
                  <circle cx="6" cy="6" r="5" fill="currentColor" opacity="0.9" />
                </svg>
                <span className="text-gold-400 font-bold text-sm font-mono">
                  {user?.pointBank?.toLocaleString() ?? 0}
                </span>
              </div>

              <button
                onClick={logout}
                className="text-slate-500 hover:text-slate-300 text-xs transition-colors px-2 py-1.5 rounded-lg hover:bg-void-800 whitespace-nowrap"
              >
                Sign out
              </button>
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
