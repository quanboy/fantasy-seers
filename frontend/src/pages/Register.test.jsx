import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Register from "./Register";

const register = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ register }),
}));

describe("Register", () => {
  it("provides accessible account fields and honest league messaging", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Fantasy Seers" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("minlength", "8");
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Registration Code/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Favorite NFL Team/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Alma Mater/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
    expect(screen.getByText(/join friends with a league invite code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.queryByText(/thousands of seers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gamble responsibly/i)).not.toBeInTheDocument();
  });

  it("submits only username, email, and password", async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "newseer" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "seer@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "safe-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        username: "newseer",
        email: "seer@example.com",
        password: "safe-password",
      })
    );
  });
});
