import { act, render, screen, waitFor, within } from "@testing-library/react";
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

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("Dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
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
        onAuthenticated(auth.user);
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

    it("ignores a resumed-vote response after the active account changes", async () => {
      const user = userEvent.setup();
      const propRequest = deferred();
      const accountRequest = deferred();
      api.propsApi.getById.mockReturnValue(propRequest.promise);
      api.userApi.getMe.mockReturnValue(accountRequest.promise);
      const view = renderFeed();

      await user.click(await screen.findByRole("button", { name: "Yes" }));
      const [, { onAuthenticated }] = openAuthDialog.mock.calls.at(-1);
      await act(async () => {
        auth.user = { username: "first", pointBank: 1000, role: "USER" };
        onAuthenticated(auth.user);
      });
      await waitFor(() => expect(api.propsApi.getById).toHaveBeenCalledWith(5));

      auth.user = { username: "second", pointBank: 700, role: "USER" };
      localStorage.setItem("fs_user", JSON.stringify(auth.user));
      view.rerender(
        <MemoryRouter initialEntries={["/props"]}>
          <Routes>
            <Route path="/props" element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
      );

      await act(async () => {
        propRequest.resolve({ data: openProp });
        accountRequest.resolve({ data: { pointBank: 900 } });
      });

      expect(auth.user).toEqual({ username: "second", pointBank: 700, role: "USER" });
      expect(JSON.parse(localStorage.getItem("fs_user"))).toEqual(auth.user);
      expect(screen.queryByRole("dialog", { name: openProp.title })).not.toBeInTheDocument();
    });

    it("does not start vote reconciliation under a different account", async () => {
      const user = userEvent.setup();
      renderFeed();

      await user.click(await screen.findByRole("button", { name: "Yes" }));
      const [, { onAuthenticated }] = openAuthDialog.mock.calls.at(-1);
      await act(async () => {
        localStorage.setItem("fs_token", "first-token");
        onAuthenticated({ username: "first", pointBank: 1000, role: "USER" });
        auth.user = { username: "second", pointBank: 700, role: "USER" };
        localStorage.setItem("fs_token", "second-token");
      });

      expect(api.propsApi.getById).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog", { name: openProp.title })).not.toBeInTheDocument();
    });

    it("ignores a resumed-vote response from an older token for the same account", async () => {
      const user = userEvent.setup();
      const propRequest = deferred();
      const accountRequest = deferred();
      api.propsApi.getById.mockReturnValue(propRequest.promise);
      api.userApi.getMe.mockReturnValue(accountRequest.promise);
      renderFeed();

      await user.click(await screen.findByRole("button", { name: "Yes" }));
      const [, { onAuthenticated }] = openAuthDialog.mock.calls.at(-1);
      await act(async () => {
        auth.user = { username: "demo", pointBank: 1000, role: "USER" };
        localStorage.setItem("fs_token", "first-token");
        onAuthenticated(auth.user);
      });
      await waitFor(() => expect(api.propsApi.getById).toHaveBeenCalledWith(5));

      localStorage.setItem("fs_token", "second-token");
      await act(async () => {
        propRequest.resolve({ data: openProp });
        accountRequest.resolve({ data: { pointBank: 900 } });
      });

      expect(auth.user).toEqual({ username: "demo", pointBank: 1000, role: "USER" });
      expect(screen.queryByRole("dialog", { name: openProp.title })).not.toBeInTheDocument();
    });

    it("announces a resumed-vote load failure as an error", async () => {
      const user = userEvent.setup();
      api.propsApi.getById.mockRejectedValue(new Error("offline"));
      api.userApi.getMe.mockResolvedValue({ data: { pointBank: 900 } });
      renderFeed();

      await user.click(await screen.findByRole("button", { name: "Yes" }));
      const [, { onAuthenticated }] = openAuthDialog.mock.calls.at(-1);
      await act(async () => {
        auth.user = { username: "demo", pointBank: 1000, role: "USER" };
        onAuthenticated(auth.user);
      });

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Couldn't load that prop. Please try again.");
      expect(within(alert).getByText("Couldn't load that prop. Please try again.")).toHaveClass("text-loss-400");
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

  it("resets profile state and ignores a late response when accounts change", async () => {
    const firstProfile = deferred();
    api.userApi.getMe
      .mockReturnValueOnce(firstProfile.promise)
      .mockResolvedValueOnce({ data: { favoriteNflTeam: "BUF" } });
    auth.user = { username: "first", pointBank: 1000, role: "USER" };
    const view = renderFeed();
    await screen.findByText("Will the Bills win on Sunday?");
    expect(api.userApi.getMe).toHaveBeenCalledTimes(1);

    auth.user = { username: "second", pointBank: 700, role: "USER" };
    view.rerender(
      <MemoryRouter initialEntries={["/props"]}>
        <Routes>
          <Route path="/props" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(api.userApi.getMe).toHaveBeenCalledTimes(2));

    await act(async () => {
      firstProfile.resolve({ data: {} });
    });

    expect(screen.queryByText(/Complete your profile/)).not.toBeInTheDocument();
  });

  it("ignores a stale personalized feed response after the account changes", async () => {
    const firstFeed = deferred();
    const secondProp = { ...openProp, id: 6, title: "Second account prop" };
    api.propsApi.getPublic
      .mockReturnValueOnce(firstFeed.promise)
      .mockResolvedValueOnce({ data: { content: [secondProp] } });
    auth.user = { username: "first", pointBank: 1000, role: "USER" };
    localStorage.setItem("fs_token", "first-token");
    const view = renderFeed();

    auth.user = { username: "second", pointBank: 700, role: "USER" };
    localStorage.setItem("fs_token", "second-token");
    view.rerender(
      <MemoryRouter initialEntries={["/props"]}>
        <Routes>
          <Route path="/props" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Second account prop")).toBeInTheDocument();

    await act(async () => {
      firstFeed.resolve({
        data: { content: [{ ...openProp, title: "First account private prop" }] },
      });
    });

    expect(screen.getByText("Second account prop")).toBeInTheDocument();
    expect(screen.queryByText("First account private prop")).not.toBeInTheDocument();
  });

  it("reloads the personalized feed when the JWT changes for the same account", async () => {
    const firstFeed = deferred();
    const secondProp = { ...openProp, id: 6, title: "New session prop" };
    api.propsApi.getPublic
      .mockReturnValueOnce(firstFeed.promise)
      .mockResolvedValueOnce({ data: { content: [secondProp] } });
    auth.user = { username: "demo", pointBank: 1000, role: "USER" };
    localStorage.setItem("fs_token", "first-token");
    const view = renderFeed();
    await waitFor(() => expect(api.propsApi.getPublic).toHaveBeenCalledTimes(1));

    auth.user = { username: "demo", pointBank: 700, role: "USER" };
    localStorage.setItem("fs_token", "second-token");
    view.rerender(
      <MemoryRouter initialEntries={["/props"]}>
        <Routes>
          <Route path="/props" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("New session prop")).toBeInTheDocument();
    expect(api.propsApi.getPublic).toHaveBeenCalledTimes(2);

    await act(async () => {
      firstFeed.resolve({ data: { content: [{ ...openProp, title: "Stale session prop" }] } });
    });

    expect(screen.getByText("New session prop")).toBeInTheDocument();
    expect(screen.queryByText("Stale session prop")).not.toBeInTheDocument();
  });

  it("hides the previous account's feed while the new session loads", async () => {
    const nextFeed = deferred();
    api.propsApi.getPublic
      .mockResolvedValueOnce({
        data: { content: [{ ...openProp, title: "First account private prop" }] },
      })
      .mockReturnValueOnce(nextFeed.promise);
    auth.user = { username: "first", pointBank: 1000, role: "USER" };
    localStorage.setItem("fs_token", "first-token");
    const view = renderFeed();
    expect(await screen.findByText("First account private prop")).toBeInTheDocument();

    auth.user = { username: "second", pointBank: 700, role: "USER" };
    localStorage.setItem("fs_token", "second-token");
    view.rerender(
      <MemoryRouter initialEntries={["/props"]}>
        <Routes>
          <Route path="/props" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(api.propsApi.getPublic).toHaveBeenCalledTimes(2));

    expect(screen.queryByText("First account private prop")).not.toBeInTheDocument();

    await act(async () => {
      nextFeed.resolve({ data: { content: [{ ...openProp, title: "Second account prop" }] } });
    });
    expect(await screen.findByText("Second account prop")).toBeInTheDocument();
  });

  it("does not apply a post-vote balance refresh to a different account", async () => {
    const user = userEvent.setup();
    const balanceRequest = deferred();
    auth.user = { username: "first", pointBank: 1000, role: "USER" };
    api.propsApi.vote.mockResolvedValue({
      data: { yesPct: 100, noPct: 0, yesCount: 1, noCount: 0, yesWagerTotal: 10, noWagerTotal: 0 },
    });
    const view = renderFeed();

    await user.click(await screen.findByRole("button", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: /Lock In/ }));
    const backButton = await screen.findByRole("button", { name: "Back to Feed" });
    api.userApi.getMe.mockReturnValueOnce(balanceRequest.promise);
    await user.click(backButton);

    auth.user = { username: "second", pointBank: 700, role: "USER" };
    localStorage.setItem("fs_user", JSON.stringify(auth.user));
    view.rerender(
      <MemoryRouter initialEntries={["/props"]}>
        <Routes>
          <Route path="/props" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(await screen.findByRole("button", { name: "Yes" }));
    expect(screen.getByRole("dialog", { name: openProp.title })).toBeInTheDocument();

    await act(async () => {
      balanceRequest.resolve({ data: { pointBank: 990 } });
    });

    expect(auth.user).toEqual({ username: "second", pointBank: 700, role: "USER" });
    expect(JSON.parse(localStorage.getItem("fs_user"))).toEqual(auth.user);
    expect(screen.getByRole("dialog", { name: openProp.title })).toBeInTheDocument();
  });

  it("does not apply a post-vote balance refresh to a newer session for the same account", async () => {
    const user = userEvent.setup();
    const balanceRequest = deferred();
    auth.user = { username: "demo", pointBank: 1000, role: "USER" };
    localStorage.setItem("fs_token", "first-token");
    api.propsApi.vote.mockResolvedValue({
      data: { yesPct: 100, noPct: 0, yesCount: 1, noCount: 0, yesWagerTotal: 10, noWagerTotal: 0 },
    });
    const view = renderFeed();

    await user.click(await screen.findByRole("button", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: /Lock In/ }));
    const backButton = await screen.findByRole("button", { name: "Back to Feed" });
    api.userApi.getMe.mockReturnValueOnce(balanceRequest.promise);
    await user.click(backButton);

    auth.user = { username: "demo", pointBank: 700, role: "USER" };
    localStorage.setItem("fs_token", "second-token");
    localStorage.setItem("fs_user", JSON.stringify(auth.user));
    view.rerender(
      <MemoryRouter initialEntries={["/props"]}>
        <Routes>
          <Route path="/props" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      balanceRequest.resolve({ data: { pointBank: 990 } });
    });

    expect(auth.user).toEqual({ username: "demo", pointBank: 700, role: "USER" });
    expect(JSON.parse(localStorage.getItem("fs_user"))).toEqual(auth.user);
  });

  it("closes an authenticated vote modal when the session becomes a guest", async () => {
    const user = userEvent.setup();
    auth.user = { username: "demo", pointBank: 1000, role: "USER" };
    const view = renderFeed();

    await user.click(await screen.findByRole("button", { name: "Yes" }));
    expect(screen.getByRole("dialog", { name: openProp.title })).toBeInTheDocument();

    auth.user = null;
    view.rerender(
      <MemoryRouter initialEntries={["/props"]}>
        <Routes>
          <Route path="/props" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.queryByRole("dialog", { name: openProp.title })).not.toBeInTheDocument());
  });
});
