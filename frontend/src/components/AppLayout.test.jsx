import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<h1>Master Sheet</h1>} />
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
});
