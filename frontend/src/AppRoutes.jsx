import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AuthDialogProvider, useAuthDialog } from "./context/AuthDialogContext";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import GroupsPage from "./pages/GroupsPage";
import GroupFeedPage from "./pages/GroupFeedPage";
import GroupSettingsPage from "./pages/GroupSettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import MasterSheetPage from "./pages/MasterSheetPage";
import NotFoundPage from "./pages/NotFoundPage";
import AppLayout from "./components/AppLayout";

// Waits for the stored session to load so guests and members don't see the wrong shell.
function AuthReady({ children }) {
  const { loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        Loading...
      </div>
    );
  return children;
}

// Sends the visitor to the homepage with the auth dialog open; returnTo is where to go after login.
function AuthPrompt({ mode = "login", returnTo }) {
  const { openAuthDialog } = useAuthDialog();
  useEffect(() => {
    openAuthDialog(mode, { returnTo });
  }, [openAuthDialog, mode, returnTo]);
  return <Navigate to="/" replace />;
}

function useCurrentPath() {
  const location = useLocation();
  return `${location.pathname}${location.search}`;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const currentPath = useCurrentPath();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        Loading...
      </div>
    );
  return user ? children : <AuthPrompt returnTo={currentPath} />;
}

// Extends PrivateRoute — must be logged in AND have ADMIN role
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const currentPath = useCurrentPath();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        Loading...
      </div>
    );
  if (!user) return <AuthPrompt returnTo={currentPath} />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <AuthDialogProvider>
    <Routes>
      <Route path="/login" element={<AuthPrompt mode="login" />} />
      <Route path="/register" element={<AuthPrompt mode="signup" />} />
      <Route
        element={
          <AuthReady>
            <AppLayout />
          </AuthReady>
        }
      >
        <Route index element={<MasterSheetPage />} />
        <Route path="props" element={<Dashboard />} />
        <Route path="master-sheet" element={<Navigate to="/" replace />} />
        <Route path="groups" element={<PrivateRoute><GroupsPage /></PrivateRoute>} />
        <Route path="groups/:id" element={<PrivateRoute><GroupFeedPage /></PrivateRoute>} />
        <Route path="groups/:id/settings" element={<PrivateRoute><GroupSettingsPage /></PrivateRoute>} />
        <Route path="leaderboard" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />
        <Route path="profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </AuthDialogProvider>
  );
}
