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
});
