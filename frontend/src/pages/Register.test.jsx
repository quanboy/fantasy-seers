import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Register from "./Register";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ register: vi.fn() }),
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
    expect(screen.getByLabelText("Registration Code")).toHaveAttribute(
      "placeholder",
      "Enter your registration code"
    );
    expect(screen.getByLabelText("Favorite NFL Team")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
    expect(screen.getByText(/After signing in, use a separate group invite code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.queryByText(/thousands of seers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gamble responsibly/i)).not.toBeInTheDocument();
  });
});
