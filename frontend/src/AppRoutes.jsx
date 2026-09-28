import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        Loading...
      </div>
    );
  return user ? children : <Navigate to="/login" replace />;
}

// Extends PrivateRoute — must be logged in AND have ADMIN role
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-slate-500">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
  );
}
