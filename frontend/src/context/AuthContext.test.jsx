import { act, render, screen } from "@testing-library/react";
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
});
