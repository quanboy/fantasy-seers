import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MasterSheetPage from "./MasterSheetPage";

const boardMocks = vi.hoisted(() => ({
  getMySheet: vi.fn(),
  upsertEntries: vi.fn(),
}));

vi.mock("../api/client", () => ({
  boardsApi: boardMocks,
}));

const rankings = [
  { playerId: 1, fullName: "Alpha Runner", position: "RB", nflTeam: "BUF", adp: 1, overallRank: 1, positionalRank: 1 },
  { playerId: 2, fullName: "Bravo Catcher", position: "WR", nflTeam: "DET", adp: 2, overallRank: 2, positionalRank: 1 },
];

describe("MasterSheetPage", () => {
  beforeEach(() => {
    localStorage.clear();
    boardMocks.getMySheet.mockReset();
    boardMocks.upsertEntries.mockReset();
    boardMocks.getMySheet.mockResolvedValue({
      data: {
        boardId: 42,
        season: 2026,
        rankings,
        isDefault: true,
        locked: false,
        scoringFormat: "FULL_PPR",
        superflex: false,
      },
    });
    boardMocks.upsertEntries.mockResolvedValue({ data: {} });
  });

  it("restores a local draft, warns before unload, and clears it after saving", async () => {
    localStorage.setItem("fs_board_draft:42", JSON.stringify({ rankings: [...rankings].reverse() }));
    const user = userEvent.setup();

    render(<MasterSheetPage />);

    expect(await screen.findByText("Unsaved changes restored from this device")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Move Bravo Catcher, currently ranked 1/ })).toHaveClass("w-11", "h-11");

    const unloadEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(unloadEvent)).toBe(false);

    await user.click(screen.getByRole("button", { name: "Save Rankings" }));

    await waitFor(() => expect(boardMocks.upsertEntries).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("fs_board_draft:42")).toBeNull();
    expect(await screen.findByRole("button", { name: "Saved ✓" })).toBeDisabled();
  });

  it("ignores a corrupted draft with duplicate player IDs", async () => {
    localStorage.setItem(
      "fs_board_draft:42",
      JSON.stringify({ rankings: [rankings[0], rankings[0]] })
    );

    render(<MasterSheetPage />);

    expect(
      await screen.findByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Move Bravo Catcher, currently ranked 2/ })
    ).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes restored from this device")).not.toBeInTheDocument();
  });

  it("guides a first-time user from the consensus order through the league lock", async () => {
    render(<MasterSheetPage />);

    expect(
      await screen.findByRole("heading", { name: "Make this board yours" })
    ).toBeInTheDocument();
    expect(screen.getByText("Rank players")).toBeInTheDocument();
    expect(screen.getByText("Save your sheet")).toBeInTheDocument();
    expect(screen.getByText("League lock")).toBeInTheDocument();
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
    expect(
      screen.getByText(/If you never save, this starting order is what locks/)
    ).toBeInTheDocument();
  });

  it("shows when the user's personal rankings are safely saved", async () => {
    boardMocks.getMySheet.mockResolvedValue({
      data: {
        boardId: 42,
        season: 2026,
        rankings,
        isDefault: false,
        locked: false,
        scoringFormat: "HALF_PPR",
        superflex: false,
      },
    });

    render(<MasterSheetPage />);

    expect(
      await screen.findByRole("heading", { name: "Your rankings are saved" })
    ).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("HALF PPR · Single-QB")).toBeInTheDocument();
  });

  it("explains that a locked board is final", async () => {
    boardMocks.getMySheet.mockResolvedValue({
      data: {
        boardId: 42,
        season: 2026,
        rankings,
        isDefault: false,
        locked: true,
        scoringFormat: "HALF_PPR",
        superflex: true,
      },
    });

    render(<MasterSheetPage />);

    expect(
      await screen.findByRole("heading", { name: "Your season board is final" })
    ).toBeInTheDocument();
    expect(screen.getByText("Final for season")).toBeInTheDocument();
    expect(screen.getByText("HALF PPR · Superflex")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Locked" })).toBeDisabled();
  });
});
