import { useState, useEffect, useCallback, useMemo } from "react";
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

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];

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

function ColumnHeader() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-void-700 mb-1">
      <div className="w-5 shrink-0" />
      <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider w-8 text-right shrink-0">Rank</span>
      <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider flex-1">Player</span>
      <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider w-12 shrink-0">Pos</span>
      <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider w-10 text-right shrink-0">ADP</span>
    </div>
  );
}

function SortablePlayerRow({ player, overallIndex, locked }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.playerId, disabled: locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const rankDiff = player.consensusOverallRank != null
    ? player.consensusOverallRank - (overallIndex + 1)
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isDragging
          ? "bg-void-700 shadow-modal"
          : "hover:bg-void-800/50"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={locked}
        aria-label={`Move ${player.fullName}, currently ranked ${overallIndex + 1}`}
        className="w-11 h-11 -my-2 flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400"
        style={{ touchAction: 'none' }}
      >
        <DragHandle disabled={locked} />
      </button>

      {/* Rank */}
      <span className="text-xs font-mono text-slate-300 w-8 text-right shrink-0 font-semibold">
        {overallIndex + 1}
      </span>

      {/* Player (Team) */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-slate-200 truncate block">
          {player.fullName} <span className="text-slate-500">({player.nflTeam || "FA"})</span>
        </span>
      </div>

      {/* Position */}
      <span className={`text-xs font-mono font-semibold w-12 shrink-0 ${getPositionChipClass(player.position)} px-1.5 py-0.5 rounded text-center`}>
        {player.position}{player.positionalRank}
      </span>

      {/* ADP */}
      <span className="text-xs font-mono text-slate-500 w-10 text-right shrink-0">
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
}) {
  const status = locked
    ? "Locked"
    : saving
      ? "Saving"
      : dirty
        ? "Changes not saved"
        : isDefault
          ? "Not saved yet"
          : "Saved";

  const statusClass = locked
    ? "border-gold-500/30 bg-gold-500/10 text-gold-300"
    : dirty
      ? "border-gold-500/30 bg-gold-500/10 text-gold-300"
      : !isDefault
        ? "border-win-500/30 bg-win-500/10 text-win-300"
        : "border-void-600 bg-void-800 text-slate-300";

  const title = locked
    ? "Your season board is final"
    : isDefault
      ? "Make this board yours"
      : dirty
        ? "Finish by saving your changes"
        : "Your rankings are saved";

  const description = locked
    ? "This is the ranking order that will represent you for the season."
    : isDefault
      ? "Start with the consensus order, then drag players into the order you believe in."
      : dirty
        ? "Your new order is protected on this device, but it is not on the league server yet."
        : "You can keep adjusting this order until your league locks the boards.";

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

  return (
    <section className="relative overflow-hidden rounded-2xl border border-oracle-500/25 bg-gradient-to-br from-oracle-900/45 via-void-900 to-void-900 px-5 py-5 sm:px-6 sm:py-6 mb-5 shadow-card">
      <div aria-hidden="true" className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-oracle-400/10" />
      <div aria-hidden="true" className="absolute -right-4 -top-8 h-24 w-24 rounded-full border border-gold-400/10" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-lg">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-oracle-300">
            {season || 2026} draft room
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-slate-100">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {description}
          </p>
        </div>
        <div
          role="status"
          className={`self-start whitespace-nowrap rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${statusClass}`}
        >
          {status}
        </div>
      </div>

      <ol className="relative mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
        {steps.map((step, index) => {
          const markerClass = step.state === "complete"
            ? "border-win-500/50 bg-win-500/15 text-win-300"
            : step.state === "current"
              ? "border-oracle-400/60 bg-oracle-500/20 text-oracle-200"
              : "border-void-600 bg-void-800/80 text-slate-500";

          return (
            <li key={step.label} className="relative flex items-center gap-3 rounded-xl border border-void-700/80 bg-void-950/35 p-3 sm:block sm:min-h-24">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold ${markerClass}`}>
                {step.state === "complete" ? "✓" : index + 1}
              </span>
              <div className="sm:mt-3">
                <p className="text-sm font-semibold text-slate-200">{step.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="relative mt-4 flex flex-col gap-2 border-t border-void-700/80 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p className={isDefault && !locked ? "text-gold-300" : "text-slate-400"}>
          {isDefault && !locked
            ? "If you never save, this starting order is what locks for the season."
            : locked
              ? "League lock complete. Rankings can no longer be changed."
              : "Save again whenever you change the order."}
        </p>
        <p className="shrink-0 font-mono text-slate-500">
          {formatLabel} · {superflex ? "Superflex" : "Single-QB"}
        </p>
      </div>
    </section>
  );
}

export default function MasterSheetPage() {
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

  useEffect(() => {
    const warnBeforeLeaving = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

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
    if (isAllSelected) return rankings;
    return rankings.filter((p) => selectedPositions.includes(p.position));
  }, [rankings, selectedPositions, isAllSelected]);

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
      if (locked) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setRankings((prev) => {
        if (isAllSelected) {
          const oldIndex = prev.findIndex((p) => p.playerId === active.id);
          const newIndex = prev.findIndex((p) => p.playerId === over.id);
          const reordered = arrayMove(prev, oldIndex, newIndex);
          return recalcRanks(reordered);
        }

        // When filtered: map the drag onto the full list
        const filteredIds = filteredRankings.map((p) => p.playerId);
        const oldFilteredIndex = filteredIds.indexOf(active.id);
        const newFilteredIndex = filteredIds.indexOf(over.id);
        const reorderedFiltered = arrayMove(
          filteredIds,
          oldFilteredIndex,
          newFilteredIndex
        );

        // Rebuild full list: keep non-filtered in place, slot filtered in order
        const nonFiltered = prev.filter(
          (p) => !selectedPositions.includes(p.position)
        );
        const filteredMap = new Map(
          prev
            .filter((p) => selectedPositions.includes(p.position))
            .map((p) => [p.playerId, p])
        );
        const reorderedFilteredPlayers = reorderedFiltered.map((id) =>
          filteredMap.get(id)
        );

        // Merge: walk through original list, replacing filtered players in new order
        let fi = 0;
        const merged = prev.map((p) => {
          if (selectedPositions.includes(p.position)) {
            return reorderedFilteredPlayers[fi++];
          }
          return p;
        });

        return recalcRanks(merged);
      });

      setDirty(true);
    },
    [locked, isAllSelected, filteredRankings, selectedPositions, recalcRanks]
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="sticky top-14 z-20 -mx-2 px-2 py-2 mb-2 flex items-start justify-between gap-4 bg-void-950/95 backdrop-blur-sm">
        <div>
          <h1 className="font-cinzel text-xl font-bold text-slate-100">
            Master Sheet
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {locked
              ? "Your season-start rankings are final"
              : "Drag players to set your personal rankings"}
          </p>
          {dirty && !locked && (
            <p className="text-xs text-gold-400 mt-1" role="status">
              {draftRestored
                ? "Unsaved changes restored from this device"
                : "Unsaved changes are protected on this device"}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={locked || !dirty || saving}
          className={`btn-oracle px-4 py-2 text-sm font-semibold rounded-lg shrink-0 transition-all ${
            (locked || (!dirty && !saveMsg)) ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {locked ? "Locked" : saving ? "Saving..." : saveMsg || "Save Rankings"}
        </button>
      </div>

      {!loading && rankings.length > 0 && (
        <BoardGuide
          season={season}
          isDefault={isDefault}
          locked={locked}
          dirty={dirty}
          saving={saving}
          scoringFormat={scoringFormat}
          superflex={superflex}
        />
      )}

      {/* Error */}
      {error && (
        <div className="alert-error mb-4">
          <p className="text-sm text-loss-400">{error}</p>
        </div>
      )}

      {/* Position filter bar */}
      {!loading && (
        <div className="flex flex-wrap gap-2 mb-5">
          {POSITIONS.map((pos) => {
            const active =
              pos === "ALL" ? isAllSelected : selectedPositions.includes(pos);
            return (
              <button
                key={pos}
                onClick={() => togglePosition(pos)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active ? "chip-oracle-active" : "chip-oracle"
                }`}
              >
                {pos}
              </button>
            );
          })}
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
      {!loading && rankings.length > 0 && (
        <div className="glass-card p-2 sm:p-3">
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
                  />
              ))}
            </SortableContext>
          </DndContext>
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
