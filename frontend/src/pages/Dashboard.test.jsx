import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const { auth, api } = vi.hoisted(() => ({
  auth: { user: null, setUser: () => {} },
  api: {
    propsApi: { getPublic: vi.fn(), getSplit: vi.fn() },
    userApi: { getMe: vi.fn() },
    groupsApi: { getMyGroups: vi.fn() },
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("../api/client", () => api);

const openProp = {
  id: 5,
  title: "Will the Bills win on Sunday?",
  sport: "NFL",
  status: "OPEN",
  minWager: 10,
  maxWager: 500,
  closesAt: new Date(Date.now() + 86400000).toISOString(),
};

function renderFeed() {
  return render(
    <MemoryRouter initialEntries={["/props"]}>
      <Routes>
        <Route path="/props" element={<Dashboard />} />
        <Route path="/login" element={<h1>Login</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    auth.user = null;
    api.propsApi.getPublic.mockReset();
    api.userApi.getMe.mockReset();
    api.propsApi.getPublic.mockResolvedValue({ data: { content: [openProp] } });
    api.userApi.getMe.mockResolvedValue({ data: {} });
  });

  it("lets guests browse public props without loading an account", async () => {
    renderFeed();

    expect(await screen.findByText("Will the Bills win on Sunday?")).toBeInTheDocument();
    expect(api.userApi.getMe).not.toHaveBeenCalled();
    expect(screen.queryByText(/Make a call/)).not.toBeInTheDocument();
  });

  it("sends guests to log in when they try to vote", async () => {
    const user = userEvent.setup();
    renderFeed();

    await user.click(await screen.findByRole("button", { name: "Yes" }));

    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("still loads the account and offers the composer to members", async () => {
    auth.user = { username: "demo", pointBank: 1000, role: "USER" };
    renderFeed();

    expect(await screen.findByText("Will the Bills win on Sunday?")).toBeInTheDocument();
    expect(api.userApi.getMe).toHaveBeenCalled();
    expect(screen.getByText(/Make a call/)).toBeInTheDocument();
  });
});
