// Browser-only rankings for visitors who haven't signed in. Kept apart from
// account drafts (fs_board_draft:<boardId>) and scoped to the board's format,
// so a draft never lands on a board it wasn't made for.

const memoryDrafts = new Map();

function draftKey({ season, scoringFormat, superflex }) {
  return `fs_guest_draft:${season}:${scoringFormat}:${superflex ? "SF" : "1QB"}`;
}

function hasUniquePlayers(rankings) {
  return (
    Array.isArray(rankings) &&
    rankings.length > 0 &&
    rankings.every((player) => Number.isInteger(player?.playerId)) &&
    new Set(rankings.map((player) => player.playerId)).size === rankings.length
  );
}

function matchesPlayers(rankings, players) {
  const current = new Set(players.map((player) => player.playerId));
  return (
    rankings.length === current.size &&
    rankings.every((player) => current.has(player.playerId))
  );
}

/**
 * Returns the stored guest rankings for this board format, or null if there are
 * none or they can't be trusted. Pass `players` to also require the exact
 * current player pool.
 */
export function loadGuestDraft(sheet, { players } = {}) {
  const key = draftKey(sheet);
  let draft = memoryDrafts.get(key);
  if (draft === undefined) {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return null;
      draft = JSON.parse(stored);
    } catch {
      return null;
    }
  }
  const rankings = Array.isArray(draft) ? draft : draft?.rankings;
  if (!hasUniquePlayers(rankings)) return null;
  if (players && !matchesPlayers(rankings, players)) return null;
  return rankings;
}

/** Stores the guest rankings; returns false if the browser refused. */
export function saveGuestDraft(sheet, rankings) {
  const key = draftKey(sheet);
  memoryDrafts.set(key, rankings);
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ savedAt: new Date().toISOString(), rankings })
    );
    return true;
  } catch {
    return false;
  }
}

export function clearGuestDraft(sheet) {
  const key = draftKey(sheet);
  memoryDrafts.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing stored if storage is unavailable.
  }
}
