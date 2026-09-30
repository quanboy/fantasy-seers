import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthDialogProvider, useAuthDialog } from "./AuthDialogContext";

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  cancelPendingAuth: vi.fn(),
}));

vi.mock("./AuthContext", () => ({
  useAuth: () => auth,
}));

function Trigger({ mode, returnTo, onAuthenticated }) {
  const { openAuthDialog } = useAuthDialog();
  const location = useLocation();
  return (
    <>
      <p aria-label="Current location">{location.pathname}</p>
      <button type="button" onClick={() => openAuthDialog(mode, { returnTo, onAuthenticated })}>
        Open auth
      </button>
      <button type="button" onClick={() => openAuthDialog("login")}>
        Plain login
      </button>
    </>
  );
}

function renderWithTrigger({ mode = "login", returnTo, onAuthenticated } = {}) {
  return render(
    <MemoryRouter initialEntries={["/props"]}>
      <AuthDialogProvider>
        <Routes>
          <Route path="*" element={<Trigger mode={mode} returnTo={returnTo} onAuthenticated={onAuthenticated} />} />
        </Routes>
      </AuthDialogProvider>
    </MemoryRouter>
  );
}

function DisappearingTrigger() {
  const [authenticated, setAuthenticated] = useState(false);
  const { openAuthDialog } = useAuthDialog();
  return (
    <main data-auth-focus-fallback tabIndex={-1}>
      {!authenticated && (
        <button
          type="button"
          onClick={() => openAuthDialog("login", { onAuthenticated: () => setAuthenticated(true) })}
        >
          Log in
        </button>
      )}
      {authenticated && <p>Signed in</p>}
    </main>
  );
}

async function openDialog(user) {
  await user.click(screen.getByRole("button", { name: "Open auth" }));
  return screen.getByRole("dialog");
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("AuthDialogProvider", () => {
  beforeEach(() => {
    auth.login.mockReset();
    auth.register.mockReset();
    auth.cancelPendingAuth.mockReset();
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

  it("moves focus to the app when authentication removes the opening control", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthDialogProvider>
          <DisappearingTrigger />
        </AuthDialogProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Log in" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));

    await screen.findByText("Signed in");
    expect(screen.getByRole("main")).toHaveFocus();
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

  it("resumes the action that asked for login exactly once", async () => {
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    renderWithTrigger({ onAuthenticated });
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
    expect(onAuthenticated).toHaveBeenCalledWith({ username: "demo" });
  });

  it("does not resume a cancelled action, even after a later login", async () => {
    const onAuthenticated = vi.fn();
    const user = userEvent.setup();
    renderWithTrigger({ onAuthenticated });

    const firstDialog = await openDialog(user);
    fireEvent(firstDialog, new Event("cancel", { cancelable: true }));
    expect(onAuthenticated).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Plain login" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("does not resume an action when the dialog closes during an in-flight login", async () => {
    const loginRequest = deferred();
    const onAuthenticated = vi.fn();
    auth.login.mockReturnValue(loginRequest.promise);
    const user = userEvent.setup();
    renderWithTrigger({ onAuthenticated });
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(auth.cancelPendingAuth).toHaveBeenCalled();

    await act(async () => {
      loginRequest.resolve({ username: "demo" });
    });

    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("invalidates an older auth attempt before opening a new dialog", () => {
    renderWithTrigger();

    fireEvent.click(screen.getByRole("button", { name: "Open auth" }));

    expect(auth.cancelPendingAuth).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Log in");
  });

  it("cancels an in-flight login when switching to sign up", async () => {
    const loginRequest = deferred();
    const onAuthenticated = vi.fn();
    auth.login.mockReturnValue(loginRequest.promise);
    const user = userEvent.setup();
    renderWithTrigger({ onAuthenticated });
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText("Username"), "demo");
    await user.type(within(dialog).getByLabelText("Password"), "safe-password");
    await user.click(within(dialog).getByRole("button", { name: "Log in" }));
    await user.click(within(dialog).getByRole("button", { name: "Create an account" }));

    expect(dialog).toHaveAccessibleName("Sign up");
    expect(auth.cancelPendingAuth).toHaveBeenCalled();

    await act(async () => {
      loginRequest.resolve({ username: "demo" });
    });

    expect(dialog).toHaveAccessibleName("Sign up");
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
