import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import api, { userApi } from "../api/client";
import { AuthProvider, useAuth } from "./AuthContext";

function fakeToken(expiresInSeconds) {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  return `header.${payload}.signature`;
}

function WhoAmI() {
  const { user } = useAuth();
  return <p>{user ? `Signed in as ${user.username}` : "Browsing as guest"}</p>;
}

function AuthActions() {
  const { user, login, logout, cancelPendingAuth } = useAuth();
  return (
    <>
      <p>{user ? `Signed in as ${user.username}` : "Browsing as guest"}</p>
      <button type="button" onClick={() => login({ username: "first" })}>First login</button>
      <button type="button" onClick={() => login({ username: "second" })}>Second login</button>
      <button type="button" onClick={logout}>Log out</button>
      <button type="button" onClick={cancelPendingAuth}>Cancel authentication</button>
    </>
  );
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function authResponse(config, username, token) {
  return { data: { username, token, role: "USER" }, status: 200, statusText: "OK", headers: {}, config };
}

function respondWith(status) {
  api.defaults.adapter = (config) =>
    Promise.reject(Object.assign(new Error(`HTTP ${status}`), { config, response: { status } }));
}

describe("AuthProvider session expiry", () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("turns an expired session into a guest session in place", async () => {
    localStorage.setItem("fs_token", fakeToken(3600));
    localStorage.setItem("fs_user", JSON.stringify({ username: "demo", pointBank: 1000, role: "USER" }));
    render(<AuthProvider><WhoAmI /></AuthProvider>);
    expect(await screen.findByText("Signed in as demo")).toBeInTheDocument();

    respondWith(401);
    await act(async () => {
      await userApi.getMe().catch(() => {});
    });

    expect(screen.getByText("Browsing as guest")).toBeInTheDocument();
    expect(screen.getByText(/Your session expired/)).toBeInTheDocument();
    expect(localStorage.getItem("fs_token")).toBeNull();
    expect(localStorage.getItem("fs_user")).toBeNull();
  });

  it("does not announce an expired session to someone who was never signed in", async () => {
    render(<AuthProvider><WhoAmI /></AuthProvider>);
    expect(await screen.findByText("Browsing as guest")).toBeInTheDocument();

    respondWith(401);
    await act(async () => {
      await userApi.getMe().catch(() => {});
    });

    expect(screen.queryByText(/Your session expired/)).not.toBeInTheDocument();
  });

  it("keeps the session when the server says an action is forbidden", async () => {
    localStorage.setItem("fs_token", fakeToken(3600));
    localStorage.setItem("fs_user", JSON.stringify({ username: "demo", pointBank: 1000, role: "USER" }));
    render(<AuthProvider><WhoAmI /></AuthProvider>);
    expect(await screen.findByText("Signed in as demo")).toBeInTheDocument();

    respondWith(403);
    await act(async () => {
      await userApi.getMe().catch(() => {});
    });

    expect(screen.getByText("Signed in as demo")).toBeInTheDocument();
    expect(localStorage.getItem("fs_token")).not.toBeNull();
  });

  it("does not let an older login overwrite a newer authenticated session", async () => {
    const firstRequest = deferred();
    const secondRequest = deferred();
    let requestCount = 0;
    api.defaults.adapter = (config) => (++requestCount === 1 ? firstRequest.promise : secondRequest.promise);
    render(<AuthProvider><AuthActions /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "First login" }));
    fireEvent.click(screen.getByRole("button", { name: "Second login" }));

    await act(async () => {
      secondRequest.resolve(authResponse({}, "second", "second-token"));
    });
    expect(screen.getByText("Signed in as second")).toBeInTheDocument();

    await act(async () => {
      firstRequest.resolve(authResponse({}, "first", "first-token"));
    });

    expect(screen.getByText("Signed in as second")).toBeInTheDocument();
    expect(localStorage.getItem("fs_token")).toBe("second-token");
  });

  it("does not authenticate after the active request is cancelled", async () => {
    const loginRequest = deferred();
    api.defaults.adapter = () => loginRequest.promise;
    render(<AuthProvider><AuthActions /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "First login" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel authentication" }));

    await act(async () => {
      loginRequest.resolve(authResponse({}, "first", "first-token"));
    });

    expect(screen.getByText("Browsing as guest")).toBeInTheDocument();
    expect(localStorage.getItem("fs_token")).toBeNull();
  });

  it("does not let an older logout erase a newer login", async () => {
    const logoutRequest = deferred();
    api.defaults.adapter = (config) => {
      if (config.url.endsWith("/logout")) return logoutRequest.promise;
      return Promise.resolve(authResponse(config, "second", "second-token"));
    };
    render(<AuthProvider><AuthActions /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    fireEvent.click(screen.getByRole("button", { name: "Second login" }));
    expect(await screen.findByText("Signed in as second")).toBeInTheDocument();

    await act(async () => {
      logoutRequest.resolve({ data: {}, status: 200, statusText: "OK", headers: {}, config: {} });
    });

    expect(screen.getByText("Signed in as second")).toBeInTheDocument();
    expect(localStorage.getItem("fs_token")).toBe("second-token");
  });
});
