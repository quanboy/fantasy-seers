import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  {
    label: "Master Sheet",
    path: "/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Props Feed",
    path: "/props",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
      </svg>
    ),
  },
  {
    label: "Leagues",
    path: "/groups",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Leaderboard",
    path: "/leaderboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z" />
        <path d="M4 22h16" />
        <path d="M10 22V8a2 2 0 0 0-2-2H6" />
        <path d="M14 22V8a2 2 0 0 1 2-2h2" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
      </svg>
    ),
  },
  {
    label: "Profile",
    path: "/profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const adminItem = {
  label: "Admin Uploads",
  path: "/admin",
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();

  const items = user?.role === "ADMIN" ? [...navItems, adminItem] : navItems;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        id="primary-sidebar"
        className={`
          app-sidebar fixed top-0 left-0 z-50 h-full w-60 bg-void-900 border-r border-void-700
          flex flex-col transition-transform duration-200 ease-in-out
          lg:sticky lg:z-20 lg:w-48 lg:shrink-0 lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* The desktop brand lives in the global header; retain it in the phone drawer. */}
        <div className="flex h-14 items-center justify-between border-b border-void-700 px-5 lg:hidden">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="" className="w-10 h-10 object-contain" />
            <span className="font-cinzel text-base font-bold text-slate-100 tracking-tight">
              Fantasy Seers
            </span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden text-slate-400 hover:text-slate-600 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-void-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav aria-label="Primary navigation" className="space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-r-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "border-oracle-400 bg-oracle-500/15 text-oracle-300 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-void-800"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="mt-auto border-t border-void-700 px-4 py-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-oracle-500/15 flex items-center justify-center text-oracle-300 text-xs font-bold">
              {user?.username?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.username}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
