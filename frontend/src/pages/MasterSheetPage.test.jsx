import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MasterSheetPage, { reorderFilteredPlayers } from "./MasterSheetPage";
import { loadGuestDraft, saveGuestDraft } from "../utils/guestDraft";

const boardMocks = vi.hoisted(() => ({
  getMySheet: vi.fn(),
  getDefaultSheet: vi.fn(),
  upsertEntries: vi.fn(),
}));

const auth = vi.hoisted(() => ({ user: null }));
const openAuthDialog = vi.hoisted(() => vi.fn());

vi.mock("../context/AuthDialogContext", () => ({
  useAuthDialog: () => ({ openAuthDialog }),
}));

vi.mock("../api/client", () => ({
  boardsApi: boardMocks,
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));

const rankings = [
  { playerId: 1, sleeperId: "1001", fullName: "Alpha Runner", position: "RB", nflTeam: "BUF", adp: 1, overallRank: 1, positionalRank: 1 },
  { playerId: 2, sleeperId: "1002", fullName: "Bravo Catcher", position: "WR", nflTeam: "DET", adp: 2, overallRank: 2, positionalRank: 1 },
];

it("reorders filtered players without moving excluded-position slots", () => {
  const fullBoard = [
    rankings[0],
    rankings[1],
    { playerId: 3, fullName: "Charlie Passer", position: "QB" },
    { playerId: 4, fullName: "Delta Catcher", position: "WR" },
  ];

  const reordered = reorderFilteredPlayers(
    fullBoard,
    [fullBoard[1], fullBoard[3]],
    ["WR"],
    4,
    2
  );

  expect(reordered.map((player) => player.playerId)).toEqual([1, 4, 3, 2]);
});

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
    auth.user = { username: "demo", role: "USER" };
    boardMocks.getMySheet.mockReset();
    boardMocks.getDefaultSheet.mockReset();
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

  describe("for guests", () => {
    const guestSheet = { season: 2026, scoringFormat: "HALF_PPR", superflex: false };

    beforeEach(() => {
      auth.user = null;
      boardMocks.getDefaultSheet.mockResolvedValue({
        data: { boardId: null, ...guestSheet, rankings, isDefault: true, locked: false },
      });
    });

    it("restores guest rankings saved on this device", async () => {
      saveGuestDraft(guestSheet, [...rankings].reverse());

      renderMasterSheet();

      expect(
        await screen.findByRole("button", { name: /Move Bravo Catcher, currently ranked 1/ })
      ).toBeInTheDocument();
      expect(screen.getByText("Guest rankings restored from this device")).toBeInTheDocument();
      expect(boardMocks.getMySheet).not.toHaveBeenCalled();
    });

    it("ignores guest rankings that no longer match the board", async () => {
      saveGuestDraft(guestSheet, [rankings[1]]);

      renderMasterSheet();

      expect(
        await screen.findByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })
      ).toBeInTheDocument();
      expect(screen.queryByText(/restored from this device/)).not.toBeInTheDocument();
    });

    it("ignores guest rankings made for a different scoring format", async () => {
      saveGuestDraft({ ...guestSheet, scoringFormat: "FULL_PPR" }, [...rankings].reverse());

      renderMasterSheet();

      expect(
        await screen.findByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })
      ).toBeInTheDocument();
    });

    describe("then signs in", () => {
      const guestOrder = [...rankings].reverse();
      const account = (overrides) => ({
        data: { boardId: 42, ...guestSheet, rankings, isDefault: true, locked: false, ...overrides },
      });

      async function renderGuestWithDraft() {
        saveGuestDraft(guestSheet, guestOrder);
        renderMasterSheet();
        await screen.findByText("Guest rankings restored from this device");
      }

      async function signInFromSave(accountResponse) {
        boardMocks.getMySheet.mockResolvedValue(accountResponse);
        fireEvent.click(screen.getByRole("button", { name: "Sign up to save" }));
        const [, { onAuthenticated }] = openAuthDialog.mock.calls.at(-1);
        await act(async () => {
          auth.user = { username: "demo", role: "USER" };
          onAuthenticated();
        });
      }

      const savedIds = () => boardMocks.upsertEntries.mock.calls.at(-1)[1].map((entry) => entry.playerId);

      it("saves the guest rankings to a new account's empty board", async () => {
        await renderGuestWithDraft();
        await signInFromSave(account());

        await waitFor(() => expect(boardMocks.upsertEntries).toHaveBeenCalledTimes(1));
        expect(savedIds()).toEqual([2, 1]);
        expect(await screen.findByRole("button", { name: "Saved ✓" })).toBeInTheDocument();
        expect(loadGuestDraft(guestSheet)).toBeNull();
      });

      it("asks before replacing rankings the account already saved", async () => {
        const user = userEvent.setup();
        await renderGuestWithDraft();
        await signInFromSave(account({ isDefault: false }));

        expect(await screen.findByText(/You already have saved rankings/)).toBeInTheDocument();
        expect(screen.getByText(/Replacing overwrites your saved order/)).toBeInTheDocument();
        expect(boardMocks.upsertEntries).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Replace saved rankings" }));

        await waitFor(() => expect(boardMocks.upsertEntries).toHaveBeenCalledTimes(1));
        expect(savedIds()).toEqual([2, 1]);
        expect(loadGuestDraft(guestSheet)).toBeNull();
      });

      it("keeps the saved rankings and the guest draft when asked to", async () => {
        const user = userEvent.setup();
        await renderGuestWithDraft();
        await signInFromSave(account({ isDefault: false }));

        await user.click(await screen.findByRole("button", { name: "Keep saved rankings" }));

        expect(boardMocks.upsertEntries).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })).toBeInTheDocument();
        expect(loadGuestDraft(guestSheet)).toEqual(guestOrder);
        expect(screen.getByRole("button", { name: "View guest rankings" })).toBeInTheDocument();
      });

      it("keeps the guest draft and shows the error when saving it fails", async () => {
        boardMocks.upsertEntries.mockRejectedValue({ response: { data: { message: "Server unavailable" } } });
        await renderGuestWithDraft();
        await signInFromSave(account());

        expect(await screen.findByText(/Server unavailable/)).toBeInTheDocument();
        expect(loadGuestDraft(guestSheet)).toEqual(guestOrder);
      });

      it("keeps a locked account board unchanged and offers the guest version as practice", async () => {
        const user = userEvent.setup();
        await renderGuestWithDraft();
        await signInFromSave(account({ isDefault: false, locked: true }));

        expect(await screen.findByText(/league has locked/)).toBeInTheDocument();
        expect(boardMocks.upsertEntries).not.toHaveBeenCalled();

        await user.click(screen.getByRole("button", { name: "View practice board" }));

        expect(screen.getByRole("button", { name: /Move Bravo Catcher, currently ranked 1/ })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Practice only" })).toBeDisabled();
        expect(boardMocks.upsertEntries).not.toHaveBeenCalled();
      });

      it("after a header login, shows the account board and offers the guest rankings without saving them", async () => {
        const user = userEvent.setup();
        const accountDraft = JSON.stringify({ rankings: [] });
        localStorage.setItem("fs_board_draft:42", accountDraft);
        boardMocks.getMySheet.mockResolvedValue(account({ isDefault: false }));
        saveGuestDraft(guestSheet, guestOrder);
        auth.user = { username: "demo", role: "USER" };

        renderMasterSheet();

        expect(await screen.findByRole("button", { name: "View guest rankings" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "View guest rankings" }));
        expect(screen.getByRole("button", { name: /Move Bravo Catcher, currently ranked 1/ })).toBeInTheDocument();
        expect(boardMocks.upsertEntries).not.toHaveBeenCalled();
        expect(localStorage.getItem("fs_board_draft:42")).toBe(accountDraft);

        await user.click(screen.getByRole("button", { name: "Back to saved rankings" }));
        expect(screen.getByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Discard guest rankings" }));
        expect(loadGuestDraft(guestSheet)).toBeNull();
        expect(screen.queryByRole("button", { name: "View guest rankings" })).not.toBeInTheDocument();
      });
    });

    it("never restores guest rankings onto a signed-in board", async () => {
      auth.user = { username: "demo", role: "USER" };
      saveGuestDraft({ season: 2026, scoringFormat: "FULL_PPR", superflex: false }, [...rankings].reverse());

      renderMasterSheet();

      expect(
        await screen.findByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })
      ).toBeInTheDocument();
      expect(screen.queryByText(/restored from this device/)).not.toBeInTheDocument();
    });
  });

  it("shows guests the public default sheet and asks them to sign up to save", async () => {
    auth.user = null;
    boardMocks.getDefaultSheet.mockResolvedValue({
      data: {
        boardId: null,
        season: 2026,
        rankings,
        isDefault: true,
        locked: false,
        scoringFormat: "HALF_PPR",
        superflex: false,
      },
    });

    renderMasterSheet();

    expect(
      await screen.findByRole("button", { name: /Move Alpha Runner, currently ranked 1/ })
    ).toBeInTheDocument();
    expect(boardMocks.getMySheet).not.toHaveBeenCalled();

    const toolbar = screen.getByRole("toolbar", { name: "Ranking controls" });
    fireEvent.click(within(toolbar).getByRole("button", { name: "Sign up to save" }));
    expect(openAuthDialog).toHaveBeenCalledWith("signup", expect.objectContaining({ onAuthenticated: expect.any(Function) }));
    expect(within(toolbar).queryByRole("button", { name: "Save Rankings" })).not.toBeInTheDocument();
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

  it("preserves the draft and reports a rejected save", async () => {
    localStorage.setItem("fs_board_draft:42", JSON.stringify({ rankings: [...rankings].reverse() }));
    boardMocks.upsertEntries.mockRejectedValue({
      response: { data: { message: "Rankings service is unavailable" } },
    });
    const user = userEvent.setup();
    renderMasterSheet();

    await user.click(await screen.findByRole("button", { name: "Save Rankings" }));

    expect(await screen.findByText("Rankings service is unavailable")).toBeInTheDocument();
    expect(localStorage.getItem("fs_board_draft:42")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Save Rankings" })).toBeEnabled();
  });
});
