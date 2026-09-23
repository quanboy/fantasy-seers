import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { userApi } from "../api/client";
import Sidebar from "./Sidebar";
import PlayerSearchField from "./PlayerSearchField";
import { withPlayerSearchQuery } from "../utils/playerSearch";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, setUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMasterSheet = location.pathname === "/" || location.pathname === "/master-sheet";
  const routeQuery = new URLSearchParams(location.search).get("q") ?? "";
  const [playerQuery, setPlayerQuery] = useState(isMasterSheet ? routeQuery : "");
  const shellRef = useRef(null);
  const headerRef = useRef(null);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await userApi.getMe();
        const current = userRef.current;
        if (current && data.pointBank !== current.pointBank) {
          const updated = { ...current, pointBank: data.pointBank };
          localStorage.setItem("fs_user", JSON.stringify(updated));
          setUser(updated);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [setUser]);

  useEffect(() => {
    const header = headerRef.current;
    const shell = shellRef.current;
    if (!header || !shell) return undefined;

    const syncHeaderHeight = () => {
      shell.style.setProperty("--app-header-height", `${header.getBoundingClientRect().height}px`);
    };

    syncHeaderHeight();
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isMasterSheet) setPlayerQuery(routeQuery);
  }, [isMasterSheet, routeQuery]);

  const updateMasterSheetQuery = (value) => {
    const params = withPlayerSearchQuery(location.search, value);
    const search = params.toString();
    navigate({ pathname: "/", search: search ? `?${search}` : "" }, { replace: true });
  };

  const handlePlayerSearchChange = (event) => {
    const value = event.target.value;
    setPlayerQuery(value);
    if (isMasterSheet) updateMasterSheetQuery(value);
  };

  const handlePlayerSearchSubmit = (event) => {
    event.preventDefault();
    const query = playerQuery.trim();
    if (!query) return;
    setPlayerQuery(query);
    updateMasterSheetQuery(query);
  };

  const clearPlayerSearch = () => {
    setPlayerQuery("");
    if (isMasterSheet) updateMasterSheetQuery("");
  };

  return (
    <div ref={shellRef} className="min-h-screen bg-void-950" style={{ "--app-header-height": "3.5rem" }}>
      <header ref={headerRef} className="sticky top-0 z-30 min-h-14 border-b border-void-700 glass-nav">
        <div className="flex min-h-14 w-full flex-wrap items-center px-3 sm:px-4">
          <div className="flex min-w-0 items-center lg:w-48 lg:shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              aria-controls="primary-sidebar"
              className="lg:hidden text-slate-400 hover:text-slate-200 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-void-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link to="/" aria-label="Fantasy Seers" className="flex min-w-0 items-center gap-2 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400 rounded-lg">
              <img src="/logo.png" alt="" className="h-[52px] w-[52px] object-contain lg:h-10 lg:w-10" />
              <span className="hidden truncate font-cinzel text-base font-bold tracking-tight text-slate-100 lg:block">
                Fantasy Seers
              </span>
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex">
            <PlayerSearchField
              value={playerQuery}
              onChange={handlePlayerSearchChange}
              onSubmit={handlePlayerSearchSubmit}
              onClear={clearPlayerSearch}
              className="w-full max-w-xl"
            />
          </div>

          <div className="min-w-0 flex-1 lg:hidden" />

          <div className="flex h-10 items-center gap-2 sm:gap-3">
            <span className="max-w-[88px] truncate text-sm font-medium text-slate-400 sm:max-w-none">
              {user?.username}
            </span>

            <div className="chip-gold flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3" aria-label={`${user?.pointBank?.toLocaleString() ?? 0} points`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gold-400" aria-hidden="true">
                <circle cx="6" cy="6" r="5" fill="currentColor" opacity="0.9" />
              </svg>
              <span className="font-mono text-sm font-bold text-gold-400">
                {user?.pointBank?.toLocaleString() ?? 0}
              </span>
            </div>

            <button
              onClick={logout}
              className="whitespace-nowrap rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-void-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="app-shell-body flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="min-w-0 flex-1 px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
