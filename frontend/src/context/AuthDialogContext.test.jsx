import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthDialogProvider, useAuthDialog } from "./AuthDialogContext";

const auth = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }));

vi.mock("./AuthContext", () => ({
  useAuth: () => auth,
}));

function Trigger({ mode, returnTo }) {
  const { openAuthDialog } = useAuthDialog();
  const location = useLocation();
  return (
    <>
      <p aria-label="Current location">{location.pathname}</p>
      <button type="button" onClick={() => openAuthDialog(mode, { returnTo })}>
        Open auth
      </button>
    </>
  );
}

function renderWithTrigger({ mode = "login", returnTo } = {}) {
  return render(
    <MemoryRouter initialEntries={["/props"]}>
      <AuthDialogProvider>
        <Routes>
          <Route path="*" element={<Trigger mode={mode} returnTo={returnTo} />} />
        </Routes>
      </AuthDialogProvider>
    </MemoryRouter>
  );
}

async function openDialog(user) {
  await user.click(screen.getByRole("button", { name: "Open auth" }));
  return screen.getByRole("dialog");
}

describe("AuthDialogProvider", () => {
  beforeEach(() => {
    auth.login.mockReset();
    auth.register.mockReset();
    auth.login.mockResolvedValue({ username: "demo" });
    auth.register.mockResolvedValue({ username: "newseer" });
  });

  it("opens in login mode and switches between log in and sign up", async () => {
    const user = userEvent.setup();
    renderWithTrigger();

    const dialog = await openDialog(user);
    expect(dialog).toHaveAccessibleName("Log in");
    expect(within(dialog).getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");

    await user.click(within(dialog).getByRole("button", { name: "Create an account" }));
    expect(dialog).toHaveAccessibleName("Sign up");
    expect(within(dialog).getByLabelText("Email")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Log in instead" }));
    expect(dialog).toHaveAccessibleName("Log in");
  });

  it("puts focus in the first field when it opens and when switching modes", async () => {
    const user = userEvent.setup();
    renderWithTrigger();

    const dialog = await openDialog(user);
    expect(within(dialog).getByLabelText("Username")).toHaveFocus();

    await user.click(within(dialog).getByRole("button", { name: "Create an account" }));
    expect(within(dialog).getByLabelText("Username")).toHaveFocus();
  });

  it("can open straight into sign up", async () => {
    const user = userEvent.setup();
    renderWithTrigger({ mode: "signup" });

    expect(await openDialog(user)).toHaveAccessibleName("Sign up");
  });

  it("closes on Escape and returns focus to what opened it", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    const dialog = await openDialog(user);

    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open auth" })).toHaveFocus();
  });

  it("closes from its close button without signing in", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it("shows a failed login inline and keeps the dialog open", async () => {
    auth.login.mockRejectedValue({ response: { data: { message: "Invalid username or password" } } });
    const user = userEvent.setup();
    renderWithTrigger();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "wrong-pass");
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Invalid username or password");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("submits once even if the button is pressed twice", async () => {
    let finishLogin;
    auth.login.mockImplementation(() => new Promise((resolve) => { finishLogin = resolve; }));
    const user = userEvent.setup();
    renderWithTrigger();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    const submit = within(dialog).getByRole("button", { name: "Log in" });
    await user.click(submit);
    await user.click(submit);

    expect(auth.login).toHaveBeenCalledTimes(1);
    finishLogin({ username: "demo" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes after logging in and leaves the visitor on the same page", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(auth.login).toHaveBeenCalledWith({ username: "demo", password: "safe-password" });
    expect(screen.getByLabelText("Current location")).toHaveTextContent("/props");
  });

  it("goes to the requested page after logging in", async () => {
    const user = userEvent.setup();
    renderWithTrigger({ returnTo: "/groups" });
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.getByLabelText("Current location")).toHaveTextContent("/groups"));
  });

  it("fills the local demo credentials in development", async () => {
    const user = userEvent.setup();
    renderWithTrigger();
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole("button", { name: "Use demo account" }));
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));

    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({ username: "demo", password: "demo-only-password" })
    );
  });

  it("creates an account with only username, email, and password", async () => {
    const user = userEvent.setup();
    renderWithTrigger({ mode: "signup" });
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Username"), "newseer");
    await user.type(within(dialog).getByLabelText("Email"), "seer@example.com");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    await user.click(within(dialog).getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(auth.register).toHaveBeenCalledWith({
      username: "newseer",
      email: "seer@example.com",
      password: "safe-password",
    });
  });
});
