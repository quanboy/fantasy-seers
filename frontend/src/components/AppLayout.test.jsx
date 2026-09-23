import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppLayout from "./AppLayout";

const auth = {
  user: { username: "demo", pointBank: 1000, role: "USER" },
  setUser: vi.fn(),
  logout: vi.fn(),
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("../api/client", () => ({
  userApi: { getMe: vi.fn() },
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
    auth.logout.mockClear();
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
});
