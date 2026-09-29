import { beforeEach, describe, expect, it, vi } from "vitest";
import api, { SESSION_EXPIRED_EVENT } from "./client";

describe("API session expiry", () => {
  beforeEach(() => {
    localStorage.clear();
    document.querySelectorAll('[role="status"]').forEach((node) => node.remove());
  });

  it("does not clear a newer session when an older request returns 401", async () => {
    let rejectRequest;
    let requestStarted;
    const started = new Promise((resolve) => {
      requestStarted = resolve;
    });
    const onExpired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    localStorage.setItem("fs_token", "account-a-token");
    localStorage.setItem("fs_user", JSON.stringify({ username: "account-a" }));

    const request = api.get("/users/me", {
      adapter: (config) => {
        requestStarted();
        return new Promise((resolve, reject) => {
          rejectRequest = () => reject({ config, response: { status: 401 } });
        });
      },
    });
    await started;

    localStorage.setItem("fs_token", "account-b-token");
    localStorage.setItem("fs_user", JSON.stringify({ username: "account-b" }));
    rejectRequest();
    await expect(request).rejects.toBeDefined();

    expect(localStorage.getItem("fs_token")).toBe("account-b-token");
    expect(JSON.parse(localStorage.getItem("fs_user"))).toEqual({ username: "account-b" });
    expect(onExpired).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  });
});
