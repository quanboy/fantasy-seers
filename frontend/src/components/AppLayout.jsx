import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-void-950 flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <nav className="sticky top-0 z-30 border-b border-void-700 glass-nav h-14 flex items-center px-4 sm:px-6">
            {/* Left: hamburger + logo (mobile only) */}
            <div className="lg:hidden flex items-center gap-1">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
                className="text-slate-400 hover:text-slate-200 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-void-800"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <Link to="/"><img src="/logo.png" alt="Fantasy Seers" className="w-[52px] h-[52px] object-contain" /></Link>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right: username and sign out */}
            <div className="flex items-center gap-3 h-10">
              <span className="text-slate-400 text-sm font-medium truncate max-w-[100px] sm:max-w-none">
                {user?.username}
              </span>

              <button
                onClick={logout}
                className="text-slate-500 hover:text-slate-300 text-xs transition-colors px-2 py-1.5 rounded-lg hover:bg-void-800 whitespace-nowrap"
              >
                Sign out
              </button>
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
