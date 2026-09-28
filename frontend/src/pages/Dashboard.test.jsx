import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const { auth, api, openAuthDialog } = vi.hoisted(() => {
  const auth = {
    user: null,
    setUser(next) {
      auth.user = typeof next === "function" ? next(auth.user) : next;
    },
  };
  return {
    auth,
    openAuthDialog: vi.fn(),
    api: {
      propsApi: { getPublic: vi.fn(), getSplit: vi.fn(), getById: vi.fn(), vote: vi.fn() },
      userApi: { getMe: vi.fn() },
      groupsApi: { getMyGroups: vi.fn() },
    },
  };
});

vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("../api/client", () => api);

vi.mock("../context/AuthDialogContext", () => ({
  useAuthDialog: () => ({ openAuthDialog }),
}));

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
    openAuthDialog.mockClear();
    api.propsApi.getPublic.mockReset();
    api.userApi.getMe.mockReset();
    api.propsApi.getById.mockReset();
    api.propsApi.vote.mockReset();
    api.propsApi.getPublic.mockResolvedValue({ data: { content: [openProp] } });
    api.userApi.getMe.mockResolvedValue({ data: {} });
  });

  it("lets guests browse public props without loading an account", async () => {
    renderFeed();

    expect(await screen.findByText("Will the Bills win on Sunday?")).toBeInTheDocument();
    expect(api.userApi.getMe).not.toHaveBeenCalled();
    expect(screen.queryByText(/Make a call/)).not.toBeInTheDocument();
  });

  describe("when a guest votes and then signs in", () => {
    async function voteYesThenSignIn({ propAfterLogin, pointBank = 900 }) {
      const user = userEvent.setup();
      api.propsApi.getById.mockResolvedValue({ data: propAfterLogin });
      api.userApi.getMe.mockResolvedValue({ data: { pointBank } });
      renderFeed();

      await user.click(await screen.findByRole("button", { name: "Yes" }));
      const [, { onAuthenticated }] = openAuthDialog.mock.calls.at(-1);
      await act(async () => {
        auth.user = { username: "demo", pointBank: 1000, role: "USER" };
        onAuthenticated();
      });
      return user;
    }

    it("reopens the vote with the same choice and wager for confirmation, without voting", async () => {
      await voteYesThenSignIn({ propAfterLogin: openProp });

      const voteDialog = await screen.findByRole("dialog", { name: openProp.title });
      expect(api.propsApi.getById).toHaveBeenCalledWith(5);
      expect(within(voteDialog).getByRole("button", { name: "YES" })).toHaveAttribute("aria-pressed", "true");
      expect(within(voteDialog).getByLabelText("Your wager")).toHaveValue(10);
      expect(within(voteDialog).getByText("900 pts available")).toBeInTheDocument();
      expect(api.propsApi.vote).not.toHaveBeenCalled();
    });

    it("says voting has closed if the prop closed during sign-in", async () => {
      await voteYesThenSignIn({ propAfterLogin: { ...openProp, status: "CLOSED" } });

      expect(await screen.findByText("Voting has closed.")).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: openProp.title })).not.toBeInTheDocument();
      expect(api.propsApi.vote).not.toHaveBeenCalled();
    });

    it("treats a prop past its closing time as closed", async () => {
      await voteYesThenSignIn({
        propAfterLogin: { ...openProp, closesAt: new Date(Date.now() - 1000).toISOString() },
      });

      expect(await screen.findByText("Voting has closed.")).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: openProp.title })).not.toBeInTheDocument();
    });

    it("shows that the account already voted instead of offering a second vote", async () => {
      await voteYesThenSignIn({ propAfterLogin: { ...openProp, userChoice: "NO", userWager: 50 } });

      expect(await screen.findByText(/You already voted on this prop/)).toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: openProp.title })).not.toBeInTheDocument();
      expect(api.propsApi.vote).not.toHaveBeenCalled();
    });
  });

  it("asks guests to log in when they try to vote, without leaving the feed", async () => {
    const user = userEvent.setup();
    renderFeed();

    await user.click(await screen.findByRole("button", { name: "Yes" }));

    expect(openAuthDialog).toHaveBeenCalledWith("login", expect.objectContaining({ onAuthenticated: expect.any(Function) }));
    expect(screen.getByText("Will the Bills win on Sunday?")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Login" })).not.toBeInTheDocument();
  });

  it("still loads the account and offers the composer to members", async () => {
    auth.user = { username: "demo", pointBank: 1000, role: "USER" };
    renderFeed();

    expect(await screen.findByText("Will the Bills win on Sunday?")).toBeInTheDocument();
    expect(api.userApi.getMe).toHaveBeenCalled();
    expect(screen.getByText(/Make a call/)).toBeInTheDocument();
  });
});
