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
      <div {...attributes} {...listeners} style={{ touchAction: 'none' }}>
        <DragHandle disabled={locked} />
      </div>

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

export default function MasterSheetPage() {
  const [boardId, setBoardId] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [isDefault, setIsDefault] = useState(true);
  const [locked, setLocked] = useState(false);
  const [scoringFormat, setScoringFormat] = useState(null);
  const [superflex, setSuperflex] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [error, setError] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState(["ALL"]);

  useEffect(() => {
    boardsApi
      .getMySheet()
      .then(({ data }) => {
        setBoardId(data.boardId);
        setRankings(data.rankings);
        setIsDefault(data.isDefault);
        setLocked(Boolean(data.locked));
        setScoringFormat(data.scoringFormat);
        setSuperflex(Boolean(data.superflex));
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load rankings"))
      .finally(() => setLoading(false));
  }, []);

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
      setIsDefault(false);
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
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="font-cinzel text-xl font-bold text-slate-100">
            Master Sheet
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {locked
              ? "Your season-start rankings are final"
              : "Drag players to set your personal rankings"}
          </p>
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

      {/* Locked banner */}
      {locked && !loading && (
        <div className="glass-card px-4 py-3 mb-5 border border-gold-500/30">
          <p className="text-sm font-semibold text-gold-400">
            Season-start board locked
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {scoringFormat || "League format"} · {superflex ? "Superflex" : "Single-QB"}
          </p>
        </div>
      )}

      {/* Consensus banner */}
      {isDefault && !locked && !bannerDismissed && !loading && (
        <div className="glass-card px-4 py-3 mb-5 flex items-center justify-between">
          <p className="text-sm text-slate-300">
            These are consensus expert rankings. Drag to personalize your sheet.
          </p>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-slate-500 hover:text-slate-300 ml-3 shrink-0"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
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
