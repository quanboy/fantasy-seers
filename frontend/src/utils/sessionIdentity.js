const hasBoardId = (session) => Object.prototype.hasOwnProperty.call(session, "boardId");

export function captureSession({ accountIdentity, boardId } = {}) {
  const session = {
    accountIdentity: accountIdentity ?? null,
    token: localStorage.getItem("fs_token"),
  };
  if (boardId !== undefined) session.boardId = boardId;
  return session;
}

export function sameSession(a, b) {
  if (!a || !b) return false;
  if (a.accountIdentity !== b.accountIdentity || a.token !== b.token) return false;
  const comparesBoard = hasBoardId(a) || hasBoardId(b);
  return !comparesBoard || (hasBoardId(a) && hasBoardId(b) && a.boardId === b.boardId);
}
