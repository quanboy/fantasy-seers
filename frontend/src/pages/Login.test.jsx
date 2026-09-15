import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Login, { getLoginErrorMessage } from "./Login";

const authMocks = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ login: authMocks.login }),
}));

describe("Login", () => {
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
});
