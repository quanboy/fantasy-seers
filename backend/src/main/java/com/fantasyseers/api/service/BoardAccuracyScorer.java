package com.fantasyseers.api.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Pure scoring math for the 2026 season.
 *
 * <p>A locked board's accuracy score is the mean absolute rank error between
 * the user's predicted overall rank and the player's end-of-season finish rank
 * under the board's stamped scoring format. Lower is better.
 *
 * <p>This class is intentionally free of persistence and external I/O so the
 * scoring rules can be exercised in fast unit tests. The Sleeper adapter that
 * turns actual season stats into format-correct finish ranks lives elsewhere and
 * feeds the {@code actualFinishByPlayerId} map into {@link #score(List, Map, int)}.
 */
@Component
public class BoardAccuracyScorer {

    private static final int FINISH_RANK_BUFFER = 20;

    /** A single player's predicted position on a user's board. */
    public record PredictedRank(long playerId, int predictedRank) {}

    /** Per-player receipt, preserving both the reported and capped finish rank. */
    public record PlayerRankError(
            long playerId,
            int predictedRank,
            Integer actualRank,
            int effectiveActualRank,
            int error
    ) {}

    /** Outcome of scoring one board. */
    public record AccuracyResult(
            double averageRankError,
            int totalRankError,
            int scoredPlayerCount,
            int unmatchedPlayerCount,
            List<PlayerRankError> breakdown
    ) {}

    /**
     * Scores a board, capping missing or deeper finishes at board depth plus 20.
     *
     * @param predicted              the user's ranked players (predicted overall ranks)
     * @param actualFinishByPlayerId format-correct finish rank keyed by player id
     * @param boardDepth             number of ranked slots on the board
     * @return average and total error, counts, and immutable receipts in predicted order
     * @throws IllegalArgumentException for an empty board, invalid ranks or duplicate players
     */
    public AccuracyResult score(
            List<PredictedRank> predicted,
            Map<Long, Integer> actualFinishByPlayerId,
            int boardDepth
    ) {
        if (boardDepth <= 0) {
            throw new IllegalArgumentException("Board depth must be positive");
        }
        if (predicted.isEmpty()) {
            throw new IllegalArgumentException("Cannot score an empty board");
        }

        int maximumFinishRank = Math.addExact(boardDepth, FINISH_RANK_BUFFER);
        Set<Long> seen = new HashSet<>();
        List<PlayerRankError> breakdown = new ArrayList<>();
        int totalError = 0;
        int unmatched = 0;

        for (PredictedRank p : predicted) {
            if (!seen.add(p.playerId())) {
                throw new IllegalArgumentException("Duplicate predicted player: " + p.playerId());
            }
            if (p.predictedRank() < 1 || p.predictedRank() > boardDepth) {
                throw new IllegalArgumentException("Predicted rank must be between 1 and board depth");
            }

            Integer actualRank = actualFinishByPlayerId.get(p.playerId());
            if (actualRank != null && actualRank < 1) {
                throw new IllegalArgumentException("Actual finish rank must be positive");
            }
            if (actualRank == null) {
                unmatched++;
            }

            int effectiveActualRank = actualRank == null
                    ? maximumFinishRank
                    : Math.min(actualRank, maximumFinishRank);
            int error = Math.abs(p.predictedRank() - effectiveActualRank);
            totalError = Math.addExact(totalError, error);
            breakdown.add(new PlayerRankError(
                    p.playerId(),
                    p.predictedRank(),
                    actualRank,
                    effectiveActualRank,
                    error
            ));
        }

        double averageError = breakdown.isEmpty() ? 0.0 : (double) totalError / breakdown.size();
        return new AccuracyResult(
                averageError,
                totalError,
                breakdown.size(),
                unmatched,
                List.copyOf(breakdown)
        );
    }
}
