import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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
  { playerId: 1, sleeperId: "1001", fullName: "Alpha Runner", position: "RB", nflTeam: "BUF", adp: 1, overallRank: 1, positionalRank: 1 },
  { playerId: 2, sleeperId: "1002", fullName: "Bravo Catcher", position: "WR", nflTeam: "DET", adp: 2, overallRank: 2, positionalRank: 1 },
];

function renderMasterSheet(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MasterSheetPage />
    </MemoryRouter>
  );
}

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

    renderMasterSheet();

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

    renderMasterSheet();

    expect(
      await screen.findByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Move Bravo Catcher, currently ranked 2/ })
    ).toBeInTheDocument();
    expect(screen.queryByText("Unsaved changes restored from this device")).not.toBeInTheDocument();
  });

  it("guides a first-time user from the consensus order through the league lock", async () => {
    renderMasterSheet();

    expect(
      await screen.findByRole("heading", { name: "Master Sheet" })
    ).toBeInTheDocument();
    expect(screen.getByText("Rank players")).toBeInTheDocument();
    expect(screen.getByText("Save your sheet")).toBeInTheDocument();
    expect(screen.getByText("League lock")).toBeInTheDocument();
    expect(screen.getByText("Not saved")).toBeInTheDocument();
    expect(
      screen.getByText(/Consensus rankings are your starting point/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss consensus explanation" })).toBeInTheDocument();

    const toolbar = screen.getByRole("toolbar", { name: "Ranking controls" });
    expect(within(toolbar).getByRole("button", { name: "ALL" })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "Save Rankings" })).toBeDisabled();
  });

  it("shows player and team imagery with readable fallbacks", async () => {
    renderMasterSheet();

    const headshot = await screen.findByRole("img", { name: "Alpha Runner headshot" });
    const teamLogo = screen.getByRole("img", { name: "Buffalo Bills logo" });
    expect(headshot).toHaveAttribute(
      "src",
      "https://sleepercdn.com/content/nfl/players/thumb/1001.jpg"
    );
    expect(teamLogo).toHaveAttribute(
      "src",
      "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png"
    );
    expect(screen.getByText("Buffalo Bills")).toBeInTheDocument();

    fireEvent.error(headshot);
    fireEvent.error(teamLogo);
    expect(screen.getByLabelText("Alpha Runner initials")).toHaveTextContent("AR");
    expect(screen.getByLabelText("Buffalo Bills abbreviation")).toHaveTextContent("BUF");
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

    renderMasterSheet();

    expect(
      await screen.findByRole("heading", { name: "Master Sheet" })
    ).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByLabelText("Board format: 2026 · HALF PPR · Single-QB")).toBeInTheDocument();
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

    renderMasterSheet();

    expect(
      await screen.findByRole("heading", { name: "Master Sheet" })
    ).toBeInTheDocument();
    expect(screen.getByText(/League lock complete/)).toBeInTheDocument();
    expect(screen.getByLabelText("Board format: 2026 · HALF PPR · Superflex")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Locked" })).toBeDisabled();
  });

  it("filters immediately by player, team code, full team name, and position", async () => {
    const user = userEvent.setup();
    renderMasterSheet("/?q=Detroit%20Lions");

    expect(await screen.findByText("Bravo Catcher")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Runner")).not.toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: "Search players" });
    await user.clear(search);
    await user.type(search, "BUF");
    expect(screen.getByText("Alpha Runner")).toBeInTheDocument();
    expect(screen.queryByText("Bravo Catcher")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "WR");
    expect(screen.getByText("Bravo Catcher")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Runner")).not.toBeInTheDocument();
  });

  it("shows a useful no-match state and clearing search preserves position filters", async () => {
    const user = userEvent.setup();
    renderMasterSheet();

    const toolbar = await screen.findByRole("toolbar", { name: "Ranking controls" });
    await user.click(within(toolbar).getByRole("button", { name: "WR" }));
    await user.type(screen.getByRole("searchbox", { name: "Search players" }), "Alpha");

    expect(screen.getByText("No players match this search and position filter.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear player search" }));
    expect(screen.getByText("Bravo Catcher")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Runner")).not.toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "WR" })).toHaveAttribute("aria-pressed", "true");
  });

  it("disables reordering during search and can reveal a result in the full board", async () => {
    const user = userEvent.setup();
    renderMasterSheet("/?q=Bravo");

    const moveButton = await screen.findByRole("button", {
      name: /Move Bravo Catcher, currently ranked 2/,
    });
    expect(moveButton).toBeDisabled();
    expect(screen.getByText("Search results are view-only. Clear search to reorder players.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show Bravo Catcher in board" }));

    expect(screen.getByRole("searchbox", { name: "Search players" })).toHaveValue("");
    expect(screen.getByText("Alpha Runner")).toBeInTheDocument();
    expect(screen.getByText("Bravo Catcher is shown in the full board.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ALL" })).toHaveAttribute("aria-pressed", "true");
  });

  it("searches unknown team codes and free-agent fallbacks", async () => {
    boardMocks.getMySheet.mockResolvedValue({
      data: {
        boardId: 42,
        season: 2026,
        rankings: [
          ...rankings,
          { playerId: 3, fullName: "Charlie Mystery", position: "RB", nflTeam: "XYZ", adp: null, overallRank: 3, positionalRank: 2 },
          { playerId: 4, fullName: "Delta Unsigned", position: "WR", nflTeam: null, adp: null, overallRank: 4, positionalRank: 2 },
        ],
        isDefault: true,
        locked: false,
        scoringFormat: "FULL_PPR",
        superflex: false,
      },
    });
    const user = userEvent.setup();
    renderMasterSheet("/?q=XYZ");

    expect(await screen.findByText("Charlie Mystery")).toBeInTheDocument();
    expect(screen.queryByText("Delta Unsigned")).not.toBeInTheDocument();

    const search = screen.getByRole("searchbox", { name: "Search players" });
    await user.clear(search);
    await user.type(search, "Free Agent");
    expect(screen.getByText("Delta Unsigned")).toBeInTheDocument();
    expect(screen.queryByText("Charlie Mystery")).not.toBeInTheDocument();
  });

  it("saves the complete board while search and position filters are active", async () => {
    localStorage.setItem("fs_board_draft:42", JSON.stringify({ rankings: [...rankings].reverse() }));
    const user = userEvent.setup();
    renderMasterSheet("/?q=Bravo");

    const toolbar = await screen.findByRole("toolbar", { name: "Ranking controls" });
    await user.click(within(toolbar).getByRole("button", { name: "WR" }));
    await user.click(within(toolbar).getByRole("button", { name: "Save Rankings" }));

    await waitFor(() => expect(boardMocks.upsertEntries).toHaveBeenCalledWith(42, [
      { playerId: 2, rank: 2 },
      { playerId: 1, rank: 1 },
    ]));
  });
});
