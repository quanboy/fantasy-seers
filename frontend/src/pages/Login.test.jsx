import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login, { getLoginErrorMessage } from "./Login";

const authMocks = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: authMocks.login }),
}));

describe("Login", () => {
  beforeEach(() => {
    authMocks.login.mockReset();
    authMocks.login.mockResolvedValue({ username: "demo" });
  });

  it("maps rejected credentials to the safe API message", () => {
    expect(getLoginErrorMessage({
      response: { data: { message: "Invalid username or password" } },
    })).toBe("Invalid username or password");
    expect(getLoginErrorMessage(new Error("network failure"))).toBe("Invalid credentials");
  });

  it("associates visible labels with the login controls", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("Username")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

  it("fills the local demo credentials in development", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Use demo account" }));
    fireEvent.submit(screen.getByRole("button", { name: "Enter the Arena" }).closest("form"));

    await waitFor(() => {
      expect(authMocks.login).toHaveBeenCalledWith({
        username: "demo",
        password: "demo-only-password",
      });
    });
  });
});
