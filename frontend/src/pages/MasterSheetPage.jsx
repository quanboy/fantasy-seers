import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { boardsApi } from "../api/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSearchParams } from "react-router-dom";
import PlayerSearchField from "../components/PlayerSearchField";
import { withPlayerSearchQuery } from "../utils/playerSearch";
import { getNflTeamInfo } from "../utils/teams";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];
const PLAYER_GRID_COLUMNS =
  "grid grid-cols-[44px_32px_32px_24px_minmax(52px,1fr)_40px_20px] sm:grid-cols-[44px_36px_32px_24px_minmax(0,1fr)_48px_40px]";

export function reorderFilteredPlayers(
  rankings,
  filteredRankings,
  selectedPositions,
  activeId,
  overId
) {
  const filteredIds = filteredRankings.map((player) => player.playerId);
  const oldFilteredIndex = filteredIds.indexOf(activeId);
  const newFilteredIndex = filteredIds.indexOf(overId);
  if (oldFilteredIndex < 0 || newFilteredIndex < 0) return rankings;

  const reorderedIds = arrayMove(filteredIds, oldFilteredIndex, newFilteredIndex);
  const playersById = new Map(rankings.map((player) => [player.playerId, player]));
  let filteredIndex = 0;

  return rankings.map((player) => {
    if (!selectedPositions.includes(player.position)) return player;
    return playersById.get(reorderedIds[filteredIndex++]);
  });
}

function getPositionChipClass(position) {
  switch (position) {
    case "QB":
      return "chip-oracle";
    case "RB":
      return "chip-win";
    case "WR":
      return "chip-gold";
    case "TE":
      return "bg-orange-500/20 text-orange-300";
    case "K":
    case "DEF":
      return "bg-slate-700 text-slate-300";
    default:
      return "bg-slate-700 text-slate-300";
  }
}

function DragHandle({ disabled }) {
  return (
    <div className={`flex flex-col gap-0.5 px-1 ${
      disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"
    }`}>
      <div className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-slate-500" />
        <span className="w-1 h-1 rounded-full bg-slate-500" />
      </div>
      <div className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-slate-500" />
        <span className="w-1 h-1 rounded-full bg-slate-500" />
      </div>
      <div className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-slate-500" />
        <span className="w-1 h-1 rounded-full bg-slate-500" />
      </div>
    </div>
  );
}

function getInitials(fullName) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function PlayerHeadshot({ player }) {
  const [failed, setFailed] = useState(false);
  const hasHeadshot = Boolean(player.sleeperId) && player.position !== "DEF";

  if (!hasHeadshot || failed) {
    return (
      <span
        aria-label={`${player.fullName} initials`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-void-600 bg-void-800 text-[10px] font-bold text-slate-200"
      >
        {getInitials(player.fullName)}
      </span>
    );
  }

  return (
    <img
      src={`https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(player.sleeperId)}.jpg`}
      alt={`${player.fullName} headshot`}
      width="32"
      height="32"
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 rounded-full border border-void-600 bg-void-800 object-cover object-top"
    />
  );
}

function TeamLogo({ team }) {
  const [failed, setFailed] = useState(false);

  if (!team.logoUrl || failed) {
    return (
      <span
        aria-label={`${team.name} abbreviation`}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-void-800 font-mono text-[8px] font-bold text-slate-400"
      >
        {team.code}
      </span>
    );
  }

  return (
    <img
      src={team.logoUrl}
      alt={`${team.name} logo`}
      width="24"
      height="24"
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-6 w-6 shrink-0 object-contain"
    />
  );
}

function ColumnHeader() {
  return (
    <div className={`${PLAYER_GRID_COLUMNS} items-center gap-x-1 border-b border-void-700 px-0.5 py-2 sm:gap-x-3 sm:px-3`}>
      <span aria-hidden="true" />
      <span className="text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Rank</span>
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Player</span>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pos</span>
      <span className="text-right font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">ADP</span>
    </div>
  );
}

function SortablePlayerRow({
  player,
  overallIndex,
  locked,
  searchActive,
  highlighted,
  onShowInBoard,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.playerId, disabled: locked || searchActive });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const team = getNflTeamInfo(player.nflTeam);

  return (
    <div
      ref={setNodeRef}
      id={`player-row-${player.playerId}`}
      style={style}
      className={`${PLAYER_GRID_COLUMNS} min-h-12 items-center gap-x-1 border-b border-void-700/70 px-0.5 transition-colors motion-reduce:transition-none last:border-b-0 sm:gap-x-3 sm:px-3 ${
        highlighted
          ? "bg-oracle-500/20 ring-2 ring-inset ring-oracle-400"
          : isDragging
          ? "bg-void-700 shadow-modal"
          : "hover:bg-oracle-500/10"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={locked || searchActive}
        aria-label={`Move ${player.fullName}, currently ranked ${overallIndex + 1}`}
        className="w-11 h-11 -my-2 flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400"
        style={{ touchAction: 'none' }}
      >
        <DragHandle disabled={locked || searchActive} />
      </button>

      {/* Rank */}
      <span className="flex h-8 w-8 items-center justify-center justify-self-center rounded-lg bg-void-950 font-mono text-xs font-semibold tabular-nums text-slate-400">
        {overallIndex + 1}
      </span>

      <PlayerHeadshot player={player} />
      <TeamLogo team={team} />

      {/* Player identity */}
      <div className="min-w-0 py-1.5">
        <span className="block break-words text-sm font-semibold leading-tight text-slate-200">
          {player.fullName}
        </span>
        <span className="mt-0.5 hidden text-xs leading-tight text-slate-500 sm:block">
          {team.name}
        </span>
        <span className="mt-0.5 block font-mono text-[10px] text-slate-500 sm:hidden">
          {team.code}
        </span>
        {searchActive && (
          <button
            type="button"
            onClick={() => onShowInBoard(player)}
            aria-label={`Show ${player.fullName} in board`}
            className="mt-1 text-left text-[11px] font-semibold leading-tight text-oracle-300 underline decoration-oracle-400/50 underline-offset-2 hover:text-oracle-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400"
          >
            Show in board
          </button>
        )}
      </div>

      {/* Position */}
      <span className={`rounded px-1 py-0.5 text-center font-mono text-xs font-semibold sm:px-1.5 ${getPositionChipClass(player.position)}`}>
        {player.position}{player.positionalRank}
      </span>

      {/* ADP */}
      <span className="text-right font-mono text-xs tabular-nums text-slate-500">
        {player.adp ?? "—"}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return <div className="skeleton h-10 rounded-lg" />;
}

function BoardGuide({
  season,
  isDefault,
  locked,
  dirty,
  saving,
  scoringFormat,
  superflex,
  searchActive,
}) {
  const hasPersonalOrder = locked || dirty || !isDefault;
  const isSaved = locked || (!isDefault && !dirty);
  const steps = [
    {
      label: "Rank players",
      detail: locked ? "Final order" : hasPersonalOrder ? "Personal order" : "Drag to reorder",
      state: hasPersonalOrder ? "complete" : "current",
    },
    {
      label: "Save your sheet",
      detail: locked ? "On file" : saving ? "Saving now" : dirty ? "Save changes" : isSaved ? "On file" : "Required",
      state: isSaved ? "complete" : dirty || saving ? "current" : "pending",
    },
    {
      label: "League lock",
      detail: locked ? "Final for season" : "At league deadline",
      state: locked ? "complete" : "pending",
    },
  ];

  const formatLabel = scoringFormat
    ? scoringFormat.replaceAll("_", " ")
    : "League format";
  const seasonLabel = season ?? "Season pending";

  return (
    <section className="relative mb-4 min-h-24 overflow-hidden rounded-xl border border-oracle-500/25 bg-gradient-to-br from-oracle-900/45 via-void-900 to-void-900 px-5 py-4 shadow-card sm:px-6">
      <div aria-hidden="true" className="absolute -right-12 -top-20 h-48 w-48 rounded-full border border-oracle-400/10" />
      <div aria-hidden="true" className="absolute right-24 top-0 h-px w-56 rotate-[-18deg] bg-gradient-to-r from-transparent via-oracle-400/20 to-transparent" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="font-cinzel text-[10px] font-bold uppercase tracking-[0.24em] text-oracle-300">
            Fantasy Seers
          </p>
          <h1 className="mt-1 font-cinzel text-xl font-bold leading-tight text-slate-100 sm:text-[32px]">
            Master Sheet
          </h1>
          <p className="mt-1 text-sm text-slate-200">
            {locked
              ? "Your season-start rankings are final."
              : searchActive
                ? "Search results keep their real board rank. Clear search to reorder."
                : "Drag players to build your personal rankings."}
          </p>
          <p
            aria-label={`Board format: ${seasonLabel} · ${formatLabel} · ${superflex ? "Superflex" : "Single-QB"}`}
            className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500"
          >
            {seasonLabel} · {formatLabel} · {superflex ? "Superflex" : "Single-QB"}
          </p>
        </div>

        <ol className="grid grid-cols-3 gap-2 lg:w-[420px]">
        {steps.map((step, index) => {
          const markerClass = step.state === "complete"
            ? "border-win-500/50 bg-win-500/15 text-win-400"
            : step.state === "current"
              ? "border-oracle-400/60 bg-oracle-500/20 text-oracle-200"
              : "border-void-600 bg-void-800/80 text-slate-500";

          return (
            <li key={step.label} className="flex min-w-0 items-center gap-2 rounded-lg border border-void-700/80 bg-void-950/35 p-2">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold ${markerClass}`}>
                {step.state === "complete" ? "✓" : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold leading-tight text-slate-200">{step.label}</p>
                <p className="mt-0.5 hidden text-[10px] leading-tight text-slate-500 sm:block">{step.detail}</p>
              </div>
            </li>
          );
        })}
        </ol>
      </div>
    </section>
  );
}

function getSaveStatus({ locked, saving, dirty, isDefault }) {
  if (locked) return "Locked";
  if (saving) return "Saving";
  if (dirty) return "Unsaved";
  if (isDefault) return "Not saved";
  return "Saved";
}

export default function MasterSheetPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [boardId, setBoardId] = useState(null);
  const [season, setSeason] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [isDefault, setIsDefault] = useState(true);
  const [locked, setLocked] = useState(false);
  const [scoringFormat, setScoringFormat] = useState(null);
  const [superflex, setSuperflex] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPositions, setSelectedPositions] = useState(["ALL"]);
  const [consensusNoticeDismissed, setConsensusNoticeDismissed] = useState(false);
  const [revealedPlayer, setRevealedPlayer] = useState(null);
  const revealTimerRef = useRef(null);
  const searchQuery = searchParams.get("q") ?? "";
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchActive = Boolean(normalizedSearchQuery);

  useEffect(() => {
    const warnBeforeLeaving = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  useEffect(() => () => clearTimeout(revealTimerRef.current), []);

  useEffect(() => {
    boardsApi
      .getMySheet()
      .then(({ data }) => {
        setBoardId(data.boardId);
        let nextRankings = data.rankings;
        if (!data.locked) {
          try {
            const draft = JSON.parse(localStorage.getItem(`fs_board_draft:${data.boardId}`));
            const serverIds = new Set(data.rankings.map((player) => player.playerId));
            const draftIds = new Set(draft?.rankings?.map((player) => player.playerId));
            const draftIsValid =
              Array.isArray(draft?.rankings) &&
              draft.rankings.length === data.rankings.length &&
              draftIds.size === serverIds.size &&
              draft.rankings.every((player) => serverIds.has(player.playerId));
            if (draftIsValid) {
              nextRankings = draft.rankings;
              setDirty(true);
              setDraftRestored(true);
            }
          } catch {
            localStorage.removeItem(`fs_board_draft:${data.boardId}`);
          }
        } else {
          localStorage.removeItem(`fs_board_draft:${data.boardId}`);
        }
        setRankings(nextRankings);
        setSeason(data.season);
        setIsDefault(data.isDefault);
        setLocked(Boolean(data.locked));
        setScoringFormat(data.scoringFormat);
        setSuperflex(Boolean(data.superflex));
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load rankings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!boardId || locked || !dirty) return;
    try {
      localStorage.setItem(
        `fs_board_draft:${boardId}`,
        JSON.stringify({ savedAt: new Date().toISOString(), rankings })
      );
    } catch {
      // The explicit save button still works if storage is unavailable.
    }
  }, [boardId, dirty, locked, rankings]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isAllSelected = selectedPositions.includes("ALL");

  const filteredRankings = useMemo(() => {
    const positionMatches = isAllSelected
      ? rankings
      : rankings.filter((player) => selectedPositions.includes(player.position));

    if (!normalizedSearchQuery) return positionMatches;
    return positionMatches.filter((player) => {
      const team = getNflTeamInfo(player.nflTeam);
      return [player.fullName, player.position, team.code, team.name]
        .some((value) => value.toLowerCase().includes(normalizedSearchQuery));
    });
  }, [rankings, selectedPositions, isAllSelected, normalizedSearchQuery]);

  const overallIndexMap = useMemo(() => {
    const map = new Map();
    rankings.forEach((p, i) => map.set(p.playerId, i));
    return map;
  }, [rankings]);

  const recalcRanks = useCallback((list) => {
    const posCounters = {};
    return list.map((player, i) => {
      const pos = player.position;
      posCounters[pos] = (posCounters[pos] || 0) + 1;
      return { ...player, overallRank: i + 1, positionalRank: posCounters[pos] };
    });
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      if (locked || searchActive) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setRankings((prev) => {
        if (isAllSelected) {
          const oldIndex = prev.findIndex((p) => p.playerId === active.id);
          const newIndex = prev.findIndex((p) => p.playerId === over.id);
          const reordered = arrayMove(prev, oldIndex, newIndex);
          return recalcRanks(reordered);
        }

        const merged = reorderFilteredPlayers(
          prev,
          filteredRankings,
          selectedPositions,
          active.id,
          over.id
        );
        return recalcRanks(merged);
      });

      setDirty(true);
    },
    [locked, searchActive, isAllSelected, filteredRankings, selectedPositions, recalcRanks]
  );

  const handleSave = async () => {
    if (locked) {
      setError("This board is locked and cannot be edited.");
      return;
    }
    if (!boardId) {
      setError("Board is not ready. Refresh the page and try again.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await boardsApi.upsertEntries(
        boardId,
        rankings.map((p) => ({
          playerId: p.playerId,
          rank: p.overallRank,
        }))
      );
      setDirty(false);
      setDraftRestored(false);
      setIsDefault(false);
      localStorage.removeItem(`fs_board_draft:${boardId}`);
      setSaveMsg("Saved \u2713");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save rankings");
    } finally {
      setSaving(false);
    }
  };

  const togglePosition = (pos) => {
    if (pos === "ALL") {
      setSelectedPositions(["ALL"]);
      return;
    }
    setSelectedPositions((prev) => {
      const without = prev.filter((p) => p !== "ALL" && p !== pos);
      const has = prev.includes(pos);
      if (has) {
        const next = without.length === 0 ? ["ALL"] : without;
        return next;
      }
      return [...without, pos];
    });
  };

  const updateSearchQuery = (value) => {
    const nextParams = withPlayerSearchQuery(searchParams, value);
    setSearchParams(nextParams, { replace: true });
  };

  const showInBoard = (player) => {
    clearTimeout(revealTimerRef.current);
    updateSearchQuery("");
    setSelectedPositions(["ALL"]);
    setRevealedPlayer(player);

    setTimeout(() => {
      const row = document.getElementById(`player-row-${player.playerId}`);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      row?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }, 0);
    revealTimerRef.current = setTimeout(() => setRevealedPlayer(null), 4000);
  };

  const saveStatus = getSaveStatus({ locked, saving, dirty, isDefault });
  const saveStatusClass = locked || dirty
    ? "border-gold-500/30 bg-gold-500/10 text-gold-400"
    : !isDefault
      ? "border-win-500/30 bg-win-500/10 text-win-400"
      : "border-void-600 bg-void-800 text-slate-400";

  return (
    <div className="mx-auto w-full py-4 sm:py-6">
      {!loading && rankings.length > 0 && (
        <BoardGuide
          season={season}
          isDefault={isDefault}
          locked={locked}
          dirty={dirty}
          saving={saving}
          scoringFormat={scoringFormat}
          superflex={superflex}
          searchActive={searchActive}
        />
      )}

      {!loading && (
        <PlayerSearchField
          value={searchQuery}
          onChange={(event) => updateSearchQuery(event.target.value)}
          onSubmit={(event) => event.preventDefault()}
          onClear={() => updateSearchQuery("")}
          className="mb-3 lg:hidden"
        />
      )}

      {isDefault && !locked && !consensusNoticeDismissed && !loading && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-oracle-500/20 bg-oracle-500/10 px-4 py-3">
          <p className="text-sm text-slate-200">
            <span className="font-semibold">Consensus rankings are your starting point.</span>{" "}
            Drag players into your order and save it before the league locks.
          </p>
          <button
            type="button"
            onClick={() => setConsensusNoticeDismissed(true)}
            aria-label="Dismiss consensus explanation"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-void-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400"
          >
            ×
          </button>
        </div>
      )}

      {locked && !loading && (
        <div className="mb-3 rounded-lg border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-gold-400">
          <span className="font-semibold">League lock complete.</span> Rankings can no longer be changed.
        </div>
      )}

      {dirty && !locked && !loading && (
        <p className="mb-2 text-xs text-gold-400" role="status">
          {draftRestored
            ? "Unsaved changes restored from this device"
            : "Unsaved changes are protected on this device"}
        </p>
      )}

      {searchActive && !loading && (
        <p className="mb-2 text-xs text-slate-400" role="status">
          Search results are view-only. Clear search to reorder players.
        </p>
      )}

      {revealedPlayer && !searchActive && (
        <p className="mb-2 text-xs text-oracle-300" role="status">
          {revealedPlayer.fullName} is shown in the full board.
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="alert-error mb-4 rounded-lg px-4 py-3">
          <p className="text-sm text-loss-400">{error}</p>
        </div>
      )}

      {/* Ranking controls */}
      {!loading && (
        <div
          role="toolbar"
          aria-label="Ranking controls"
          className="sticky z-20 -mx-2 mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-y border-void-700 bg-void-950/95 px-2 py-2 backdrop-blur-sm"
          style={{ top: "var(--app-header-height)" }}
        >
          <div className="flex min-w-0 gap-2 overflow-x-auto py-1" aria-label="Position filters">
            {POSITIONS.map((pos) => {
              const active =
                pos === "ALL" ? isAllSelected : selectedPositions.includes(pos);
              return (
                <button
                  key={pos}
                  onClick={() => togglePosition(pos)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    active ? "chip-oracle-active" : "chip-oracle"
                  }`}
                >
                  {pos}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              role="status"
              className={`whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${saveStatusClass}`}
            >
              {saveStatus}
            </span>
            <button
              onClick={handleSave}
              disabled={locked || !dirty || saving}
              aria-label={locked ? "Locked" : saving ? "Saving rankings" : saveMsg || "Save Rankings"}
              className={`btn-oracle shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                (locked || (!dirty && !saveMsg)) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {locked ? "Locked" : saving ? "Saving..." : saveMsg || "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass-card p-4 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Player list */}
      {!loading && filteredRankings.length > 0 && (
        <div className="-mx-2 overflow-hidden rounded-xl border border-void-700 bg-void-900 sm:mx-0">
          <ColumnHeader />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredRankings.map((p) => p.playerId)}
              strategy={verticalListSortingStrategy}
            >
              {filteredRankings.map((player) => (
                  <SortablePlayerRow
                    key={player.playerId}
                    player={player}
                    overallIndex={overallIndexMap.get(player.playerId)}
                    locked={locked}
                    searchActive={searchActive}
                    highlighted={revealedPlayer?.playerId === player.playerId}
                    onShowInBoard={showInBoard}
                  />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {!loading && rankings.length > 0 && filteredRankings.length === 0 && (
        <div className="rounded-xl border border-void-700 bg-void-900 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-200">
            No players match this search and position filter.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Clear the search or choose another position.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && rankings.length === 0 && !error && (
        <div className="glass-card p-8 text-center">
          <p className="text-slate-500 text-sm">No players available.</p>
        </div>
      )}
    </div>
  );
}
