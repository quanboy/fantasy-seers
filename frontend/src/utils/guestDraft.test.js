import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGuestDraft, loadGuestDraft, saveGuestDraft } from "./guestDraft";

const halfPpr = { season: 2026, scoringFormat: "HALF_PPR", superflex: false };
const players = [
  { playerId: 1, fullName: "Alpha Runner", position: "RB" },
  { playerId: 2, fullName: "Bravo Catcher", position: "WR" },
  { playerId: 3, fullName: "Charlie Passer", position: "QB" },
];
const reordered = [players[2], players[0], players[1]];

describe("guest drafts", () => {
  beforeEach(() => {
    localStorage.clear();
    clearGuestDraft(halfPpr);
    clearGuestDraft({ ...halfPpr, season: 2027 });
    clearGuestDraft({ ...halfPpr, scoringFormat: "FULL_PPR" });
    clearGuestDraft({ ...halfPpr, superflex: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips a guest draft for the same season and format", () => {
    expect(saveGuestDraft(halfPpr, reordered)).toBe(true);
    expect(loadGuestDraft(halfPpr, { players })).toEqual(reordered);
  });

  it("keeps guest drafts apart from account drafts", () => {
    saveGuestDraft(halfPpr, reordered);
    expect(Object.keys(localStorage).some((key) => key.startsWith("fs_board_draft:"))).toBe(false);
  });

  it.each([
    ["another season", { ...halfPpr, season: 2027 }],
    ["another scoring format", { ...halfPpr, scoringFormat: "FULL_PPR" }],
    ["a superflex league", { ...halfPpr, superflex: true }],
  ])("does not offer the draft for %s", (_, otherSheet) => {
    saveGuestDraft(halfPpr, reordered);
    expect(loadGuestDraft(otherSheet, { players })).toBeNull();
  });

  it("ignores a draft whose players no longer match the current board", () => {
    saveGuestDraft(halfPpr, [players[0], players[1]]);
    expect(loadGuestDraft(halfPpr, { players })).toBeNull();

    saveGuestDraft(halfPpr, [players[0], players[0], players[1]]);
    expect(loadGuestDraft(halfPpr, { players })).toBeNull();
  });

  it("ignores unreadable stored data", () => {
    localStorage.setItem("fs_guest_draft:2026:HALF_PPR:1QB", "{not json");

    expect(loadGuestDraft(halfPpr, { players })).toBeNull();
  });

  it("can load a well-formed draft without a player list to check against", () => {
    saveGuestDraft(halfPpr, reordered);
    expect(loadGuestDraft(halfPpr)).toEqual(reordered);
  });

  it("clears only the draft for that season and format", () => {
    saveGuestDraft(halfPpr, reordered);
    saveGuestDraft({ ...halfPpr, season: 2027 }, reordered);

    clearGuestDraft(halfPpr);

    expect(loadGuestDraft(halfPpr)).toBeNull();
    expect(loadGuestDraft({ ...halfPpr, season: 2027 })).toEqual(reordered);
  });

  it("reports when the browser will not store the draft", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(saveGuestDraft(halfPpr, reordered)).toBe(false);
    expect(loadGuestDraft(halfPpr, { players })).toEqual(reordered);
  });

  it("prefers newer in-memory edits over an older stored draft", () => {
    expect(saveGuestDraft(halfPpr, players)).toBe(true);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(saveGuestDraft(halfPpr, reordered)).toBe(false);
    expect(loadGuestDraft(halfPpr, { players })).toEqual(reordered);
  });
});
