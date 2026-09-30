import { beforeEach, describe, expect, it } from "vitest";
import { captureSession, sameSession } from "./sessionIdentity";

describe("session identity", () => {
  beforeEach(() => localStorage.clear());

  it("requires the same account and JWT", () => {
    localStorage.setItem("fs_token", "first-token");
    const first = captureSession({ accountIdentity: "demo" });

    expect(sameSession(first, captureSession({ accountIdentity: "demo" }))).toBe(true);
    expect(sameSession(first, captureSession({ accountIdentity: "other" }))).toBe(false);

    localStorage.setItem("fs_token", "second-token");
    expect(sameSession(first, captureSession({ accountIdentity: "demo" }))).toBe(false);
  });

  it("also requires the same board when either snapshot is board-scoped", () => {
    const board = captureSession({ accountIdentity: "demo", boardId: 42 });

    expect(sameSession(board, captureSession({ accountIdentity: "demo", boardId: 42 }))).toBe(true);
    expect(sameSession(board, captureSession({ accountIdentity: "demo", boardId: 84 }))).toBe(false);
    expect(sameSession(board, captureSession({ accountIdentity: "demo" }))).toBe(false);
  });
});
