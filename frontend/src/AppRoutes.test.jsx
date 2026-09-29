import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppRoutes from "./AppRoutes";

const { auth, page } = vi.hoisted(() => ({
  auth: { user: null, loading: false, login: null, register: null },
  page: (name) => ({ default: () => <h1>{name}</h1> }),
}));

vi.mock("./context/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("./components/AppLayout", () => ({
  default: () => <Outlet />,
}));

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
    auth.login = vi.fn(async () => {
      auth.user = { username: "demo", role: "USER" };
    });
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
    "asks guests visiting %s to log in over the homepage",
    async (path) => {
      renderAt(path);
      expect(await screen.findByRole("dialog", { name: "Log in" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Master Sheet" })).toBeInTheDocument();
    }
  );

  it("takes guests to the private page they asked for once they log in", async () => {
    const user = userEvent.setup();
    renderAt("/groups");
    const dialog = await screen.findByRole("dialog", { name: "Log in" });

    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("heading", { name: "Leagues" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("leaves guests on the homepage when they dismiss the login prompt", async () => {
    renderAt("/groups");
    const dialog = await screen.findByRole("dialog", { name: "Log in" });

    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Master Sheet" })).toBeInTheDocument();
  });

  it.each([
    ["/login", "Log in"],
    ["/register", "Sign up"],
  ])("opens %s as a dialog over the homepage", async (path, dialogName) => {
    renderAt(path);
    expect(await screen.findByRole("dialog", { name: dialogName })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Master Sheet" })).toBeInTheDocument();
  });

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
