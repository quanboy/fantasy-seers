import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppRoutes from "./AppRoutes";

const { auth, page } = vi.hoisted(() => ({
  auth: { user: null, loading: false },
  page: (name) => ({ default: () => <h1>{name}</h1> }),
}));

vi.mock("./context/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("./components/AppLayout", () => ({
  default: () => <Outlet />,
}));

vi.mock("./pages/Login", () => page("Login"));
vi.mock("./pages/Register", () => page("Register"));
vi.mock("./pages/MasterSheetPage", () => page("Master Sheet"));
vi.mock("./pages/Dashboard", () => page("Props Feed"));
vi.mock("./pages/GroupsPage", () => page("Leagues"));
vi.mock("./pages/GroupFeedPage", () => page("Group Feed"));
vi.mock("./pages/GroupSettingsPage", () => page("Group Settings"));
vi.mock("./pages/LeaderboardPage", () => page("Leaderboard"));
vi.mock("./pages/ProfilePage", () => page("Profile"));
vi.mock("./pages/AdminDashboard", () => page("Admin"));
vi.mock("./pages/NotFoundPage", () => page("Not Found"));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("AppRoutes", () => {
  beforeEach(() => {
    auth.user = null;
  });

  it("lets guests browse the Master Sheet", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: "Master Sheet" })).toBeInTheDocument();
  });

  it("lets guests browse the Props Feed", () => {
    renderAt("/props");
    expect(screen.getByRole("heading", { name: "Props Feed" })).toBeInTheDocument();
  });

  it.each(["/groups", "/groups/3", "/leaderboard", "/profile", "/admin"])(
    "sends guests from %s to login",
    (path) => {
      renderAt(path);
      expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    }
  );

  it("still opens private pages for signed-in users", () => {
    auth.user = { username: "demo", role: "USER" };
    renderAt("/groups");
    expect(screen.getByRole("heading", { name: "Leagues" })).toBeInTheDocument();
  });

  it("keeps the admin page restricted to admins", () => {
    auth.user = { username: "demo", role: "USER" };
    renderAt("/admin");
    expect(screen.getByRole("heading", { name: "Master Sheet" })).toBeInTheDocument();
  });
});
