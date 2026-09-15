import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./AppLayout";
import AdminDashboard from "../pages/AdminDashboard";

const authMocks = vi.hoisted(() => ({
  logout: vi.fn(),
  user: { username: "devseer", pointBank: 1000, role: "ADMIN" },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => authMocks,
}));

vi.mock("../api/client", () => ({
  adminApi: { lockBoards: vi.fn() },
}));

describe("parked props UI", () => {
  it("keeps rankings navigation without exposing props, leaderboards, or points", () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<p>Master Sheet content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /Master Sheet/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Leagues/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Board Admin/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Props Feed/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Leaderboard/i })).not.toBeInTheDocument();
    expect(screen.queryByText("1,000")).not.toBeInTheDocument();
  });

  it("limits the admin screen to board controls", () => {
    render(<AdminDashboard />);

    expect(screen.getByRole("heading", { name: "Board controls" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock Boards" })).toBeInTheDocument();
    expect(screen.queryByText(/Create Prop/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pending Props/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/wager|payout|points/i)).not.toBeInTheDocument();
  });
});
