import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppLayout from "./AppLayout";

const member = { username: "demo", pointBank: 1000, role: "USER" };

const { auth, getMe, openAuthDialog } = vi.hoisted(() => ({
  auth: { user: null, setUser: vi.fn(), logout: vi.fn() },
  getMe: vi.fn(),
  openAuthDialog: vi.fn(),
}));

vi.mock("../context/AuthDialogContext", () => ({
  useAuthDialog: () => ({ openAuthDialog }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("../api/client", () => ({
  userApi: { getMe },
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current location">{`${location.pathname}${location.search}`}</output>;
}

function renderLayout(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<><h1>Master Sheet</h1><LocationProbe /></>} />
          <Route path="props" element={<><h1>Props Feed</h1><LocationProbe /></>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("AppLayout", () => {
  beforeEach(() => {
    auth.user = member;
    auth.logout.mockClear();
    openAuthDialog.mockClear();
    getMe.mockReset();
    getMe.mockResolvedValue({ data: member });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts the brand and account controls in one global header above primary navigation", () => {
    renderLayout();

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: /Fantasy Seers/ })).toHaveAttribute("href", "/");
    expect(within(header).getByText("demo")).toBeInTheDocument();
    expect(within(header).getByText("1,000")).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Sign out" })).toBeInTheDocument();

    const primaryNavigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(primaryNavigation).toContainElement(screen.getByRole("link", { name: "Master Sheet" }));
    expect(header).not.toContainElement(primaryNavigation);
  });

  it("keeps the mobile navigation drawer operable from the global header", async () => {
    const user = userEvent.setup();
    renderLayout();

    const openButton = screen.getByRole("button", { name: "Open navigation" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");

    await user.click(openButton);
    expect(openButton).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(openButton).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps cross-page search local until submission, then opens the matching Master Sheet query", async () => {
    const user = userEvent.setup();
    renderLayout("/props");

    const search = screen.getByRole("searchbox", { name: "Search players" });
    await user.type(search, "  Josh Allen  ");
    await user.tab();

    expect(screen.getByRole("heading", { name: "Props Feed" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current location")).toHaveTextContent("/props");

    await user.click(search);
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { name: "Master Sheet" })).toBeInTheDocument();
    expect(screen.getByLabelText("Current location")).toHaveTextContent("/?q=Josh+Allen");
    expect(search).toHaveFocus();
    expect(search).toHaveValue("Josh Allen");
  });

  it("does nothing when a cross-page search submission is blank", async () => {
    const user = userEvent.setup();
    renderLayout("/props");

    const search = screen.getByRole("searchbox", { name: "Search players" });
    await user.type(search, "   ");
    await user.keyboard("{Enter}");

    expect(screen.getByLabelText("Current location")).toHaveTextContent("/props");
  });

  it("offers guests Log in and Sign up dialogs instead of account controls", async () => {
    const user = userEvent.setup();
    auth.user = null;
    renderLayout();

    const header = screen.getByRole("banner");
    await user.click(within(header).getByRole("button", { name: "Log in" }));
    expect(openAuthDialog).toHaveBeenLastCalledWith("login");
    await user.click(within(header).getByRole("button", { name: "Sign up" }));
    expect(openAuthDialog).toHaveBeenLastCalledWith("signup");
    expect(screen.getByLabelText("Current location")).toHaveTextContent("/");
    expect(within(header).queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(within(header).queryByLabelText(/points/)).not.toBeInTheDocument();
  });

  it("shows guests only the public pages in navigation", () => {
    auth.user = null;
    renderLayout();

    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Master Sheet",
      "Props Feed",
    ]);
  });

  it("shows members their private pages in navigation", () => {
    renderLayout();

    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Master Sheet",
      "Props Feed",
      "Leagues",
      "Leaderboard",
      "Profile",
    ]);
  });

  it("refreshes the point bank for members but never polls the account for guests", async () => {
    vi.useFakeTimers();
    const { unmount } = renderLayout();
    await act(async () => { vi.advanceTimersByTime(30000); });
    expect(getMe).toHaveBeenCalledTimes(1);
    unmount();

    getMe.mockClear();
    auth.user = null;
    renderLayout();
    await act(async () => { vi.advanceTimersByTime(60000); });
    expect(getMe).not.toHaveBeenCalled();
  });
});
